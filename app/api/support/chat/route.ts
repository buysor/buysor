import {answerSupportFaq} from '@/lib/support-chat';
import {assertSameOrigin,boundedJson,json,errorResponse,PublicError} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 assertSameOrigin(request);const body=await boundedJson(request,12000) as {message?:unknown};
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>900)throw new PublicError(400,'INVALID_QUESTION','질문은 1~900자로 입력해 주세요.');
 return json({...answerSupportFaq(body.message),source:'faq'});
}catch(e){return errorResponse(e);}}
