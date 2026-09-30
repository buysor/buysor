import {z} from 'zod';import {getChatGPTUser} from '@/app/chatgpt-auth';import {refundUnusedOrder} from '@/lib/payments';
import {assertSameOrigin,boundedJson,json,errorResponse,PublicError} from '@/lib/request-safety';
import {commerceDb} from '@/lib/commerce-store';
import {refundGlobalOrder} from '@/lib/global-payments';
export async function POST(request:Request){try{assertSameOrigin(request);const user=await getChatGPTUser();if(!user)throw new PublicError(401,'SIGN_IN_REQUIRED','로그인이 필요합니다.');
 const b=z.object({orderId:z.string().uuid(),confirmed:z.literal(true)}).strict().safeParse(await boundedJson(request,1024));
 if(!b.success)throw new PublicError(400,'REFUND_CONFIRM_REQUIRED','환불할 주문을 확인해 주세요.');
 const db=await commerceDb();const global=await db.prepare('SELECT order_id FROM billing_market WHERE order_id=?').bind(b.data.orderId).first();
 return json(global ? await refundGlobalOrder(user.id,b.data.orderId) : await refundUnusedOrder(user.id,b.data.orderId));}catch(e){return errorResponse(e);}}
