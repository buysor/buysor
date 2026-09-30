"use client";
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { usePreferences } from '@/components/preferences-provider';
import { CommerceNotice } from '@/components/commerce-client';
import { MEMBERSHIP, FEATURES, formatKRW } from '@/lib/commerce-policy';
import s from './pricing.module.css';
export default function PricingPage(){const {language}=usePreferences();const ko=language==='ko';return <SiteShell compact><main className={s.page}>
 <header className={s.hero}><span>{ko?'월 멤버십':'MONTHLY MEMBERSHIP'}</span><h1>{ko?<>플랜은 하나.<br/>선택은 더 명확하게.</>:<>One plan.<br/>Clearer decisions.</>}</h1><p>{ko?'여러 구매를 고민할 때만 선택하세요. 가끔 쓴다면 단품 충전이 더 맞습니다.':'Choose membership only if you make several purchase decisions. If you use BUYSOR occasionally, credit packs are usually better.'}</p></header>
 <CommerceNotice/>
 <section className={s.member}><div><span>{ko?MEMBERSHIP.name:'BUYSOR Membership'}</span><h2>{ko?<>필요한 판단을,<br/>매달 하나로.</>:<>More decisions,<br/>one monthly option.</>}</h2><p>{ko?'판단의 기본 개인화나 근거를 비싼 등급에 가두지 않습니다. 멤버십은 더 많이 쓰는 사람을 위한 사용량 선택입니다.':'Core personalization and evidence are not locked behind premium tiers. Membership is simply a better usage option for frequent users.'}</p></div>
 <article className={s.planCard}><h2>{formatKRW(MEMBERSHIP.price, language)} <small>/ {ko?'월':'month'}</small></h2><div className={s.price}>{MEMBERSHIP.credits}C</div><p>{ko?`표준 판단 ${MEMBERSHIP.credits/FEATURES.standard.credits}회 상당 · 부가세 포함`:`Equivalent to ${MEMBERSHIP.credits/FEATURES.standard.credits} standard decisions · VAT included`}</p><ul><li>{ko?'지급분은 90일간 사용':'Monthly credits valid for 90 days'}</li><li>{ko?'취소해도 남은 사용기간 유지':'Cancellation does not erase the remaining validity period'}</li><li>{ko?'무제한 분석·자동 추가 충전 없음':'No unlimited AI and no automatic extra top-up'}</li></ul><button disabled className={s.disabled}>{ko?'월 결제 준비 중':'Membership billing preparing'}</button><small>{ko?'자동 결제 계약·갱신·취소 검증 완료 후 제공합니다.':'Available after recurring billing, renewal and cancellation flows are fully verified.'}</small></article></section>
 <section className={s.rules}><h2>{ko?'멤버십이 아니어도 괜찮습니다.':'Membership is optional.'}</h2><p>{ko?'내 프로필, 기존 판단 기록, 주간·월간 기록 요약은 공통입니다. 사용할 때만 결제해도 바이저의 기본 판단은 같습니다.':'Your profile, decision history and core decision quality are shared across payment options. Pay only when you need BUYSOR if that fits you better.'}</p><Link href="/credits">{ko?'1,900원으로 두 번 판단하기 →':'Try 2 standard decisions for ₩1,900 →'}</Link></section>
 </main></SiteShell>;}
