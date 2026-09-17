"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Coins,
  Flame,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { PreferencesPanel } from "@/components/preferences-panel";
import { usePreferences } from "@/components/preferences-provider";
import type { DecisionHistoryItem, SubscriptionTier, UserModelPayload } from "@/lib/buysor-types";

type Summary = {
  checkedToday: boolean;
  streak: number;
  bonusCredits: number;
  monthlyCap: number;
  nextMilestone: number | null;
};

type LoadState = "loading" | "ready" | "error";

export function DashboardClient() {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [profile, setProfile] = useState<UserModelPayload | null>(null);
  const [history, setHistory] = useState<DecisionHistoryItem[]>([]);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [balance, setBalance] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      const settled = await Promise.allSettled([
        fetch("/api/commerce/status", {cache:"no-store"}).then(async r=>r.ok?r.json():null),
        fetch("/api/attendance", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<Summary> : null),
        fetch("/api/profile", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<UserModelPayload> : null),
        fetch("/api/decision?limit=6", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{items: DecisionHistoryItem[]}> : { items: [] }),
        fetch("/api/subscription", { cache: "no-store" }).then(async (response) => response.json() as Promise<{tier?: SubscriptionTier}>),
      ]);
      if (!active) return;
      if (settled[0].status === "fulfilled" && settled[0].value?.balance) setBalance(settled[0].value.balance.available);
      if (settled[1].status === "fulfilled") setSummary(settled[1].value);
      if (settled[2].status === "fulfilled") setProfile(settled[2].value);
      if (settled[3].status === "fulfilled") setHistory(settled[3].value.items ?? []);
      if (settled[4].status === "fulfilled" && settled[4].value.tier) setTier(settled[4].value.tier);
      setState(settled.some((item) => item.status === "fulfilled") ? "ready" : "error");
    }
    void load();
    return () => { active = false; };
  }, []);

  const completed = useMemo(() => history.filter((item) => item.status === "completed"), [history]);
  const recent = completed.slice(0, 4);
  const profileCompletion = profile?.completion ?? 0;
  const reportsUnlocked = true;

  return (
    <div className="dashboard-grid">
      <a className="dashboard-primary" href="/lens">
        <div>
          <span className="section-kicker section-kicker--light"><Camera size={14} /> {ko ? "새 구매 판단" : "NEW DECISION"}</span>
          <h2>{ko ? <>사진·링크·제품명으로<br />바로 시작.</> : <>Start from a photo,<br/>link or product.</>}</h2>
          <p>{ko ? "Lens에서 제품을 입력하고 USER MODEL과 이번 구매 조건을 함께 판단합니다." : "Lens combines the product with your profile and current needs."}</p>
        </div>
        <span className="dashboard-primary-action">{ko ? "구매 판단 시작" : "Start decision"} <ArrowRight size={17} /></span>
        <div className="dashboard-scan"><Camera size={48} /></div>
      </a>

      <article className="stat-card credit-card">
        <span><Coins size={18} /> {ko ? "사용 가능한 크레딧" : "Available credits"}</span>
        {balance !== null ? <strong>{balance}<small>C</small></strong> : state === "loading" ? <LoaderCircle className="spin" size={25} /> : <strong>—</strong>}
        <p>{balance !== null ? (ko ? "결제로 확인된 사용권" : "Verified credits") : "잔액 확인 중"}</p>
      </article>

      <a className="stat-card streak-card" href="/attendance">
        <span><Flame size={18} /> {ko ? "연속 출석" : "Daily streak"}</span>
        {summary ? <strong>{summary.streak}<small>{ko ? "일" : " days"}</small></strong> : state === "loading" ? <LoaderCircle className="spin" size={25} /> : <strong>—</strong>}
        <p>{summary?.checkedToday ? (ko ? "오늘 출석 완료" : "Checked in") : (ko ? "오늘 출석 기록" : "Record today")} <ArrowRight size={14} /></p>
      </a>

      <a className="stat-card" href="/profile">
        <span><UserRound size={18} /> {ko ? "USER MODEL" : "USER MODEL"}</span>
        <strong>{profileCompletion}<small>%</small></strong>
        <p>{profileCompletion > 0 ? (ko ? "현재 상태 · 정밀 프로필 이어가기" : "Continue your profile") : (ko ? "내 구매 기준 만들기" : "Build your purchase profile")} <ArrowRight size={14} /></p>
      </a>

      <a className="stat-card" href="/reports/weekly">
        <span><CalendarDays size={18} /> {ko ? "주간 리포트" : "Weekly report"}</span>
        <strong>{reportsUnlocked ? <CheckCircle2 size={34}/> : <LockKeyhole size={34} />}</strong>
        <p>{reportsUnlocked ? (ko ? `${tier === "member" ? "멤버십" : "기본"} · 최근 7일 실제 기록` : "Real 7-day report") : (ko ? "저장된 기록 요약" : "History summary")} <ArrowRight size={14} /></p>
      </a>

      <a className="stat-card" href="/reports/monthly">
        <span><CalendarDays size={18} /> {ko ? "월간 리포트" : "Monthly report"}</span>
        <strong>{reportsUnlocked ? <CheckCircle2 size={34}/> : <LockKeyhole size={34} />}</strong>
        <p>{reportsUnlocked ? (ko ? "최근 30일 패턴 · 재확인 큐" : "30-day patterns and rechecks") : (ko ? "저장된 기록 요약" : "History summary")} <ArrowRight size={14} /></p>
      </a>

      <article className="empty-card profile-card">
        <div><span className="section-kicker">MY DECISION PROFILE</span><h2>바이저가 이해하는 나</h2></div>
        {profileCompletion > 0 ? (
          <div className="empty-state">
            <span>USER MODEL {profileCompletion}% 완성</span>
            <p>{profile?.structuredState?.painPoint ? `최근 상태: ${profile.structuredState.painPoint}. ` : ""}{Object.keys(profile?.survey ?? {}).length}개 프로필 답변이 다음 구매 판단에 반영됩니다. <a href="/profile">업데이트 →</a></p>
          </div>
        ) : (
          <div className="empty-state"><span>아직 구매 기준이 비어 있습니다.</span><p>현재 상황과 정밀 프로필을 채우면 매번 같은 설명을 반복하지 않아도 됩니다. <a href="/profile">프로필 설정 →</a></p></div>
        )}
      </article>

      <article className="empty-card history-card">
        <div><span className="section-kicker">DECISION HISTORY</span><h2>최근 구매 결정</h2></div>
        {recent.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {recent.map((item) => <a href="/my" key={item.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: 11, border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)" }}><b style={{ fontSize: 10, color: item.verdict === "BUY" ? "var(--green)" : item.verdict === "WAIT" ? "var(--amber)" : "var(--red)" }}>{item.verdict}</b><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700 }}>{item.inputLabel}</span><small style={{ color: "var(--muted)", fontSize: 9 }}>{formatDate(item.createdAt)}</small></a>)}
          </div>
        ) : (
          <div className="empty-state"><span>저장된 AI 구매 결정이 없습니다.</span><p>첫 판단을 완료하면 BUY · WAIT · SKIP 결과와 근거가 계정에 쌓입니다.</p></div>
        )}
      </article>

      <PreferencesPanel />
    </div>
  );
}

function formatDate(value: number) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(value));
}
