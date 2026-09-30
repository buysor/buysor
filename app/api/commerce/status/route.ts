import {getChatGPTUser} from '@/app/chatgpt-auth';
import {commerceDb,wallet,grantBetaTrialIfAllowed} from '@/lib/commerce-store';
import {POLICY_VERSION,BILLING_POLICY_VERSION,USD_CREDIT_PACKS,USD_MEMBERSHIP,FEATURES,REWARDS} from '@/lib/commerce-policy';
import {checkoutReady,runtimeConfig} from '@/lib/commerce-runtime';
import {json,errorResponse} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET(){try{
 await commerceDb();const user=await getChatGPTUser();
 if(user)await grantBetaTrialIfAllowed(user.id,user.email);
 return json({policyVersion:POLICY_VERSION,billingPolicyVersion:BILLING_POLICY_VERSION,currency:'USD',paymentProvider:'paddle',packs:USD_CREDIT_PACKS,membership:USD_MEMBERSHIP,features:FEATURES,rewards:REWARDS,
  checkoutReady:checkoutReady(),subscriptionReady:false,aiReady:runtimeConfig().configured,
  authenticated:Boolean(user),balance:user?await wallet(user.id):null});
}catch(e){return errorResponse(e);}}
