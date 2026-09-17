"use client";
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { CommerceNotice } from '@/components/commerce-client';
import { MEMBERSHIP, FEATURES, formatKRW } from '@/lib/commerce-policy';
import s from './pricing.module.css';
export default function PricingPage(){return <SiteShell compact><main className={s.page}>
 <header className={s.hero}><span>월 멤버십</span><h1>플랜은 하나.<br/>선택은 더 명확하게.</h1><p>여러 구매를 고민할 때만 선택하세요. 가끔 쓴다면 단품 충전이 더 맞습니다.</p></header>
 <CommerceNotice/>
 <section className={s.member}><div><span>{MEMBERSHIP.name}</span><h2>필요한 판단을,<br/>매달 하나로.</h2><p>판단의 기본 개인화나 근거를 비싼 등급에 가두지 않습니다. 멤버십은 더 많이 쓰는 사람을 위한 사용량 선택입니다.</p></div>
 <article className={s.planCard}><h2>{formatKRW(MEMBERSHIP.price)} <small>/ 월</small></h2><div className={s.price}>{MEMBERSHIP.credits}C</div><p>표준 판단 {MEMBERSHIP.credits/FEATURES.standard.credits}회 상당 · 부가세 포함</p><ul><li>지급분은 90일간 사용</li><li>취소해도 남은 사용기간 유지</li><li>무제한 분석·자동 추가 충전 없음</li></ul><button disabled className={s.disabled}>월 결제 준비 중</button><small>자동 결제 계약·갱신·취소 검증 완료 후 제공합니다.</small></article></section>
 <section className={s.rules}><h2>멤버십이 아니어도 괜찮습니다.</h2><p>내 프로필, 기존 판단 기록, 주간·월간 기록 요약은 공통입니다. 사용할 때만 결제해도 바이저의 기본 판단은 같습니다.</p><Link href="/credits">1,900원으로 두 번 판단하기 →</Link></section>
 </main></SiteShell>;}
