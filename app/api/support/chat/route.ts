import {getReferenceRates} from '@/lib/exchange-rate-service';
import {isCurrency} from '@/lib/market';
import {answerSupportFaq} from '@/lib/support-chat';
import {assertSameOrigin,boundedJson,json,errorResponse,PublicError} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 assertSameOrigin(request);const body=await boundedJson(request,12000) as {message?:unknown;language?:unknown;currency?:unknown};
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>900)throw new PublicError(400,'INVALID_QUESTION','질문은 1~900자로 입력해 주세요.');
 const language=body.language==='ko'?'ko':'en';
 const currency=isCurrency(body.currency)?body.currency:'USD';
 const needsPrice=/member|subscription|price|payment|멤버|구독|요금|결제/i.test(body.message);
 const snapshot=currency==='USD'||!needsPrice?null:(await getReferenceRates()).snapshot;
 return json({...answerSupportFaq(body.message,language,{currency,snapshot}),source:'faq'});
}catch(e){return errorResponse(e);}}
