import {z} from 'zod';import {getChatGPTUser} from '@/app/chatgpt-auth';import {confirmOrder} from '@/lib/payments';
import {assertSameOrigin,boundedJson,json,errorResponse,PublicError} from '@/lib/request-safety';
export async function POST(request:Request){try{assertSameOrigin(request);const user=await getChatGPTUser();if(!user)throw new PublicError(401,'SIGN_IN_REQUIRED','로그인이 필요합니다.');
 const b=z.object({orderId:z.string().uuid(),paymentKey:z.string().min(1).max(200),amount:z.number().int().positive()}).strict().safeParse(await boundedJson(request,2048));
 if(!b.success)throw new PublicError(400,'INVALID_PAYMENT','결제 정보를 확인해 주세요.');
 return json(await confirmOrder(user.id,b.data.orderId,b.data.paymentKey,b.data.amount));}catch(e){return errorResponse(e);}}
