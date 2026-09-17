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
import styles from "./buysor-features.module.css";

type ReportClientProps = { type: "weekly" | "monthly" };
type LoadState = "loading" | "guest" | "ready" | "error";

export function ReportClient({ type }: ReportClientProps) {
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
      const response = await fetch(`/api/reports?period=${type}`, { cache: "no-store" });
      const payload = await response.json() as ReportData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "리포트를 불러오지 못했습니다.");
      setData(payload);
      setState("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "리포트를 불러오지 못했습니다.");
      setState("error");
    }
  }, [type]);

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
          <h1>{isMonthly ? "월간 리포트" : "주간 리포트"}</h1>
        </div>
        <p>{isMonthly
          ? "최근 30일의 실제 구매 판단을 묶어 반복 패턴, 보류 이유, 다음 우선순위를 확인합니다."
          : "최근 7일의 실제 판단을 모아 무엇을 샀고, 기다렸고, 건너뛰었는지 정리합니다."}</p>
      </section>

      {state === "loading" ? <CenteredState icon={<LoaderCircle className="spin" size={25}/>} title="리포트 불러오는 중" body="계정의 실제 구매 판단 기록을 확인하고 있습니다."/> : null}
      {state === "guest" ? <CenteredState icon={<LogIn size={25}/>} title="리포트는 로그인 계정 기준으로 만들어집니다." body="구매 판단 기록과 USER MODEL이 계정에 쌓여야 주간·월간 리포트를 정확하게 계산할 수 있습니다." action={<a className={styles.primaryButton} href={`/login?return_to=${encodeURIComponent(isMonthly ? "/reports/monthly" : "/reports/weekly")}`}><LogIn size={15}/> 로그인</a>}/> : null}
      {state === "error" ? <CenteredState icon={<ShieldCheck size={25}/>} title="리포트를 불러오지 못했습니다." body={error} action={<button className={styles.primaryButton} type="button" onClick={load}>다시 시도</button>}/> : null}

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
                <div className={styles.cardEyebrow} style={{ justifyContent: "center" }}><Sparkles size={14}/>첫 기록 대기</div>
                <h2>아직 이 기간의 구매 판단 기록이 없습니다.</h2>
                <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.7 }}>Lens, 제품명, 링크 또는 카테고리로 첫 판단을 완료하면 이 화면이 실제 데이터로 채워집니다.</p>
                <a className={styles.primaryButton} href="/lens" style={{ marginTop: 8 }}>첫 판단 시작</a>
              </article>
            ) : (
              <>
                <div className={styles.reportGrid}>
                  <article className={styles.reportCard}>
                    <div className={styles.cardEyebrow}><TrendingUp size={14}/>집중</div>
                    <h2>{isMonthly ? "최근 30일 관심 카테고리" : "이번 주 가장 많이 고민한 영역"}</h2>
                    {data.categoryBars.length ? <div className={styles.barList}>{data.categoryBars.map((item) => <div className={styles.barItem} key={item.label}><span>{item.label}</span><div className={styles.bar}><span style={{width:`${item.value}%`}}/></div><strong>{item.note}</strong></div>)}</div> : <p style={{ color: "var(--muted)", fontSize: 12 }}>아직 분류할 기록이 없습니다.</p>}
                  </article>

                  <article className={styles.reportCard}>
                    <div className={styles.cardEyebrow}><ShieldCheck size={14}/>패턴</div>
                    <h2>바이저가 찾은 반복 패턴</h2>
                    <ul className={styles.insightBullets}>{data.patterns.map((item) => <li key={item}>{item}</li>)}</ul>
                  </article>
                </div>

                <article className={styles.reportCard}>
                  <div className={styles.cardEyebrow}><Clock3 size={14}/>재확인</div>
                  <h2>{isMonthly ? "다음 달까지 다시 볼 판단" : "다시 확인할 판단"}</h2>
                  {data.recheck.length ? data.recheck.map((item) => <div className={styles.decisionRow} key={item.id}><div><strong>{item.title}</strong><span>{item.note}{item.recheckAt ? ` · ${item.recheckAt}` : ""}</span></div><span className={styles.pill}>{item.verdict ?? "REVIEW"}</span></div>) : <p style={{ color: "var(--muted)", fontSize: 12 }}>현재 재확인 대기 중인 판단이 없습니다.</p>}
                </article>

                <PremiumSection data={data} available={premiumAvailable}/>
              </>
            )}
          </div>

        </section>
      ) : null}

      <p className={styles.reportFootnote}>리포트는 저장된 실제 구매 판단 기록만 사용합니다. 기록이 없으면 숫자나 패턴을 임의로 생성하지 않습니다.</p>
    </div>
  );
}

