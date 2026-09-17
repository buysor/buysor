import {reconcilePayment} from '@/lib/payments';
import {boundedJson,digest,json,errorResponse,PublicError} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 const secret=process.env.TOSS_WEBHOOK_SECRET;
 const supplied=request.headers.get('x-buysor-webhook-token')||new URL(request.url).searchParams.get('token')||'';
 if(!secret||secret.length<32||supplied.length>200||await digest(secret)!==await digest(supplied))return json({error:'Not found'},404);
 const body=await boundedJson(request,16000) as {data?:{orderId?:unknown}};
 const id=body?.data?.orderId;if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw new PublicError(400,'INVALID_EVENT','Invalid event');
 await reconcilePayment(id);return json({received:true});
}catch(e){return errorResponse(e);}}
