"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Crown,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ReportData } from "@/lib/buysor-types";
import { usePreferences } from "@/components/preferences-provider";
import {localizeError} from "@/lib/ui-locale";
import styles from "./buysor-features.module.css";

type ReportClientProps = { type: "weekly" | "monthly" };
type LoadState = "loading" | "guest" | "ready" | "error";

export function ReportClient({ type }: ReportClientProps) {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const isMonthly = type === "monthly";

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
      const auth = await authResponse.json() as { authenticated?: boolean };
      if (!auth.authenticated) {
        setState("guest");
        return;
      }
      const response = await fetch(`/api/reports?period=${type}&lang=${language}`, { cache: "no-store" });
      const payload = await response.json() as ReportData & { error?: string; code?: string };
      if (!response.ok) throw new Error(localizeError(payload.error,language,ko ? "리포트를 불러오지 못했습니다." : "Could not load the report.",payload.code));
      setData(payload);
      setState("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (ko ? "리포트를 불러오지 못했습니다." : "Could not load the report."));
      setState("error");
    }
  }, [type, language, ko]);

  useEffect(() => {
    void load();
  }, [load]);

  const premiumAvailable = true;
  const locked = false;
  const empty = Boolean(data && !data.hasData);

  return (
    <div className={styles.reportPage}>
      <section className={styles.reportHero}>
        <div>
          <span className="section-kicker">{isMonthly ? "MONTHLY REPORT" : "WEEKLY REPORT"}</span>
          <h1>{ko ? (isMonthly ? "월간 리포트" : "주간 리포트") : (isMonthly ? "Monthly report" : "Weekly report")}</h1>
        </div>
        <p>{ko ? (isMonthly
          ? "최근 30일의 실제 구매 판단을 묶어 반복 패턴, 보류 이유, 다음 우선순위를 확인합니다."
          : "최근 7일의 실제 판단을 모아 무엇을 샀고, 기다렸고, 건너뛰었는지 정리합니다.")
          : (isMonthly ? "Review the last 30 days of real decisions, repeated patterns, reasons to wait and what to prioritize next." : "Review the last 7 days of BUY, WAIT and SKIP decisions.")}</p>
      </section>

      {state === "loading" ? <CenteredState icon={<LoaderCircle className="spin" size={25}/>} title={ko?"리포트 불러오는 중":"Loading report"} body={ko?"계정의 실제 구매 판단 기록을 확인하고 있습니다.":"Checking your account decision history."}/> : null}
      {state === "guest" ? <CenteredState icon={<LogIn size={25}/>} title={ko?"리포트는 로그인 계정 기준으로 만들어집니다.":"Reports are built from your signed-in account."} body={ko?"구매 판단 기록과 USER MODEL이 계정에 쌓여야 주간·월간 리포트를 정확하게 계산할 수 있습니다.":"Decision history and your USER MODEL are needed to build accurate weekly and monthly reports."} action={<a className={styles.primaryButton} href={`/login?return_to=${encodeURIComponent(isMonthly ? "/reports/monthly" : "/reports/weekly")}`}><LogIn size={15}/> {ko?"로그인":"Sign in"}</a>}/> : null}
      {state === "error" ? <CenteredState icon={<ShieldCheck size={25}/>} title={ko?"리포트를 불러오지 못했습니다.":"Could not load the report."} body={error} action={<button className={styles.primaryButton} type="button" onClick={load}>{ko?"다시 시도":"Try again"}</button>}/> : null}

      {state === "ready" && data ? (
        <section className={styles.reportShell}>
          <div className={styles.reportContent} data-locked={locked}>
            <div className={styles.reportTopStats}>
              {(locked ? placeholderMetrics(isMonthly) : data.metrics).map((metric) => (
                <div className={styles.metric} key={metric.label}>
                  <span>{metric.label}</span><strong>{metric.value}</strong><b>{metric.note}</b>
                </div>
              ))}
            </div>

            {empty && !locked ? (
              <article className={styles.reportCard} style={{ textAlign: "center", padding: 42 }}>
                <div className={styles.cardEyebrow} style={{ justifyContent: "center" }}><Sparkles size={14}/>{ko?"첫 기록 대기":"Waiting for your first decision"}</div>
                <h2>{ko?"아직 이 기간의 구매 판단 기록이 없습니다.":"No purchase decisions in this period yet."}</h2>
                <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.7 }}>{ko?"Lens, 제품명, 링크 또는 카테고리로 첫 판단을 완료하면 이 화면이 실제 데이터로 채워집니다.":"Complete a decision with Lens, product name, link or category and this report will fill with real data."}</p>
                <a className={styles.primaryButton} href="/lens" style={{ marginTop: 8 }}>{ko?"첫 판단 시작":"Start first decision"}</a>
              </article>
            ) : (
              <>
                <div className={styles.reportGrid}>
                  <article className={styles.reportCard}>
                    <div className={styles.cardEyebrow}><TrendingUp size={14}/>{ko?"집중":"FOCUS"}</div>
                    <h2>{ko ? (isMonthly ? "최근 30일 관심 카테고리" : "이번 주 가장 많이 고민한 영역") : (isMonthly ? "Top categories in the last 30 days" : "What you considered most this week")}</h2>
                    {data.categoryBars.length ? <div className={styles.barList}>{data.categoryBars.map((item) => <div className={styles.barItem} key={item.label}><span>{item.label}</span><div className={styles.bar}><span style={{width:`${item.value}%`}}/></div><strong>{item.note}</strong></div>)}</div> : <p style={{ color: "var(--muted)", fontSize: 12 }}>{ko?"아직 분류할 기록이 없습니다.":"No categorized records yet."}</p>}
                  </article>

                  <article className={styles.reportCard}>
                    <div className={styles.cardEyebrow}><ShieldCheck size={14}/>{ko?"패턴":"PATTERNS"}</div>
                    <h2>{ko?"바이저가 찾은 반복 패턴":"Repeated patterns BUYSOR found"}</h2>
                    <ul className={styles.insightBullets}>{data.patterns.map((item) => <li key={item}>{item}</li>)}</ul>
                  </article>
                </div>

                <article className={styles.reportCard}>
                  <div className={styles.cardEyebrow}><Clock3 size={14}/>{ko?"재확인":"RECHECK"}</div>
                  <h2>{ko ? (isMonthly ? "다음 달까지 다시 볼 판단" : "다시 확인할 판단") : (isMonthly ? "Decisions to revisit by next month" : "Decisions to revisit")}</h2>
                  {data.recheck.length ? data.recheck.map((item) => <div className={styles.decisionRow} key={item.id}><div><strong>{item.title}</strong><span>{item.note}{item.recheckAt ? ` · ${item.recheckAt}` : ""}</span></div><span className={styles.pill}>{item.verdict ?? "REVIEW"}</span></div>) : <p style={{ color: "var(--muted)", fontSize: 12 }}>{ko?"현재 재확인 대기 중인 판단이 없습니다.":"No decisions are waiting for a recheck."}</p>}
                </article>

                <PremiumSection data={data} available={premiumAvailable} ko={ko}/>
              </>
            )}
          </div>

        </section>
      ) : null}

      <p className={styles.reportFootnote}>{ko?"리포트는 저장된 실제 구매 판단 기록만 사용합니다. 기록이 없으면 숫자나 패턴을 임의로 생성하지 않습니다.":"Reports use only saved, real purchase decisions. BUYSOR does not invent metrics or patterns when no records exist."}</p>
    </div>
  );
}

