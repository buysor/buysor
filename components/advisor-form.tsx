"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleDollarSign, Clock3, PackageOpen, Target } from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";

const steps = [
  {
    id: "purpose",
    eyebrow: { ko: "사용 목적", en: "MAIN USE" },
    title: { ko: "이 제품으로 가장 많이 할 일은?", en: "What will you use it for most?" },
    icon: Target,
    options: [
      { id: "work", ko: "업무 · 학업", en: "Work · study" },
      { id: "creative", ko: "콘텐츠 · 디자인", en: "Content · design" },
      { id: "performance", ko: "게임 · 고성능 작업", en: "Gaming · heavy work" },
      { id: "daily", ko: "일상적인 사용", en: "Everyday use" },
    ],
  },
  {
    id: "budget",
    eyebrow: { ko: "예산", en: "BUDGET" },
    title: { ko: "무리 없이 쓸 수 있는 금액은?", en: "How much can you comfortably spend?" },
    icon: CircleDollarSign,
    options: [
      { id: "under-500", ko: "50만원 이하", en: "Under ₩500K" },
      { id: "500-1000", ko: "50~100만원", en: "₩500K–₩1M" },
      { id: "1000-2000", ko: "100~200만원", en: "₩1M–₩2M" },
      { id: "over-2000", ko: "200만원 이상", en: "Over ₩2M" },
    ],
  },
  {
    id: "current",
    eyebrow: { ko: "현재 상황", en: "CURRENT SETUP" },
    title: { ko: "이미 쓰고 있는 제품이 있나요?", en: "Do you already own something similar?" },
    icon: PackageOpen,
    options: [
      { id: "none", ko: "없음 · 첫 구매", en: "No · first purchase" },
      { id: "uncomfortable", ko: "있지만 불편함", en: "Yes, but it falls short" },
      { id: "broken", ko: "고장 · 교체 필요", en: "Broken · replacement needed" },
      { id: "curious", ko: "더 좋은 제품이 궁금함", en: "Considering an upgrade" },
    ],
  },
  {
    id: "timing",
    eyebrow: { ko: "구매 시점", en: "TIMING" },
    title: { ko: "언제까지 필요하나요?", en: "When do you need it?" },
    icon: Clock3,
    options: [
      { id: "week", ko: "오늘 · 이번 주", en: "Today · this week" },
      { id: "month", ko: "한 달 안", en: "Within a month" },
      { id: "quarter", ko: "세 달 안", en: "Within three months" },
      { id: "flexible", ko: "급하지 않음", en: "No rush" },
    ],
  },
] as const;

export function AdvisorForm() {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [draft, setDraft] = useState("제품 정보");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const current = steps[step];
  const selected = answers[current.id];

  useEffect(() => {
    const saved = sessionStorage.getItem("buysor-draft");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { value?: string };
      if (parsed.value) setDraft(parsed.value);
    } catch {
      sessionStorage.removeItem("buysor-draft");
    }
  }, []);

  return (
    <section className="advisor-panel">
      <div className="advisor-summary">
        <span>{ko ? "분석 대상" : "PRODUCT"}</span>
        <strong>{draft}</strong>
        <button type="button" onClick={() => history.back()}><ArrowLeft size={15} /> {ko ? "바꾸기" : "Change"}</button>
      </div>
      <div className="advisor-progress" aria-label={`질문 ${step + 1} / ${steps.length}`}>
        {steps.map((item, index) => <i className={index <= step ? "active" : ""} key={item.id} />)}
      </div>
      <div className="advisor-question">
        <span className="question-icon"><current.icon size={22} /></span>
        <p>{ko ? current.eyebrow.ko : current.eyebrow.en} · {step + 1}/{steps.length}</p>
        <h1>{ko ? current.title.ko : current.title.en}</h1>
        <div className="option-grid">
          {current.options.map((option) => (
            <button
              className={selected === option.id ? "selected" : ""}
              key={option.id}
              type="button"
              onClick={() => setAnswers((previous) => ({ ...previous, [current.id]: option.id }))}
            >
              <span>{ko ? option.ko : option.en}</span>
              <i>{selected === option.id ? <Check size={16} /> : null}</i>
            </button>
          ))}
        </div>
        {step === steps.length - 1 ? (
          <label className="advisor-note">
            <span>{ko ? "꼭 반영할 조건" : "Anything else"} <small>{ko ? "선택" : "Optional"}</small></span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={ko ? "예: 무게가 가벼워야 하고, 중고도 괜찮아요." : "e.g. It must be light, and used is fine."} maxLength={500} />
          </label>
        ) : null}
      </div>
      <div className="advisor-footer">
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>{ko ? "이전" : "Back"}</button>
        <button
          className="primary"
          type="button"
          disabled={!selected}
          onClick={() => {
            if (step < steps.length - 1) {
              setStep((value) => value + 1);
              return;
            }
            sessionStorage.setItem("buysor-answers", JSON.stringify({ answers, note }));
          }}
        >
          {step === steps.length - 1 ? (ko ? "판단 준비 완료" : "Ready to decide") : (ko ? "다음 질문" : "Next")} <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}
