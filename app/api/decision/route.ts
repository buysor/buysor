import { z } from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {generateDecision} from '@/lib/ai';
import {FEATURES,POLICY_VERSION} from '@/lib/commerce-policy';
import {quote} from '@/lib/commerce-runtime';
import {commerceDb,existingRun,reserveRun,completeRun,failRun,recordUsage} from '@/lib/commerce-store';
import {getUserProfile,listDecisionHistory,createPendingDecision,failDecision} from '@/lib/user-data';
import {assertSameOrigin,boundedJson,json,errorResponse,digest,PublicError} from '@/lib/request-safety';
export const dynamic='force-dynamic';
const text=z.string().trim().max(1500);
const draftSchema=z.object({type:z.enum(['photo','link','name','category']),value:z.string().trim().min(1).max(2000),note:text.optional(),
 imageDataUrl:z.string().max(1500000).optional(),imageName:z.string().max(150).optional(),categoryId:z.string().max(120).nullable().optional(),subcategoryId:z.string().max(120).nullable().optional(),createdAt:z.number().finite()});
const answersSchema=z.object({purpose:text.optional(),budget:text.optional(),current:text.optional(),condition:text.optional(),timing:text.optional(),note:text.optional()});
const schema=z.object({requestKey:z.string().uuid(),policyVersion:z.literal(POLICY_VERSION),acceptedCredits:z.number().int(),
 feature:z.enum(['standard','deep','rejudge']).default('standard'),draft:draftSchema,answers:answersSchema.default({}),parentId:z.string().uuid().optional()}).strict();
export async function GET(request:Request){try{
 const user=await getChatGPTUser();if(!user)return json({error:'로그인이 필요합니다.'},401);
 const n=Number(new URL(request.url).searchParams.get('limit')??20);
 return json({items:await listDecisionHistory(user,Number.isFinite(n)?n:20)});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request){
 let runId:string|null=null;let userId:string|null=null;let decisionId:string|null=null;let requestKey:string|null=null;
 try {
  assertSameOrigin(request);const user=await getChatGPTUser();
  if(!user)throw new PublicError(401,'SIGN_IN_REQUIRED','로그인이 필요합니다.');userId=user.id;
  const parsed=schema.safeParse(await boundedJson(request,1600000));
  if(!parsed.success)throw new PublicError(400,'INVALID_REQUEST','입력과 사용 크레딧을 다시 확인해 주세요.');
  const body=parsed.data;requestKey=body.requestKey;const feature=body.feature;let draft=body.draft;
  const hash=await digest(JSON.stringify(body));
  // Replays return the original result even when AI is currently paused.
  const cached=await existingRun(user.id,body.requestKey);
  if(cached){if(cached.payload_hash!==hash)throw new PublicError(409,'KEY_REUSED','같은 요청 번호의 입력을 변경할 수 없습니다.');
    if(cached.state==='completed')return json({id:cached.decision_id??cached.id,result:JSON.parse(cached.result_json!),replayed:true});
    throw new PublicError(409,'REQUEST_'+cached.state.toUpperCase(),'이 요청은 이미 처리되었거나 진행 중입니다. 새 분석은 확인 후 시작해 주세요.');
  }
  if(feature==='deep'&&process.env.AI_DEEP_VALIDATED!=='1')throw new PublicError(503,'DEEP_NOT_READY','심층 판단은 품질 검증 중입니다. 크레딧은 차감되지 않습니다.');
  if(feature==='rejudge'&&process.env.AI_REJUDGE_VALIDATED!=='1')throw new PublicError(503,'REJUDGE_NOT_READY','재판단은 품질 검증 중입니다. 크레딧은 차감되지 않습니다.');
  if(feature==='rejudge'){
   if(!body.parentId)throw new PublicError(400,'PARENT_REQUIRED','기존 판단이 필요합니다.');
   const db=await commerceDb();const parent=await db.prepare("SELECT input_json FROM decisions WHERE id=? AND user_id=? AND status='completed'")
    .bind(body.parentId,user.id).first<{input_json:string}>();
   if(!parent)throw new PublicError(404,'PARENT_NOT_FOUND','기존 판단을 찾을 수 없습니다.');
   const original=JSON.parse(parent.input_json);
   if(original.type!==draft.type||original.value!==draft.value||JSON.stringify(body.answers).length>700)
    throw new PublicError(400,'REJUDGE_SCOPE','동일 제품의 작은 조건 변경만 재판단할 수 있습니다.');
   draft={...original,imageDataUrl:undefined};
  }
  const image=draft.imageDataUrl;
  if(image&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))
   throw new PublicError(400,'INVALID_IMAGE','JPG, PNG, WebP 이미지만 허용됩니다.');
  if(image){const encoded=image.split(',')[1];let bytes:string;try{bytes=atob(encoded.slice(0,32));}catch{throw new PublicError(400,'INVALID_IMAGE','이미지 형식을 확인해 주세요.');}
   const valid=bytes.startsWith('\x89PNG\r\n\x1a\n')||bytes.startsWith('\xff\xd8\xff')||(bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP');
   if(!valid)throw new PublicError(400,'INVALID_IMAGE','이미지 파일을 확인해 주세요.');}
  const credits=FEATURES[feature].credits;
  if(body.acceptedCredits!==credits)throw new PublicError(409,'QUOTE_CHANGED','사용량을 다시 확인해 주세요.');
  const budget=quote(feature);
  const reserved=await reserveRun({userId:user.id,key:body.requestKey,hash,feature,credits,...budget});
  if(!reserved.fresh)throw new PublicError(409,'ALREADY_REQUESTED','이미 접수된 요청입니다.');
  runId=reserved.run.id;
  decisionId=await createPendingDecision(user,draft,body.answers);
  const result=await generateDecision({draft,answers:body.answers,userModel:await getUserProfile(user),feature,
    reserveMicro:budget.reserveMicro,onUsage:usage=>recordUsage(runId!,user.id,usage)});
  if(!result.headline||result.reasons.length<2)throw new PublicError(502,'INVALID_RESULT','판단 결과가 불완전합니다.');
  await completeRun(runId!,user.id,result,decisionId);
  return json({id:decisionId,runId,result,chargedCredits:credits,evidenceMode:'user_supplied'});
 }catch(e){
  if(requestKey&&userId){try{const done=await existingRun(userId,requestKey);if(done?.state==='completed')return json({id:done.decision_id??done.id,result:JSON.parse(done.result_json!),replayed:true});}catch{}}
  if(runId&&userId){try{await failRun(runId,userId);}catch{console.error('Credit recovery required',{runId});}}
  if(decisionId&&userId){try{const user=await getChatGPTUser();if(user)await failDecision(user,decisionId);}catch{}}
  const response=errorResponse(e);
  if(requestKey&&userId){try{const state=(await existingRun(userId,requestKey))?.state;if(state==='failed')return json({...await response.json(),requestState:state},response.status);}catch{}}
  return response;
 }
}