function PremiumSection({ data, available, ko }: { data: ReportData; available: boolean; ko: boolean }) {
  const premium = data.premium;
  return (
    <section className={styles.premiumBlock} data-available={available}>
      <div className={styles.premiumHead}>
        <div><Crown size={17}/><span>{ko?"기록 분석":"HISTORY ANALYSIS"}</span><h2>{ko?"여러 구매를 하나의 우선순위로 정리":"Turn multiple purchases into one priority list"}</h2></div>

      </div>

      <div className={styles.premiumContent}>
        <article className={styles.strategyCard}>
          <h3>{ko?"구매 우선순위":"Purchase priorities"}</h3>
          <div className={styles.priorityList}>
            {premium.priorities.length ? premium.priorities.map((item, index) => <div className={styles.priorityRow} key={item.id}><b>{index + 1}</b><div><strong>{item.title}</strong><span>{item.reason}</span></div><em>{item.verdict} · {item.confidence}%</em></div>) : <p style={{ color: "var(--muted)", fontSize: 11 }}>{ko?"완료된 판단이 쌓이면 우선순위를 계산합니다.":"Priorities appear as completed decisions accumulate."}</p>}
          </div>
        </article>

        <article className={styles.strategyCard}>
          <h3>{ko?"재판단 타임라인":"Recheck timeline"}</h3>
          <div className={styles.timeline}>
            {premium.timeline.length ? premium.timeline.map((item) => <div key={item.id}><b>{item.when}</b><span><strong>{item.title}</strong><br/>{item.action}</span></div>) : <p style={{ color: "var(--muted)", fontSize: 11 }}>{ko?"WAIT 판단의 조건과 시점이 생기면 자동으로 모입니다.":"WAIT conditions and dates will collect here automatically."}</p>}
          </div>
        </article>
      </div>

      <div className={styles.scenarioSection}>
        <div className={styles.scenarioTitle}><Sparkles size={15}/><strong>{ko?"대안 시뮬레이션 후보":"Alternative scenarios"}</strong><span>{ko?"각 구매 판단에서 실제 AI가 생성한 대안이 2개 이상 있을 때만 표시합니다.":"Shown only when an actual decision generated at least two alternatives."}</span></div>
        <div className={styles.scenarioGrid}>
          {premium.scenarioCandidates.length ? premium.scenarioCandidates.slice(0, 3).map((candidate) => <div className={styles.scenario} key={candidate.decisionId}><small>{candidate.title}</small><strong>{candidate.alternatives[0]?.name ?? (ko?"대안":"Alternative")}</strong><p>{candidate.alternatives[0]?.whenBetter ?? (ko?"조건 변화 시":"When conditions change")} · {candidate.alternatives[0]?.reason ?? ""}</p><b>{candidate.alternatives.length} {ko?"개 대안":"alternatives"}</b></div>) : <div className={styles.scenario}><small>{ko?"데이터 대기":"WAITING FOR DATA"}</small><strong>{ko?"아직 시뮬레이션 후보가 없습니다.":"No scenario candidates yet."}</strong><p>{ko?"AI 판단에서 실제 대안이 생성되면 여기에 모입니다.":"Real alternatives generated by decisions will appear here."}</p></div>}
        </div>
      </div>

      {premium.riskFlags.length ? <div className={styles.premiumSignalGrid}>{premium.riskFlags.slice(0, 3).map((flag, index) => <div key={flag}><span>{ko?"주의":"Risk"} {index + 1}</span><strong>{ko?"확인 필요":"Needs verification"}</strong><p>{flag}</p></div>)}</div> : null}


    </section>
  );
}

function CenteredState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return <section className={styles.reportShell}><div style={{ minHeight: 360, display: "grid", placeItems: "center", padding: 24 }}><div style={{ maxWidth: 560, display: "grid", justifyItems: "center", gap: 10, textAlign: "center" }}><span style={{ display: "grid", placeItems: "center", width: 50, height: 50, borderRadius: "50%", background: "var(--surface)", color: "var(--blue)" }}>{icon}</span><h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2><p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.7 }}>{body}</p>{action}</div></div></section>;
}

function placeholderMetrics(monthly: boolean) { return []; }
