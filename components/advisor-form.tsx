"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  ImageIcon,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import type { DecisionAnswers, DecisionDraft, UserModelPayload } from "@/lib/buysor-types";

const steps = [
  {
    id: "purpose",
    eyebrow: { ko: "이번 구매의 목적", en: "THIS PURCHASE" },
    title: { ko: "이번 제품으로 가장 먼저 해결할 일은?", en: "What should this purchase solve first?" },
    help: { ko: "평소 취향이 아니라 이번 구매에서 가장 중요한 실제 목적을 고르세요.", en: "Choose the real job this purchase must solve first." },
    icon: Target,
    options: [
      { id: "work", ko: "업무 · 학업 효율", en: "Work · study" },
      { id: "creative", ko: "콘텐츠 · 디자인", en: "Content · design" },
      { id: "performance", ko: "고성능 작업 · 게임", en: "Gaming · heavy work" },
      { id: "replace", ko: "고장·노후 제품 교체", en: "Replace old/broken gear" },
      { id: "comfort", ko: "생활 편의 개선", en: "Improve convenience" },
      { id: "other", ko: "직접 설명할게요", en: "Something else" },
    ],
  },
  {
    id: "budget",
    eyebrow: { ko: "이번 구매 예산", en: "BUDGET" },
    title: { ko: "이번에는 어느 정도까지 쓰는 게 편한가요?", en: "What feels comfortable for this purchase?" },
    help: { ko: "정밀 프로필의 평소 지출 성향과 별개로, 이번 구매에 실제로 쓸 수 있는 범위를 확인합니다.", en: "This is the real budget for this specific purchase." },
    icon: CircleDollarSign,
    options: [
      { id: "under-300", ko: "30만원 이하", en: "Under ₩300K" },
      { id: "300-500", ko: "30~50만원", en: "₩300K–₩500K" },
      { id: "500-1000", ko: "50~100만원", en: "₩500K–₩1M" },
      { id: "1000-2000", ko: "100~200만원", en: "₩1M–₩2M" },
      { id: "2000-4000", ko: "200~400만원", en: "₩2M–₩4M" },
      { id: "flexible", ko: "가치가 있으면 조정 가능", en: "Flexible if worth it" },
    ],
  },
  {
    id: "current",
    eyebrow: { ko: "현재 상황", en: "CURRENT SETUP" },
    title: { ko: "지금 비슷한 제품을 이미 쓰고 있나요?", en: "Do you already own something similar?" },
    help: { ko: "이미 가진 제품으로 해결 가능한지 먼저 보기 위해 묻습니다. 불필요한 교체를 막는 핵심 질문입니다.", en: "This helps avoid unnecessary replacement." },
    icon: PackageOpen,
    options: [
      { id: "none", ko: "없음 · 첫 구매", en: "No · first purchase" },
      { id: "works", ko: "있고 아직 쓸 만함", en: "Yes · still usable" },
      { id: "uncomfortable", ko: "있지만 명확한 불편이 있음", en: "Yes · clear pain point" },
      { id: "broken", ko: "고장 · 교체 필요", en: "Broken · replacement needed" },
      { id: "upgrade", ko: "문제는 없지만 업그레이드 고민", en: "Upgrade consideration" },
    ],
  },
  {
    id: "condition",
    eyebrow: { ko: "신품 · 중고", en: "CONDITION" },
    title: { ko: "이번 구매에서 중고도 후보에 넣을까요?", en: "Should used products be considered?" },
    help: { ko: "중고를 허용하면 감가와 실구매비가 크게 달라질 수 있습니다. 단, 상태·보증 위험도 함께 판단합니다.", en: "Used products can change value substantially, with condition and warranty risk considered." },
    icon: ShieldCheck,
    options: [
      { id: "new-only", ko: "신품만", en: "New only" },
      { id: "new-preferred", ko: "신품 우선, 좋은 중고면 가능", en: "Prefer new" },
      { id: "used-ok", ko: "상태 좋으면 중고도 적극 고려", en: "Used is fine" },
      { id: "best-value", ko: "신품·중고 상관없이 최적 가치", en: "Best value either way" },
    ],
  },
  {
    id: "timing",
    eyebrow: { ko: "구매 시점", en: "TIMING" },
    title: { ko: "언제까지 필요하나요?", en: "When do you need it?" },
    help: { ko: "WAIT 판단이 가능한지 결정합니다. 지금 제품으로 버틸 수 있는 기간에 가깝게 선택하세요.", en: "This determines whether WAIT is a realistic option." },
    icon: Clock3,
    options: [
      { id: "today", ko: "오늘 · 바로 필요", en: "Today" },
      { id: "week", ko: "이번 주 안", en: "This week" },
      { id: "month", ko: "한 달 안", en: "Within a month" },
      { id: "quarter", ko: "세 달 안", en: "Within three months" },
      { id: "flexible", ko: "급하지 않음 · 기다릴 수 있음", en: "No rush" },
    ],
  },
] as const;

