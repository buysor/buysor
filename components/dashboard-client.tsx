"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Camera, Coins, Flame, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { PreferencesPanel } from "@/components/preferences-panel";
import { usePreferences } from "@/components/preferences-provider";

type Summary = {
  checkedToday: boolean;
  streak: number;
  bonusCredits: number;
  monthlyCap: number;
  nextMilestone: number | null;
};

export function DashboardClient() {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/attendance", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("summary unavailable");
        return response.json() as Promise<Summary>;
      })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="dashboard-grid">
      <a className="dashboard-primary" href="/lens">
        <div>
          <span className="section-kicker section-kicker--light"><Camera size={14} /> {ko ? "새 구매 판단" : "NEW DECISION"}</span>
          <h2>{ko ? <>사진으로 바로<br />시작하세요.</> : <>Start with<br />a photo.</>}</h2>
          <p>{ko ? "모델명을 몰라도 Lens가 제품 단서부터 찾습니다." : "Lens finds product clues even when you do not know the model."}</p>
        </div>
        <span className="dashboard-primary-action">{ko ? "Lens 열기" : "Open Lens"} <ArrowRight size={17} /></span>
        <div className="dashboard-scan"><Camera size={48} /></div>
      </a>

      <article className="stat-card credit-card">
        <span><Coins size={18} /> {ko ? "사용 가능한 보너스" : "Bonus credits"}</span>
        {summary ? <strong>{summary.bonusCredits}<small>C</small></strong> : loaded ? <strong>—</strong> : <LoaderCircle className="spin" size={25} />}
        <p>{summary ? (ko ? `이번 달 최대 ${summary.monthlyCap}C` : `${summary.monthlyCap}C monthly cap`) : loaded ? (ko ? "잔액을 확인할 수 없음" : "Balance unavailable") : (ko ? "실제 잔액 확인 중" : "Checking balance")}</p>
      </article>

      <a className="stat-card streak-card" href="/attendance">
        <span><Flame size={18} /> {ko ? "연속 출석" : "Daily streak"}</span>
        {summary ? <strong>{summary.streak}<small>일</small></strong> : loaded ? <strong>—</strong> : <LoaderCircle className="spin" size={25} />}
        <p>{summary?.checkedToday ? (ko ? "오늘 룰렛 완료" : "Wheel completed") : loaded && !summary ? (ko ? "기록을 다시 확인" : "Check again") : (ko ? "오늘의 룰렛 돌리기" : "Spin today’s wheel")} <ArrowRight size={14} /></p>
      </a>

      <a className="stat-card" href="/profile">
        <span><UserRound size={18} /> {ko ? "구매 프로필" : "Decision profile"}</span>
        <strong>9<small>단계</small></strong>
        <p>{ko ? "지금 내 상태 · 정밀 설문 이어가기" : "Continue profile and survey"} <ArrowRight size={14} /></p>
      </a>

      <a className="stat-card" href="/reports/weekly">
        <span><CalendarDays size={18} /> {ko ? "주간 리포트" : "Weekly report"}</span>
        <strong><LockKeyhole size={34} /></strong>
        <p>{ko ? "월 구독 전용 · 잠금 미리보기" : "Monthly subscription · preview"} <ArrowRight size={14} /></p>
      </a>

      <a className="stat-card" href="/reports/monthly">
        <span><CalendarDays size={18} /> {ko ? "월간 리포트" : "Monthly report"}</span>
        <strong><LockKeyhole size={34} /></strong>
        <p>{ko ? "성향 변화 · 만족도 · 구매 계획" : "Trends, satisfaction, purchase plan"} <ArrowRight size={14} /></p>
      </a>

      <article className="empty-card profile-card">
        <div><span className="section-kicker">MY DECISION PROFILE</span><h2>바이저가 이해하는 나</h2></div>
        <div className="empty-state"><span>구매 기준을 직접 채워보세요.</span><p>현재 상황과 정밀 프로필이 쌓이면 예산, 용도, 선호, 보유 제품, 미래 계획을 다음 판단에 반영합니다. <a href="/profile">프로필 설정 →</a></p></div>
      </article>

      <article className="empty-card history-card">
        <div><span className="section-kicker">DECISION HISTORY</span><h2>최근 구매 결정</h2></div>
        <div className="empty-state"><span>저장된 결정이 없습니다.</span><p>첫 구매 판단이 끝나면 결과와 근거를 다시 볼 수 있습니다.</p></div>
      </article>

      <PreferencesPanel />
    </div>
  );
}