function PremiumSection({ data, available }: { data: ReportData; available: boolean }) {
  const premium = data.premium;
  return (
    <section className={styles.premiumBlock} data-available={available}>
      <div className={styles.premiumHead}>
        <div><Crown size={17}/><span>기록 분석</span><h2>여러 구매를 하나의 우선순위로 정리</h2></div>

      </div>

      <div className={styles.premiumContent}>
        <article className={styles.strategyCard}>
          <h3>구매 우선순위</h3>
          <div className={styles.priorityList}>
            {premium.priorities.length ? premium.priorities.map((item, index) => <div className={styles.priorityRow} key={item.id}><b>{index + 1}</b><div><strong>{item.title}</strong><span>{item.reason}</span></div><em>{item.verdict} · {item.confidence}%</em></div>) : <p style={{ color: "var(--muted)", fontSize: 11 }}>완료된 판단이 쌓이면 우선순위를 계산합니다.</p>}
          </div>
        </article>

        <article className={styles.strategyCard}>
          <h3>재판단 타임라인</h3>
          <div className={styles.timeline}>
            {premium.timeline.length ? premium.timeline.map((item) => <div key={item.id}><b>{item.when}</b><span><strong>{item.title}</strong><br/>{item.action}</span></div>) : <p style={{ color: "var(--muted)", fontSize: 11 }}>WAIT 판단의 조건과 시점이 생기면 자동으로 모입니다.</p>}
          </div>
        </article>
      </div>

      <div className={styles.scenarioSection}>
        <div className={styles.scenarioTitle}><Sparkles size={15}/><strong>대안 시뮬레이션 후보</strong><span>각 구매 판단에서 실제 AI가 생성한 대안이 2개 이상 있을 때만 표시합니다.</span></div>
        <div className={styles.scenarioGrid}>
          {premium.scenarioCandidates.length ? premium.scenarioCandidates.slice(0, 3).map((candidate) => <div className={styles.scenario} key={candidate.decisionId}><small>{candidate.title}</small><strong>{candidate.alternatives[0]?.name ?? "대안"}</strong><p>{candidate.alternatives[0]?.whenBetter ?? "조건 변화 시"} · {candidate.alternatives[0]?.reason ?? ""}</p><b>{candidate.alternatives.length}개 대안</b></div>) : <div className={styles.scenario}><small>데이터 대기</small><strong>아직 시뮬레이션 후보가 없습니다.</strong><p>AI 판단에서 실제 대안이 생성되면 여기에 모입니다.</p></div>}
        </div>
      </div>

      {premium.riskFlags.length ? <div className={styles.premiumSignalGrid}>{premium.riskFlags.slice(0, 3).map((flag, index) => <div key={flag}><span>주의 {index + 1}</span><strong>확인 필요</strong><p>{flag}</p></div>)}</div> : null}


    </section>
  );
}

function CenteredState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return <section className={styles.reportShell}><div style={{ minHeight: 360, display: "grid", placeItems: "center", padding: 24 }}><div style={{ maxWidth: 560, display: "grid", justifyItems: "center", gap: 10, textAlign: "center" }}><span style={{ display: "grid", placeItems: "center", width: 50, height: 50, borderRadius: "50%", background: "var(--surface)", color: "var(--blue)" }}>{icon}</span><h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2><p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.7 }}>{body}</p>{action}</div></div></section>;
}

function placeholderMetrics(monthly: boolean) { return []; }