export function AdvisorForm() {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DecisionAnswers>({});
  const [note, setNote] = useState("");
  const [profile, setProfile] = useState<UserModelPayload | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const current = steps[step];
  const selected = answers[current.id as keyof DecisionAnswers];

  useEffect(() => {
    try {
      const rawDraft = sessionStorage.getItem("buysor-draft");
      if (!rawDraft) {
        setLoadError(ko ? "제품 입력 정보가 없습니다. Lens나 카테고리에서 다시 시작해 주세요." : "No product input found. Start again from Lens or Category.");
        return;
      }
      setDraft(JSON.parse(rawDraft) as DecisionDraft);

      const rawAnswers = sessionStorage.getItem("buysor-answers");
      if (rawAnswers) {
        const parsed = JSON.parse(rawAnswers) as { answers?: DecisionAnswers; note?: string };
        if (parsed.answers) setAnswers(parsed.answers);
        if (typeof parsed.note === "string") setNote(parsed.note);
      }
    } catch {
      setLoadError(ko ? "이전 입력을 읽지 못했습니다. 다시 시작해 주세요." : "Could not read the previous input.");
    }

    let active = true;
    async function loadProfile() {
      try {
        const auth = await fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()) as { authenticated?: boolean };
        if (!active) return;
        setAuthenticated(Boolean(auth.authenticated));
        if (auth.authenticated) {
          const response = await fetch("/api/profile", { cache: "no-store" });
          if (response.ok) {
            const data = await response.json() as UserModelPayload;
            if (active) setProfile(data);
            return;
          }
        }
      } catch {}

      try {
        const raw = localStorage.getItem("buysor-user-model");
        if (raw && active) setProfile(JSON.parse(raw) as UserModelPayload);
      } catch {}
    }
    void loadProfile();
    return () => { active = false; };
  }, [ko]);

  const profileReady = Boolean(profile && profile.completion > 0);
  const profileDetails = useMemo(() => {
    if (!profileReady || !profile) return [];
    const parts: string[] = [];
    if (profile.stateText) parts.push("현재 상태");
    if (Object.keys(profile.survey ?? {}).length) parts.push(`정밀 프로필 ${profile.completion}%`);
    if (profile.structuredState) parts.push("AI 구조화 상태");
    return parts;
  }, [profile, profileReady]);

  function select(value: string) {
    setAnswers((previous) => ({ ...previous, [current.id]: value }));
  }

  function next() {
    if (!selected) return;
    const payload = { answers: { ...answers, note }, note };
    try { sessionStorage.setItem("buysor-answers", JSON.stringify(payload)); } catch {}
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    window.location.assign("/decision");
  }

  if (loadError) {
    return (
      <section className="advisor-panel">
        <div className="advisor-question">
          <h1>{loadError}</h1>
          <div className="advisor-footer"><a href="/lens">{ko ? "Lens로 돌아가기" : "Back to Lens"}</a></div>
        </div>
      </section>
    );
  }

  return (
    <section className="advisor-panel">
      <div className="advisor-summary">
        <span>{ko ? "분석 대상" : "PRODUCT"}</span>
        <strong>{draft?.value || (ko ? "제품 정보" : "Product")}</strong>
        {draft?.imageDataUrl ? <img src={draft.imageDataUrl} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} /> : null}
        <button type="button" onClick={() => history.back()}><ArrowLeft size={15} /> {ko ? "바꾸기" : "Change"}</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", marginBottom: 18 }}>
        <UserRound size={17} style={{ color: "var(--blue)" }}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 12 }}>{profileReady ? (ko ? "USER MODEL 반영 준비 완료" : "USER MODEL ready") : (ko ? "USER MODEL 없이도 진행 가능" : "You can continue without a profile")}</strong>
          <span style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.4 }}>{profileReady ? profileDetails.join(" · ") : (ko ? "프로필을 만들면 같은 질문을 반복하지 않고 더 개인화된 판단을 합니다." : "A profile makes the decision more personal.")}</span>
        </div>
        {!profileReady ? <a href="/profile" style={{ fontSize: 11, fontWeight: 800, color: "var(--blue)", whiteSpace: "nowrap" }}>{ko ? "프로필 만들기" : "Build profile"}</a> : null}
      </div>

      <div className="advisor-progress" aria-label={`질문 ${step + 1} / ${steps.length}`}>
        {steps.map((item, index) => <i className={index <= step ? "active" : ""} key={item.id} />)}
      </div>

      <div className="advisor-question">
        <span className="question-icon"><current.icon size={22} /></span>
        <p>{ko ? current.eyebrow.ko : current.eyebrow.en} · {step + 1}/{steps.length}</p>
        <h1>{ko ? current.title.ko : current.title.en}</h1>
        <small style={{ display: "block", margin: "-4px 0 18px", color: "var(--muted)", lineHeight: 1.6 }}>{ko ? current.help.ko : current.help.en}</small>

        <div className="option-grid">
          {current.options.map((option) => (
            <button
              className={selected === option.id ? "selected" : ""}
              key={option.id}
              type="button"
              onClick={() => select(option.id)}
            >
              <span>{ko ? option.ko : option.en}</span>
              <i>{selected === option.id ? <Check size={16} /> : null}</i>
            </button>
          ))}
        </div>

        {step === steps.length - 1 ? (
          <label className="advisor-note">
            <span>{ko ? "이번 구매에서 꼭 반영할 내용" : "Anything else"} <small>{ko ? "선택" : "Optional"}</small></span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={ko ? "예: 1.5kg 이하여야 함, 특정 프로그램 필수, 중고는 배터리 상태 90% 이상만, 다음 달 이사 예정 등" : "e.g. must be under 1.5kg, specific software required..."} maxLength={1000} />
          </label>
        ) : null}
      </div>

      <div className="advisor-footer">
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>{ko ? "이전" : "Back"}</button>
        <button className="primary" type="button" disabled={!selected} onClick={next}>
          {step === steps.length - 1 ? <><Sparkles size={16}/>{ko ? "최종 판단으로" : "Create decision"}</> : (ko ? "다음 질문" : "Next")} <ArrowRight size={17} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, color: "var(--muted)", fontSize: 11 }}>
        {draft?.imageDataUrl ? <ImageIcon size={14}/> : <ShieldCheck size={14}/>}<span>{authenticated ? (ko ? "로그인 계정의 USER MODEL과 함께 판단합니다." : "Your account profile will be applied.") : (ko ? "로그인 전에도 입력은 유지됩니다. 최종 판단 저장은 로그인 후 진행합니다." : "Inputs are preserved; sign in to save the final decision.")}</span>
      </div>
    </section>
  );
}
