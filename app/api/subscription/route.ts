import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getSubscriptionTier} from '@/lib/user-data';
import {json,errorResponse} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getChatGPTUser();return json({authenticated:Boolean(user),tier:user?await getSubscriptionTier(user):'free'});}catch(e){return errorResponse(e);}}
export async function POST(){return json({error:'멤버십은 서버에서 검증된 결제로만 변경됩니다.'},405);}
