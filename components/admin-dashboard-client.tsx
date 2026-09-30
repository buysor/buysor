"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bot, CircleDollarSign, CreditCard, LoaderCircle, RefreshCw, ScanSearch, UserPlus, Users } from "lucide-react";
import {usePreferences} from "@/components/preferences-provider";
import {formatMoney,type Currency} from "@/lib/market";
import {localizeError} from "@/lib/ui-locale";
import styles from "./admin-dashboard.module.css";

type Row={label:string;n:number};
type Data={
 generatedAt:number;rangeDays:number;
 summary:{activeNow:number;visitorsToday:number;sessionsToday:number;newUsersToday:number;decisionsToday:number;paidOrdersToday:number;revenueToday:number;legacyRevenueToday:number;aiCostToday:number;contributionToday:number;helpfulnessAvg:number;feedbackCount:number;outcomeCount:number;satisfactionAvg:number;recordedPurchaseValue:number;recordedPurchaseValues:Array<{currency:Currency;amount:number}>};
 funnel:{visits:number;lens:number;advisor:number;started:number;completed:number;checkout:number};
 sources:Row[];paths:Row[];countries:Row[];verdicts:Row[];inputTypes:Row[];
 recentEvents:Array<{name:string;path:string;createdAt:number;visitorId:string;email:string|null;properties:Record<string,unknown>}>;
 recentUsers:Array<{id:string;email:string;createdAt:number;updatedAt:number;completion:number;decisions:number;revenue:number;legacyRevenue:number;lastSeen:number}>;
};

