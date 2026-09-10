"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, Coins, Flame, Gift, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePreferences } from "@/components/preferences-provider";

type Summary = {
  today: string;
  checkedToday: boolean;
  streak: number;
  bonusCredits: number;
  monthlyCap: number;
  latestReward: number;
  creditedReward: number;
  wheelReward: number;
  bonusReward: number;
  nextMilestone: number | null;
  week: Array<{
    date: string;
    weekday: string;
    day: number;
    checked: boolean;
    isToday: boolean;
  }>;
};

const rewardAngles: Record<number, number> = {
  1: 0,
  2: 60,
  3: 120,
  4: 180,
  5: 240,
  10: 300,
};

function kstDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function useKstClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now), [now]);
}

export function AttendanceClient({ compact = false }: { compact?: boolean }) {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [rewardReveal, setRewardReveal] = useState<number | null>(null);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const wheelAnimationRef = useRef<Animation | null>(null);
  const [error, setError] = useState("");
  const clock = useKstClock();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/attendance", { cache: "no-store" });
      const payload = (await response.json()) as Summary & { error?: string };
      if (response.status === 401) {
        window.location.assign("/login?return_to=%2Fattendance");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "출석 정보를 불러오지 못했습니다.");
      setSummary(payload);
      setRewardReveal(payload.checkedToday ? payload.wheelReward : null);
      if (payload.checkedToday && payload.wheelReward > 0) {
        const landing = rewardAngles[payload.wheelReward] ?? 0;
        setSpinDegrees((360 - landing) % 360);
      }
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "출석 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      wheelAnimationRef.current?.cancel();
      wheelAnimationRef.current = null;
    };
  }, [load]);

  // At KST midnight, refresh the server-backed date/streak without reloading the page.
  useEffect(() => {
    if (!summary) return;
    const id = window.setInterval(() => {
      if (kstDate() !== summary.today) void load();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [load, summary]);

  async function submit() {
    if (submitting || revealing || summary?.checkedToday) return;
    setSubmitting(true);
    setRewardReveal(null);
    setError("");

    try {
      const response = await fetch("/api/attendance", { method: "POST" });
      const payload = (await response.json()) as Summary & { error?: string };
      if (response.status === 401) {
        window.location.assign("/login?return_to=%2Fattendance");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "출석 처리에 실패했습니다.");

      setSummary(payload);

      if (payload.wheelReward <= 0) {
        setRewardReveal(null);
        toast.success("출석 완료 · 이번 달 무료 크레딧 한도 도달");
        return;
      }

      const landing = rewardAngles[payload.wheelReward] ?? 0;
      const currentNormalized = ((spinDegrees % 360) + 360) % 360;
      const desired = (360 - landing) % 360;
      const correction = (desired - currentNormalized + 360) % 360;
      // Six full turns keeps the motion obvious even on high-refresh-rate displays.
      const target = spinDegrees + (360 * 6) + correction;
      const wheel = wheelRef.current;

      setRevealing(true);
      wheelAnimationRef.current?.cancel();

      if (wheel) {
        const animation = wheel.animate(
          [
            { transform: `rotate(${spinDegrees}deg)` },
            { transform: `rotate(${target}deg)` },
          ],
          {
            duration: 3400,
            easing: "cubic-bezier(.08,.72,.12,1)",
            fill: "forwards",
          },
        );
        wheelAnimationRef.current = animation;
        try {
          await animation.finished;
        } catch {
          // A cancelled animation is replaced by the final React transform below.
        }
        setSpinDegrees(target);
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        animation.cancel();
        if (wheelAnimationRef.current === animation) wheelAnimationRef.current = null;
      } else {
        // Defensive fallback: still delay the reveal if the wheel node is unavailable.
        await new Promise<void>((resolve) => window.setTimeout(resolve, 3400));
        setSpinDegrees(target);
      }

      setRewardReveal(payload.wheelReward);
      const rawReward = payload.wheelReward + payload.bonusReward;
      toast.success(
        payload.creditedReward < rawReward
          ? `당첨 ${rawReward}C · 월 한도 적용으로 ${payload.creditedReward}C 지급`
          : payload.bonusReward > 0
            ? `출석 완료 · 룰렛 ${payload.wheelReward}C + 연속 보상 ${payload.bonusReward}C`
            : `출석 완료 · 룰렛 ${payload.wheelReward}C`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "출석 처리에 실패했습니다.");
    } finally {
      setRevealing(false);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={compact ? "attendance-card attendance-card--compact" : "attendance-card"}>
        <div className="attendance-loading"><LoaderCircle className="spin" size={24} /> 실제 출석 기록 확인 중</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={compact ? "attendance-card attendance-card--compact" : "attendance-card"}>
        <div className="attendance-error">
          <strong>출석 기록을 불러오지 못했습니다.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); void load(); }}>다시 시도</button>
        </div>
      </div>
    );
  }

  const wheelStyle = { "--wheel-rotation": `${spinDegrees}deg` } as CSSProperties;

  return (
    <section className={compact ? "attendance-card attendance-card--compact" : "attendance-card"}>
      <div className="attendance-head">
        <div>
          <span className="section-kicker"><CalendarCheck size={14} /> {ko ? "출석 룰렛" : "DAILY WHEEL"}</span>
          <h2>{summary.checkedToday ? (ko ? "오늘 룰렛 완료" : "Today’s wheel is done") : (ko ? "오늘의 룰렛" : "Today’s wheel")}</h2>
          <p>{ko ? "하루 한 번. 실제 참여한 날만 출석으로 기록됩니다." : "Once a day. Only an actual spin counts as attendance."}</p>
          <div className="kst-clock" aria-live="off"><span>KST</span>{clock}</div>
        </div>
        <div className="streak-counter">
          <span><Flame size={16} /> {ko ? "현재 연속" : "Streak"}</span>
          <strong>{summary.streak}<small>{ko ? "일" : " days"}</small></strong>
        </div>
      </div>

      <div className="roulette-stage roulette-stage--premium">
        <div className="roulette-wrap">
          <div className="roulette-pointer" aria-hidden="true" />
          <div
            ref={wheelRef}
            className={revealing ? "roulette-wheel roulette-wheel--premium is-landing" : "roulette-wheel roulette-wheel--premium"}
            role="img"
            aria-label="1, 2, 3, 4, 5, 10 크레딧 출석 룰렛"
            style={wheelStyle}
          >
            <span className="roulette-label roulette-label--one">1C</span>
            <span className="roulette-label roulette-label--two">2C</span>
            <span className="roulette-label roulette-label--three">3C</span>
            <span className="roulette-label roulette-label--four">4C</span>
            <span className="roulette-label roulette-label--five">5C</span>
            <span className="roulette-label roulette-label--ten">10C</span>
            <i>{revealing ? <LoaderCircle size={26} /> : rewardReveal !== null ? <><Sparkles size={18} /><b>{rewardReveal}C</b></> : <Gift size={27} />}</i>
          </div>
        </div>

        <div className="roulette-action">
          <span className="roulette-status-label">{summary.checkedToday ? (ko ? "TODAY COMPLETE" : "TODAY COMPLETE") : (ko ? "READY" : "READY")}</span>
          <strong>{rewardReveal !== null ? (ko ? `${rewardReveal}C 당첨` : `You won ${rewardReveal}C`) : revealing ? (ko ? "결과 확인 중" : "Revealing result") : (ko ? "오늘 받을 크레딧은?" : "What will you get today?")}</strong>
          {summary.checkedToday && summary.bonusReward > 0 ? <div className="streak-bonus-note">+ {ko ? `연속 출석 보상 ${summary.bonusReward}C` : `Streak bonus ${summary.bonusReward}C`}</div> : null}
          {summary.checkedToday && summary.creditedReward < summary.wheelReward + summary.bonusReward ? <div className="credit-cap-note">{ko ? `당첨 합계 ${summary.wheelReward + summary.bonusReward}C 중 월 한도 적용으로 ${summary.creditedReward}C 지급` : `${summary.wheelReward + summary.bonusReward}C won; ${summary.creditedReward}C credited after the monthly cap`}</div> : null}
          <button type="button" onClick={submit} disabled={summary.checkedToday || submitting || revealing}>
            {submitting ? (ko ? "결과 생성 중" : "Getting result") : revealing ? (ko ? "돌아가는 중" : "Spinning") : summary.checkedToday ? <><Check size={18} /> {ko ? "오늘 참여 완료" : "Completed today"}</> : (ko ? "룰렛 돌리기" : "Spin the wheel")}
          </button>
          <p>{ko ? `이번 달 보너스는 최대 ${summary.monthlyCap}C. 새로고침·중복 클릭으로 재지급되지 않습니다.` : `Up to ${summary.monthlyCap}C per month. Refreshes and duplicate clicks cannot issue another reward.`}</p>
          <div className="roulette-odds" aria-label={ko ? "룰렛 확률" : "Wheel odds"}>
            <span><b>1C</b><em>50%</em></span>
            <span><b>2C</b><em>25%</em></span>
            <span><b>3C</b><em>15%</em></span>
            <span><b>4C</b><em>9%</em></span>
            <span><b>5C</b><em>0.9%</em></span>
            <span><b>10C</b><em>0.1%</em></span>
          </div>
          <small className="roulette-odds-note">{ko ? "휠 조각은 보기 쉽게 6등분하며, 실제 당첨은 위 확률로 서버에서 결정됩니다." : "The wheel is visually split into six equal sections; server-side odds determine the actual reward."}</small>
        </div>
      </div>

      <div className="attendance-stats">
        <div><Coins size={18} /><span>{ko ? "이번 달 보너스" : "Monthly bonus"}</span><strong>{summary.bonusCredits}C</strong><small>/ {summary.monthlyCap}C</small></div>
        <div><Gift size={18} /><span>{ko ? "다음 마일스톤" : "Next milestone"}</span><strong>{summary.nextMilestone ? `${summary.nextMilestone}${ko ? "일" : " days"}` : (ko ? "완주" : "Complete")}</strong></div>
      </div>

      <div className="week-track">
        {summary.week.map((day) => (
          <div className={[day.checked ? "checked" : "", day.isToday ? "today" : ""].filter(Boolean).join(" ")} key={day.date}>
            <span>{day.weekday}</span>
            <strong>{day.day}</strong>
            <i>{day.checked ? <Check size={15} /> : null}</i>
          </div>
        ))}
      </div>

      <p className="attendance-footnote">{ko ? "출석·크레딧은 서버에서 계정별로 안전하게 관리됩니다." : "Attendance and credits are stored securely per account."}</p>
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
}
