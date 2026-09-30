import { z } from "zod";
import { CURRENCIES } from "@/lib/market";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureAnalyticsSchema } from "@/lib/analytics-store";
import { ensureUserRecord } from "@/lib/user-data";
import { assertSameOrigin, boundedJson, errorResponse, json, PublicError } from "@/lib/request-safety";

export const dynamic="force-dynamic";
const id=z.string().uuid();
const schema=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("helpfulness"),decisionId:id,rating:z.number().int().min(1).max(5),note:z.string().trim().max(800).optional()}),
 z.object({kind:z.literal("outcome"),decisionId:id,status:z.enum(["bought","waiting","not_bought"]),
   currency:z.enum(CURRENCIES).default("KRW"), purchasePrice:z.number().int().min(0).max(100_000_000).nullable().optional(),
   satisfaction:z.number().int().min(1).max(5).nullable().optional(),wouldChooseAgain:z.boolean().nullable().optional(),
   note:z.string().trim().max(1200).optional()}),
]);

export async function GET(request:Request){
 try{
  const user=await getChatGPTUser();if(!user)throw new PublicError(401,"SIGN_IN_REQUIRED","로그인이 필요합니다.");
  const decisionId=new URL(request.url).searchParams.get("decision");
  if(!decisionId||!z.string().uuid().safeParse(decisionId).success)throw new PublicError(400,"INVALID_DECISION","판단 기록을 확인해 주세요.");
  const db=await ensureAnalyticsSchema();
  const decision=await db.prepare(`SELECT id,input_label,verdict,created_at FROM decisions WHERE id=? AND user_id=? AND status='completed'`).bind(decisionId,user.id).first<Record<string,unknown>>();
  if(!decision)throw new PublicError(404,"DECISION_NOT_FOUND","완료된 판단을 찾지 못했습니다.");
  const helpful=await db.prepare(`SELECT rating,note,created_at FROM purchase_feedback WHERE decision_id=? AND user_id=? AND stage='decision_helpfulness'`).bind(decisionId,user.id).first<Record<string,unknown>>();
  const outcome=await db.prepare(`SELECT p.status,p.purchase_price,p.satisfaction,p.would_choose_again,p.note,p.updated_at,COALESCE(m.currency,'KRW') currency FROM purchase_outcomes p LEFT JOIN purchase_outcome_market m ON m.decision_id=p.decision_id WHERE p.decision_id=? AND p.user_id=?`).bind(decisionId,user.id).first<Record<string,unknown>>();
  return json({decision,helpful:helpful??null,outcome:outcome??null});
 }catch(error){return errorResponse(error);}
}

export async function POST(request:Request){
 try{
  assertSameOrigin(request);const user=await getChatGPTUser();if(!user)throw new PublicError(401,"SIGN_IN_REQUIRED","로그인이 필요합니다.");
  const parsed=schema.safeParse(await boundedJson(request,10_000));if(!parsed.success)throw new PublicError(400,"INVALID_FEEDBACK","피드백 내용을 확인해 주세요.");
  const body=parsed.data;await ensureUserRecord(user);const db=await ensureAnalyticsSchema();
  const decision=await db.prepare(`SELECT id FROM decisions WHERE id=? AND user_id=? AND status='completed'`).bind(body.decisionId,user.id).first();
  if(!decision)throw new PublicError(404,"DECISION_NOT_FOUND","완료된 판단을 찾지 못했습니다.");
  const now=Date.now();
  if(body.kind==="helpfulness"){
   await db.prepare(`INSERT INTO purchase_feedback(user_id,decision_id,stage,rating,would_choose_again,note,created_at)
    VALUES(?,?,'decision_helpfulness',?,NULL,?,?)
    ON CONFLICT(decision_id,stage) DO UPDATE SET rating=excluded.rating,note=excluded.note,created_at=excluded.created_at`)
    .bind(user.id,body.decisionId,body.rating,body.note||null,now).run();
  }else{
   const price=body.status==="bought" ? body.purchasePrice??null : null;
   const satisfaction=body.status==="bought" ? body.satisfaction??null : null;
   const again=body.status==="bought" && body.wouldChooseAgain!==null && body.wouldChooseAgain!==undefined ? (body.wouldChooseAgain?1:0) : null;
   await db.batch([db.prepare(`INSERT INTO purchase_outcomes(id,user_id,decision_id,status,purchase_price,satisfaction,would_choose_again,note,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(decision_id) DO UPDATE SET status=excluded.status,purchase_price=excluded.purchase_price,
      satisfaction=excluded.satisfaction,would_choose_again=excluded.would_choose_again,note=excluded.note,updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(),user.id,body.decisionId,body.status,price,satisfaction,again,body.note||null,now,now),
    db.prepare(`INSERT INTO purchase_outcome_market(decision_id,currency) VALUES(?,?) ON CONFLICT(decision_id) DO UPDATE SET currency=excluded.currency`).bind(body.decisionId,body.currency)]);
  }
  return json({ok:true});
 }catch(error){return errorResponse(error);}
}

