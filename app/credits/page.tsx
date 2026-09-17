"use client";
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { BillingHistory,CheckoutButton,CommerceNotice } from '@/components/commerce-client';
import { CREDIT_PACKS, FEATURES, formatKRW } from '@/lib/commerce-policy';
import s from '../pricing/pricing.module.css';
export default function CreditsPage(){return <SiteShell compact><main className={s.page}>
 <header className={s.hero}><span>필요한 순간에만</span><h1>구독 없이,<br/>구매 고민만 해결하세요.</h1><p>사용권은 계정에 보관됩니다. 사진을 넣은 표준 판단은 총 {FEATURES.standard.credits}C. 중간에 몰래 더 차감하지 않습니다.</p></header>
 <CommerceNotice/>
 <section className={s.planGrid} aria-label="단품 사용권">{CREDIT_PACKS.map(p=><article className={s.planCard} key={p.id}><span>{p.name}</span><h2>{p.credits/FEATURES.standard.credits}번의 표준 판단</h2><div className={s.price}>{formatKRW(p.price)}</div><p>{p.credits}C · 부가세 포함</p><p>구독·자동 충전 없음<br/>같은 결과 다시 보기는 무료</p><CheckoutButton productId={p.id}/></article>)}</section>
 <section className={s.rules}><h2>한 번의 판단에 포함되는 것</h2><p>하나의 구매 고민과 사진 1장, 저장된 내 정보, 결론·근거·대안을 함께 봅니다. 최신 시세가 확인되지 않으면 확인필요로 표시합니다.</p><p>심층 {FEATURES.deep.credits}C·재판단 {FEATURES.rejudge.credits}C·Lens 단독 {FEATURES.lens.credits}C는 검증 후 열릴 기능입니다. 아직 사용 가능한 기능으로 판매하지 않습니다.</p><Link href="/usage-policy">사용권·환불 가이드 보기</Link></section>
 <BillingHistory/><Link href="/pricing">자주 사용하나요? 월 멤버십 보기 →</Link>
 </main></SiteShell>;}