export function AdminDashboardClient(){
 const {language}=usePreferences();const ko=language==="ko";const t=(a:string,b:string)=>ko?a:b;
 const [days,setDays]=useState(7);const [data,setData]=useState<Data|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/admin/analytics?days=${days}`,{cache:"no-store"});const b=await r.json() as Data&{error?:string;code?:string};if(!r.ok)throw Error(localizeError(b.error,language,t("데이터를 불러오지 못했습니다.","Could not load the data."),b.code));setData(b);}catch(e){setError(e instanceof Error?e.message:t("데이터를 불러오지 못했습니다.","Could not load the data."));}finally{setLoading(false);}},[days,language]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),60_000);return()=>clearInterval(timer);},[load]);
 const funnel=useMemo(()=>data?[
  [t("방문","Visits"),data.funnel.visits],[t("Lens 입력","Lens input"),data.funnel.lens],[t("조건 완료","Needs completed"),data.funnel.advisor],[t("판단 시작","Decision started"),data.funnel.started],[t("판단 완료","Decision completed"),data.funnel.completed],[t("결제 진입","Checkout started"),data.funnel.checkout],
 ] as const:[],[data,ko]);
 return <main className={styles.page}>
  <header className={styles.hero}><div><span>BUYSOR OPERATIONS</span><h1>{t("운영 대시보드","Operations dashboard")}</h1><p>{t("개인 원문 IP를 저장하지 않고 유입 → 행동 → 판단 → 결제 → 구매 결과를 한 화면에서 봅니다.","View traffic, activity, decisions, payments and purchase outcomes without storing raw IP addresses.")}</p></div>
   <div className={styles.controls}><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={1}>{t("24시간","24 hours")}</option><option value={7}>{t("7일","7 days")}</option><option value={30}>{t("30일","30 days")}</option><option value={90}>{t("90일","90 days")}</option></select><button onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?t("갱신 중","Refreshing"):t("새로고침","Refresh")}</button></div>
  </header>
  {error?<div className={styles.error}>{error}</div>:null}
  {!data&&loading?<div className={styles.loading}><LoaderCircle className="spin" size={28}/>{t("운영 데이터를 모으는 중","Loading operations data")}</div>:null}
  {data?<>
   <section className={styles.metrics}>
    <Metric icon={<Activity/>} label={t("지금 활성","Active now")} value={String(data.summary.activeNow)} note={t("최근 5분","Last 5 minutes")}/>
    <Metric icon={<Users/>} label={t("오늘 방문자","Visitors today")} value={String(data.summary.visitorsToday)} note={t(`${data.summary.sessionsToday} 세션`,`${data.summary.sessionsToday} sessions`)}/>
    <Metric icon={<UserPlus/>} label={t("오늘 신규 계정","New accounts today")} value={String(data.summary.newUsersToday)} note={t("로그인 후 확인된 계정","Verified signed-in accounts")}/>
    <Metric icon={<ScanSearch/>} label={t("오늘 판단 완료","Decisions completed today")} value={String(data.summary.decisionsToday)} note="BUY · WAIT · SKIP"/>
    <Metric icon={<CreditCard/>} label={t("오늘 결제","Payments today")} value={formatMoney(data.summary.revenueToday,"USD",language)} note={t(`UTC 기준 · 기존 원화 ${formatMoney(data.summary.legacyRevenueToday,"KRW",language)}`,`UTC · legacy ${formatMoney(data.summary.legacyRevenueToday,"KRW",language)}`)}/>
    <Metric icon={<Bot/>} label={t("오늘 AI 원가","AI cost today")} value={formatMoney(data.summary.aiCostToday,"USD",language)} note={t("실제 계측값 기반","Based on measured usage")}/>
    <Metric icon={<CircleDollarSign/>} label={t("오늘 매출-AI원가","Revenue minus AI cost today")} value={formatMoney(data.summary.contributionToday,"USD",language)} note={t("USD 매출에서 전체 AI 원가 차감 · 기타 비용 전","USD revenue minus all AI costs; before other costs")}/>
    <Metric icon={<Activity/>} label={t("구매 만족도","Purchase satisfaction")} value={data.summary.satisfactionAvg?data.summary.satisfactionAvg.toFixed(1):"—"} note={t(`결과 ${data.summary.outcomeCount}건`,`${data.summary.outcomeCount} outcomes`)}/>
   </section>

   <section className={styles.grid}>
    <Panel title={t("전환 퍼널","Conversion funnel")} subtitle={t(`최근 ${days}일 · 세션 기준`,`Last ${days} days · by session`)}>
     <div className={styles.funnel}>{funnel.map(([label,value],i)=>{const base=funnel[0]?.[1]||0;return <div key={label}><span>{label}</span><strong>{value}</strong><b>{base?Math.round(value/base*100):0}%</b><i><span style={{width:`${base?Math.max(2,value/base*100):0}%`}}/></i></div>;})}</div>
    </Panel>
    <Panel title={t("유입","Traffic sources")} subtitle={t("UTM 우선 · 없으면 referrer","UTM, or referrer when absent")}><Bars rows={data.sources}/></Panel>
    <Panel title={t("많이 본 화면","Most viewed pages")} subtitle={t("페이지뷰","Page views")}><Bars rows={data.paths}/></Panel>
    <Panel title={t("국가","Countries")} subtitle={t("Cloudflare 국가 코드 · IP 원문 미저장","Cloudflare country codes; no raw IP storage")}><Bars rows={data.countries}/></Panel>
    <Panel title={t("판단 결과","Decision outcomes")} subtitle={t("완료된 AI 판단","Completed AI decisions")}><Bars rows={data.verdicts}/></Panel>
    <Panel title={t("입력 방식","Input methods")} subtitle={t("사진 · 링크 · 제품명 · 카테고리","Photo · link · name · category")}><Bars rows={data.inputTypes}/></Panel>
   </section>

   <section className={styles.twoCol}>
    <Panel title={t("최근 사용자","Recent users")} subtitle={t("계정별 핵심 상태","Key account status")}>
     <div className={styles.tableWrap}><table><thead><tr><th>{t("계정","Account")}</th><th>{t("최근 접속","Last seen")}</th><th>{t("프로필","Profile")}</th><th>{t("판단","Decisions")}</th><th>{t("결제","Payments")}</th></tr></thead><tbody>{data.recentUsers.map(u=><tr key={u.id}><td>{u.email}</td><td>{timeAgo(u.lastSeen||u.updatedAt,language)}</td><td>{u.completion}%</td><td>{u.decisions}</td><td>{[formatMoney(u.revenue,"USD",language),...(u.legacyRevenue?[formatMoney(u.legacyRevenue,"KRW",language)]:[])].join(" · ")}</td></tr>)}</tbody></table></div>
    </Panel>
    <Panel title={t("최근 활동","Recent activity")} subtitle={t("이벤트 타임라인","Event timeline")}>
     <div className={styles.timeline}>{data.recentEvents.slice(0,30).map((e,i)=><div key={e.createdAt+"-"+i}><b>{eventName(e.name,language)}</b><span>{e.email||t(`익명 ${e.visitorId}`,`Anonymous ${e.visitorId}`)} · {e.path}</span><small>{timeAgo(e.createdAt,language)}</small></div>)}</div>
    </Panel>
   </section>

   <section className={styles.outcome}>
    <div><span>{t("판단 도움 점수","Decision helpfulness")}</span><strong>{data.summary.helpfulnessAvg?data.summary.helpfulnessAvg.toFixed(1):"—"}<small>/5</small></strong><p>{data.summary.feedbackCount} {t("건","responses")}</p></div>
    <div><span>{t("실제 구매 결과","Actual purchase outcomes")}</span><strong>{data.summary.outcomeCount}<small>{t("건","outcomes")}</small></strong><p>{t("사용자 후속 기록","User follow-up records")}</p></div>
    <div><span>{t("기록된 실제 구매액","Recorded purchase value")}</span><strong>{data.summary.recordedPurchaseValues.map(v=>formatMoney(v.amount,v.currency,language)).join(" · ")||"—"}</strong><p>{t("사용자 입력 기준","Based on user input")}</p></div>
   </section>
   <footer className={styles.foot}>{t("마지막 갱신","Last updated")} {new Date(data.generatedAt).toLocaleString(ko?"ko-KR":"en-US")} · {t("원본 IP, 카드번호, 비밀번호는 분석 데이터로 저장하지 않습니다.","Raw IP addresses, card numbers and passwords are not stored in analytics.")}</footer>
  </>:null}
 </main>;
}

function Metric({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}){return <article className={styles.metric}><span>{icon}{label}</span><strong>{value}</strong><small>{note}</small></article>;}
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <article className={styles.panel}><header><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>;}
function Bars({rows}:{rows:Row[]}){const {language}=usePreferences();const t=(a:string,b:string)=>language==="ko"?a:b;const max=Math.max(1,...rows.map(r=>r.n));return <div className={styles.bars}>{rows.length?rows.map(r=><div key={r.label}><span title={r.label}>{r.label}</span><i><b style={{width:`${Math.max(3,r.n/max*100)}%`}}/></i><strong>{r.n}</strong></div>):<p className={styles.empty}>{t("아직 데이터가 없습니다.","No data yet.")}</p>}</div>;}
function timeAgo(v:number,language:"ko"|"en"){if(!v)return"—";const ko=language==="ko";const d=Date.now()-v;if(d<60_000)return ko?"방금":"Just now";if(d<3_600_000)return ko?`${Math.floor(d/60_000)}분 전`:`${Math.floor(d/60_000)} min ago`;if(d<86_400_000)return ko?`${Math.floor(d/3_600_000)}시간 전`:`${Math.floor(d/3_600_000)} hr ago`;return new Intl.DateTimeFormat(ko?"ko-KR":"en-US",{month:"numeric",day:"numeric"}).format(new Date(v));}
function eventName(v:string,language:"ko"|"en"){const t=(a:string,b:string)=>language==="ko"?a:b;return ({page_view:t("페이지뷰","Page views"),lens_input:t("Lens 입력","Lens input"),advisor_completed:t("조건 완료","Needs completed"),decision_started:t("판단 시작","Decision started"),decision_completed:t("판단 완료","Decision completed"),decision_failed:t("판단 실패","Decision failed"),profile_saved:t("프로필 저장","Profile saved"),feedback_submitted:t("결과 피드백","Outcome feedback"),checkout_started:t("결제 진입","Checkout started"),checkout_completed:t("결제 완료","Payment completed")} as Record<string,string>)[v]||v;}

