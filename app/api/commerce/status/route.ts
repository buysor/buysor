import {getChatGPTUser} from '@/app/chatgpt-auth';
import {commerceDb,wallet} from '@/lib/commerce-store';
import {POLICY_VERSION,CREDIT_PACKS,MEMBERSHIP,FEATURES,REWARDS} from '@/lib/commerce-policy';
import {checkoutReady,runtimeConfig} from '@/lib/commerce-runtime';
import {json,errorResponse} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET(){try{
 await commerceDb();const user=await getChatGPTUser();
 return json({policyVersion:POLICY_VERSION,packs:CREDIT_PACKS,membership:MEMBERSHIP,features:FEATURES,rewards:REWARDS,
  checkoutReady:checkoutReady(),subscriptionReady:false,aiReady:runtimeConfig().configured,
  authenticated:Boolean(user),balance:user?await wallet(user.id):null});
}catch(e){return errorResponse(e);}}
