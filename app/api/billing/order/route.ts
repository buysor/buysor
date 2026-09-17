import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {createOrder} from '@/lib/payments';
import {POLICY_VERSION} from '@/lib/commerce-policy';
import {assertSameOrigin,boundedJson,json,errorResponse,PublicError} from '@/lib/request-safety';
export async function POST(request:Request){try{
 assertSameOrigin(request);const user=await getChatGPTUser();if(!user)throw new PublicError(401,'SIGN_IN_REQUIRED','Google 로그인이 필요합니다.');
 const b=z.object({productId:z.string().max(30),acceptedPrice:z.number().int().positive(),policyVersion:z.literal(POLICY_VERSION),consent:z.literal(true)}).strict().safeParse(await boundedJson(request,2048));
 if(!b.success)throw new PublicError(400,'INVALID_ORDER','결제 금액과 조건을 확인해 주세요.');
 return json(await createOrder(user.id,b.data.productId,b.data.acceptedPrice));
}catch(e){return errorResponse(e);}}
