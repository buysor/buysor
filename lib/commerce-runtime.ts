import { MODEL_RATES, FEATURES, type Feature } from './commerce-policy';
import { PublicError } from './request-safety';
export function runtimeConfig() {
 const fx=Number(process.env.AI_FX_KRW_PER_USD || '1600');
 const daily=Number(process.env.AI_DAILY_BUDGET_KRW || '0');
 const model=process.env.AI_MODEL?.trim() || 'gpt-5.6-terra';
 const configured=process.env.AI_SPEND_ENABLED==='1' && process.env.AI_PROVIDER==='openai'
   && Boolean(process.env.OPENAI_API_KEY) && Boolean(MODEL_RATES[model])
   && Number.isFinite(fx) && fx>=1000 && fx<=3000
   && Number.isFinite(daily) && daily>0 && daily<=1000000;
 return {configured,provider:configured?'openai':null,model:configured?model:null,fx,daily};
}
export function quote(feature:Feature) {
 const config=runtimeConfig();
 if(!config.configured)throw new PublicError(503,'AI_NOT_CONFIGURED','분석 서비스를 준비 중입니다. 크레딧은 차감되지 않습니다.');
 return {reserveMicro:Math.floor(FEATURES[feature].ceilingKRW/config.fx*1000000),dayCapMicro:Math.floor(config.daily/config.fx*1000000)};
}
// Live merchant activation is deliberately separate from deployment.
export function checkoutReady() {
 return process.env.BUYSOR_PAID_RELEASE==='1' && process.env.BUYSOR_COMMERCE_REVIEWED==='1'
  && Boolean(process.env.TOSS_SECRET_KEY?.startsWith('live_sk_'))
  && Boolean(process.env.TOSS_MERCHANT_ID) && (process.env.TOSS_WEBHOOK_SECRET?.length??0)>=32
  && Boolean(process.env.PUBLIC_ORIGIN?.startsWith('https://')) && runtimeConfig().configured;
}
export function requireCheckout() {
 if(!checkoutReady())throw new PublicError(503,'CHECKOUT_NOT_READY','결제 연동과 서비스 검증을 준비 중입니다. 아직 결제되지 않습니다.');
}
