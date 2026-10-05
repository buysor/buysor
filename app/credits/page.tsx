"use client";
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { usePreferences } from '@/components/preferences-provider';
import { BillingHistory,CheckoutButton,CommerceNotice } from '@/components/commerce-client';
import { USD_CREDIT_PACKS as CREDIT_PACKS, FEATURES } from '@/lib/commerce-policy';
import { ServicePrice, ExchangeRateNotice } from '@/components/currency-pricing';
import s from '../pricing/pricing.module.css';
export default function CreditsPage(){const {language}=usePreferences();const ko=language==='ko';return <SiteShell compact><main className={s.page}>
 <header className={s.hero}><span>{ko?'필요한 순간에만':'PAY ONLY WHEN NEEDED'}</span><h1>{ko?<>구독 없이,<br/>구매 고민만 해결하세요.</>:<>No subscription required.<br/>Pay per decision.</>}</h1><p>{ko?`사용권은 계정에 보관됩니다. 사진을 넣은 표준 판단은 총 ${FEATURES.standard.credits}C. 중간에 몰래 더 차감하지 않습니다.`:`Credits stay in your account. A standard decision including a photo costs exactly ${FEATURES.standard.credits}C, with no hidden extra deduction.`}</p></header>
 <CommerceNotice/><ExchangeRateNotice/>
 <section className={s.planGrid} aria-label={ko?"단품 사용권":"Credit packs"}>{CREDIT_PACKS.map((p,i)=><article className={s.planCard} key={p.id}><span>{ko?p.ko:p.name}</span><h2>{ko?`${p.credits/FEATURES.standard.credits}번의 표준 판단`:`${p.credits/FEATURES.standard.credits} standard decisions`}</h2><div className={s.price}><ServicePrice cents={p.price} showCharge/></div><p>{p.credits}C · {ko?'세금은 결제창에서 계산':'Tax calculated at checkout'}</p><p>{ko?<>구독·자동 충전 없음<br/>같은 결과 다시 보기는 무료</>:<>No subscription or auto top-up<br/>Reopening the same result is free</>}</p><CheckoutButton productId={p.id}/></article>)}</section>
 <section className={s.rules}><h2>{ko?'한 번의 판단에 포함되는 것':"What's included"}</h2><p>{ko?'하나의 구매 고민과 사진 1장, 저장된 내 정보, 결론·근거·대안, 최신 웹 근거 확인을 함께 봅니다. 검증되지 않은 시세는 확인 필요로 표시합니다.':'One purchase question can combine one photo, your saved profile, conclusion, reasons, alternatives and current web evidence. Unverified pricing stays marked as needing verification.'}</p><p>{ko?`심층 ${FEATURES.deep.credits}C·재판단 ${FEATURES.rejudge.credits}C·Lens 단독 ${FEATURES.lens.credits}C는 검증 후 열릴 기능입니다.`:`Deep ${FEATURES.deep.credits}C, rejudge ${FEATURES.rejudge.credits}C and standalone Lens ${FEATURES.lens.credits}C remain gated until validated.`}</p><Link href="/usage-policy">{ko?'사용권·환불 가이드 보기':'View credit & refund guide'}</Link></section>
 <BillingHistory/><Link href="/pricing">{ko?'자주 사용하나요? 월 멤버십 보기 →':'Use BUYSOR often? View membership →'}</Link>
 </main></SiteShell>;}

