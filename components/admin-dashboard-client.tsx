"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bot, CircleDollarSign, CreditCard, LoaderCircle, RefreshCw, ScanSearch, UserPlus, Users } from "lucide-react";
import styles from "./admin-dashboard.module.css";

type Row={label:string;n:number};
type Data={
 generatedAt:number;rangeDays:number;
 summary:{activeNow:number;visitorsToday:number;sessionsToday:number;newUsersToday:number;decisionsToday:number;paidOrdersToday:number;revenueToday:number;aiCostToday:number;contributionToday:number;helpfulnessAvg:number;feedbackCount:number;outcomeCount:number;satisfactionAvg:number;recordedPurchaseValue:number};
 funnel:{visits:number;lens:number;advisor:number;started:number;completed:number;checkout:number};
 sources:Row[];paths:Row[];countries:Row[];verdicts:Row[];inputTypes:Row[];
 recentEvents:Array<{name:string;path:string;createdAt:number;visitorId:string;email:string|null;properties:Record<string,unknown>}>;
 recentUsers:Array<{id:string;email:string;createdAt:number;updatedAt:number;completion:number;decisions:number;revenue:number;lastSeen:number}>;
};

export function AdminDashboardClient(){
 const [days,setDays]=useState(7);const [data,setData]=useState<Data|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/admin/analytics?days=${days}`,{cache:"no-store"});const b=await r.json() as Data&{error?:string};if(!r.ok)throw Error(b.error||"데이터를 불러오지 못했습니다.");setData(b);}catch(e){setError(e instanceof Error?e.message:"데이터를 불러오지 못했습니다.");}finally{setLoading(false);}},[days]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),60_000);return()=>clearInterval(timer);},[load]);
 const funnel=useMemo(()=>data?[
  ["방문",data.funnel.visits],["Lens 입력",data.funnel.lens],["조건 완료",data.funnel.advisor],["판단 시작",data.funnel.started],["판단 완료",data.funnel.completed],["결제 진입",data.funnel.checkout],
 ] as const:[],[data]);
 return <main className={styles.page}>
  <header className={styles.hero}><div><span>BUYSOR OPERATIONS</span><h1>운영 대시보드</h1><p>개인 원문 IP를 저장하지 않고 유입 → 행동 → 판단 → 결제 → 구매 결과를 한 화면에서 봅니다.</p></div>
   <div className={styles.controls}><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={1}>24시간</option><option value={7}>7일</option><option value={30}>30일</option><option value={90}>90일</option></select><button onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?"갱신 중":"새로고침"}</button></div>
  </header>
  {error?<div className={styles.error}>{error}</div>:null}
  {!data&&loading?<div className={styles.loading}><LoaderCircle className="spin" size={28}/>운영 데이터를 모으는 중</div>:null}
  {data?<>
   <section className={styles.metrics}>
    <Metric icon={<Activity/>} label="지금 활성" value={String(data.summary.activeNow)} note="최근 5분"/>
    <Metric icon={<Users/>} label="오늘 방문자" value={String(data.summary.visitorsToday)} note={`${data.summary.sessionsToday} 세션`}/>
    <Metric icon={<UserPlus/>} label="오늘 신규 계정" value={String(data.summary.newUsersToday)} note="로그인 후 확인된 계정"/>
    <Metric icon={<ScanSearch/>} label="오늘 판단 완료" value={String(data.summary.decisionsToday)} note="BUY · WAIT · SKIP"/>
    <Metric icon={<CreditCard/>} label="오늘 결제" value={won(data.summary.revenueToday)} note={`${data.summary.paidOrdersToday}건`}/>
    <Metric icon={<Bot/>} label="오늘 AI 원가" value={won(data.summary.aiCostToday)} note="실제 계측값 기반"/>
    <Metric icon={<CircleDollarSign/>} label="오늘 매출-AI원가" value={won(data.summary.contributionToday)} note="기타 비용 전"/>
    <Metric icon={<Activity/>} label="구매 만족도" value={data.summary.satisfactionAvg?data.summary.satisfactionAvg.toFixed(1):"—"} note={`결과 ${data.summary.outcomeCount}건`}/>
   </section>

   <section className={styles.grid}>
    <Panel title="전환 퍼널" subtitle={`최근 ${days}일 · 세션 기준`}>
     <div className={styles.funnel}>{funnel.map(([label,value],i)=>{const base=funnel[0]?.[1]||0;return <div key={label}><span>{label}</span><strong>{value}</strong><b>{base?Math.round(value/base*100):0}%</b><i><span style={{width:`${base?Math.max(2,value/base*100):0}%`}}/></i></div>;})}</div>
    </Panel>
    <Panel title="유입" subtitle="UTM 우선 · 없으면 referrer"><Bars rows={data.sources}/></Panel>
    <Panel title="많이 본 화면" subtitle="페이지뷰"><Bars rows={data.paths}/></Panel>
    <Panel title="국가" subtitle="Cloudflare 국가 코드 · IP 원문 미저장"><Bars rows={data.countries}/></Panel>
    <Panel title="판단 결과" subtitle="완료된 AI 판단"><Bars rows={data.verdicts}/></Panel>
    <Panel title="입력 방식" subtitle="사진 · 링크 · 제품명 · 카테고리"><Bars rows={data.inputTypes}/></Panel>
   </section>

   <section className={styles.twoCol}>
    <Panel title="최근 사용자" subtitle="계정별 핵심 상태">
     <div className={styles.tableWrap}><table><thead><tr><th>계정</th><th>최근 접속</th><th>프로필</th><th>판단</th><th>결제</th></tr></thead><tbody>{data.recentUsers.map(u=><tr key={u.id}><td>{u.email}</td><td>{timeAgo(u.lastSeen||u.updatedAt)}</td><td>{u.completion}%</td><td>{u.decisions}</td><td>{won(u.revenue)}</td></tr>)}</tbody></table></div>
    </Panel>
    <Panel title="최근 활동" subtitle="이벤트 타임라인">
     <div className={styles.timeline}>{data.recentEvents.slice(0,30).map((e,i)=><div key={e.createdAt+"-"+i}><b>{eventName(e.name)}</b><span>{e.email||`익명 ${e.visitorId}`} · {e.path}</span><small>{timeAgo(e.createdAt)}</small></div>)}</div>
    </Panel>
   </section>

   <section className={styles.outcome}>
    <div><span>판단 도움 점수</span><strong>{data.summary.helpfulnessAvg?data.summary.helpfulnessAvg.toFixed(1):"—"}<small>/5</small></strong><p>{data.summary.feedbackCount}건</p></div>
    <div><span>실제 구매 결과</span><strong>{data.summary.outcomeCount}<small>건</small></strong><p>사용자 후속 기록</p></div>
    <div><span>기록된 실제 구매액</span><strong>{won(data.summary.recordedPurchaseValue)}</strong><p>사용자 입력 기준</p></div>
   </section>
   <footer className={styles.foot}>마지막 갱신 {new Date(data.generatedAt).toLocaleString("ko-KR")} · 원본 IP, 카드번호, 비밀번호는 분석 데이터로 저장하지 않습니다.</footer>
  </>:null}
 </main>;
}

function Metric({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}){return <article className={styles.metric}><span>{icon}{label}</span><strong>{value}</strong><small>{note}</small></article>;}
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <article className={styles.panel}><header><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>;}
function Bars({rows}:{rows:Row[]}){const max=Math.max(1,...rows.map(r=>r.n));return <div className={styles.bars}>{rows.length?rows.map(r=><div key={r.label}><span title={r.label}>{r.label}</span><i><b style={{width:`${Math.max(3,r.n/max*100)}%`}}/></i><strong>{r.n}</strong></div>):<p className={styles.empty}>아직 데이터가 없습니다.</p>}</div>;}
function won(v:number){return new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(v||0);}
function timeAgo(v:number){if(!v)return"—";const d=Date.now()-v;if(d<60_000)return"방금";if(d<3_600_000)return`${Math.floor(d/60_000)}분 전`;if(d<86_400_000)return`${Math.floor(d/3_600_000)}시간 전`;return new Intl.DateTimeFormat("ko-KR",{month:"numeric",day:"numeric"}).format(new Date(v));}
function eventName(v:string){return ({page_view:"페이지뷰",lens_input:"Lens 입력",advisor_completed:"조건 완료",decision_started:"판단 시작",decision_completed:"판단 완료",decision_failed:"판단 실패",profile_saved:"프로필 저장",feedback_submitted:"결과 피드백",checkout_started:"결제 진입",checkout_completed:"결제 완료"} as Record<string,string>)[v]||v;}
