"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, MessageSquareText, SlidersHorizontal } from "lucide-react";
import styles from "./buysor-features.module.css";

type ProfileData = {
  currentProduct: string;
  painPoint: string;
  budget: string;
  usedOkay: string;
  urgency: string;
  duration: string;
  futurePlan: string;
};

type Question =
  | { id: string; label: string; kind: "choice"; options: string[] }
  | { id: string; label: string; kind: "scale"; left: string; right: string };

type SurveyStep = { title: string; description: string; questions: Question[] };

const SURVEY: SurveyStep[] = [
  {
    title: "생활",
    description: "제품이 실제 생활에서 얼마나 중요한지 확인합니다.",
    questions: [
      { id: "activity", label: "현재 생활 상태와 가장 가까운 것은?", kind: "choice", options: ["학생", "직장인", "자영업", "프리랜서", "현장직", "기타"] },
      { id: "mobility", label: "제품을 들고 이동하는 빈도", kind: "scale", left: "거의 없음", right: "매우 잦음" },
      { id: "downtime", label: "제품이 고장 나면 생활·업무에 미치는 영향", kind: "scale", left: "영향 적음", right: "업무 중단" },
    ],
  },
  {
    title: "재정",
    description: "소득을 캐묻지 않고, 실제 구매 가능한 범위를 봅니다.",
    questions: [
      { id: "budgetComfort", label: "구매할 때 가장 편한 가격대", kind: "choice", options: ["50만원 이하", "50~100만원", "100~200만원", "200~400만원", "400만원 이상", "제품마다 다름"] },
      { id: "installment", label: "할부에 대한 생각", kind: "choice", options: ["가능하면 안 함", "필요하면 사용", "월 부담이 낮으면 사용", "적극 활용"] },
      { id: "resale", label: "나중에 되팔 때 가격이 얼마나 중요한가요?", kind: "scale", left: "중요하지 않음", right: "매우 중요" },
    ],
  },
  {
    title: "취향",
    description: "사양표가 아니라 실제 선택 기준의 우선순위를 잡습니다.",
    questions: [
      { id: "performance", label: "가격보다 성능을 우선하는 정도", kind: "scale", left: "가격 우선", right: "성능 우선" },
      { id: "design", label: "성능이 비슷하다면 디자인에 더 지불할 의향", kind: "scale", left: "없음", right: "큼" },
      { id: "stability", label: "신기술과 검증된 안정성 중 선호", kind: "scale", left: "신기술", right: "안정성" },
    ],
  },
  {
    title: "보유 제품",
    description: "새 제품보다 먼저, 지금 가진 제품으로 해결 가능한지 봅니다.",
    questions: [
      { id: "replaceReason", label: "교체를 고민하는 가장 큰 이유", kind: "choice", options: ["성능 부족", "고장·노후", "배터리", "휴대성", "새 기능", "단순히 갖고 싶음"] },
      { id: "ecosystem", label: "기존 액세서리·생태계에 묶여 있는 정도", kind: "scale", left: "자유로움", right: "강하게 묶임" },
      { id: "keepOld", label: "새 제품 구매 후 기존 제품 계획", kind: "choice", options: ["판매", "계속 사용", "가족에게 전달", "보관", "폐기"] },
    ],
  },
  {
    title: "환경",
    description: "사용 장소와 물리적 제약을 반영합니다.",
    questions: [
      { id: "place", label: "주 사용 환경", kind: "choice", options: ["집", "사무실", "학교", "이동 중", "현장", "차량", "복합"] },
      { id: "harsh", label: "먼지·물·열·추위 등 거친 환경 노출", kind: "scale", left: "거의 없음", right: "매우 많음" },
      { id: "noise", label: "소음·발열·크기가 구매에 미치는 영향", kind: "scale", left: "거의 없음", right: "매우 큼" },
    ],
  },
  {
    title: "과거 구매",
    description: "후회와 만족 패턴을 다음 결정의 교정 데이터로 씁니다.",
    questions: [
      { id: "regret", label: "가장 자주 했던 구매 실수", kind: "choice", options: ["과한 사양", "싼 제품 재구매", "충동 구매", "중고 상태 실패", "AS 문제", "거의 없음"] },
      { id: "research", label: "구매 전 비교에 쓰는 시간", kind: "choice", options: ["10분 이내", "1시간", "하루", "며칠", "몇 주 이상"] },
      { id: "regretRisk", label: "구매 후 후회를 얼마나 피하고 싶은가요?", kind: "scale", left: "빠른 결정", right: "후회 최소화" },
    ],
  },
  {
    title: "미래 계획",
    description: "지금만 보지 않고 다음 3~12개월 계획을 함께 봅니다.",
    questions: [
      { id: "change", label: "12개월 안에 큰 생활 변화", kind: "choice", options: ["없음", "이사", "취업·퇴사", "입학", "해외체류", "여행", "가족 변화"] },
      { id: "wait", label: "필요하면 구매를 얼마나 미룰 수 있나요?", kind: "choice", options: ["오늘", "1주", "1개월", "3개월", "6개월 이상"] },
      { id: "ownership", label: "한 제품을 오래 쓰려는 성향", kind: "scale", left: "자주 교체", right: "오래 사용" },
    ],
  },
  {
    title: "구매 성향",
    description: "바이저가 답을 제시하는 방식까지 개인화합니다.",
    questions: [
      { id: "risk", label: "새 제품·중고·검증 부족 제품에 대한 위험 회피", kind: "scale", left: "위험 감수", right: "안전 우선" },
      { id: "used", label: "중고 제품 수용도", kind: "scale", left: "신품만", right: "상태만 좋으면 가능" },
      { id: "answerStyle", label: "바이저에게 원하는 답변 방식", kind: "choice", options: ["하나만 골라줘", "2~3개 후보", "근거를 길게", "결론부터", "상황별 시나리오"] },
    ],
  },
  {
    title: "카테고리",
    description: "카테고리 진입 시 필요한 추가 질문만 이어서 묻습니다.",
    questions: [
      { id: "category", label: "가장 자주 고민하는 고관여 카테고리", kind: "choice", options: ["노트북", "스마트폰", "자동차", "전동공구", "가전", "기타"] },
      { id: "categoryDepth", label: "전문적인 세부 질문을 얼마나 받아도 괜찮나요?", kind: "scale", left: "핵심만", right: "끝까지 세세하게" },
      { id: "simulation", label: "3개 이상 대안 시뮬레이션이 필요한 정도", kind: "scale", left: "한 결론", right: "여러 시나리오" },
    ],
  },
];

const DEFAULT_TEXT = "다음 달 이사 예정이고 예산은 150만원 정도예요. 현재 M1 맥북에어를 쓰는데 영상편집이 느리고, 중고도 괜찮아요. 급하지 않아서 한두 달 기다릴 수 있고 2~3년은 쓰고 싶어요.";

function inferProfile(text: string): ProfileData {
  const budgetMatch = text.match(/(\d{2,4})\s*만원/);
  const lower = text.toLowerCase();
  let currentProduct = "확인 필요";
  if (lower.includes("m1") && lower.includes("맥북")) currentProduct = "M1 MacBook Air";
  else if (text.includes("맥북")) currentProduct = "MacBook";
  else if (text.includes("아이폰")) currentProduct = "iPhone";
  else if (text.includes("갤럭시")) currentProduct = "Galaxy";

  let painPoint = "직접 확인 필요";
  if (text.includes("영상") && (text.includes("느리") || text.includes("성능"))) painPoint = "영상 편집 성능";
  else if (text.includes("배터리")) painPoint = "배터리";
  else if (text.includes("고장")) painPoint = "고장·노후";

  return {
    currentProduct,
    painPoint,
    budget: budgetMatch ? `약 ${budgetMatch[1]}만원` : "확인 필요",
    usedOkay: text.includes("중고") && (text.includes("괜찮") || text.includes("가능")) ? "가능" : "확인 필요",
    urgency: text.includes("급하지") || text.includes("기다릴") ? "낮음 · 대기 가능" : "확인 필요",
    duration: /2\s*[~～-]\s*3년/.test(text) || text.includes("2~3년") ? "2~3년" : "확인 필요",
    futurePlan: text.includes("이사") ? "이사 예정" : text.includes("해외") ? "해외 체류 예정" : "확인 필요",
  };
}

export function PersonalizationBanner() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("buysor-preview-survey");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string | number>;
      const answered = Object.keys(parsed).length;
      setProgress(Math.min(100, Math.round((answered / 27) * 100)));
    } catch {}
  }, []);

  return (
    <section className={styles.personalBanner}>
      <div>
        <span className="section-kicker">PERSONAL DECISION MODEL</span>
        <h2>바이저가 나를 더 정확히 이해하게 만들기</h2>
        <p>지금 상황과 구매 기준을 알려주면 같은 제품이라도 당신에게 맞는 결론으로 판단합니다.</p>
        <div className={styles.bannerActions}>
          <a className={styles.primaryButton} href="/profile?tab=state"><MessageSquareText size={16}/> 지금 내 상태 말하기</a>
          <a className={styles.secondaryButton} href="/profile?tab=survey"><SlidersHorizontal size={16}/> 정밀 구매 프로필 설정</a>
        </div>
      </div>
      <div className={styles.profileSummary}>
        <div className={styles.summaryRow}><span>구매 프로필 완성도</span><strong>{progress}%</strong></div>
        <div className={styles.progressTrack}><span style={{ width: `${progress}%` }}/></div>
        <div className={styles.summaryRow}><span>상태</span><span>{progress > 0 ? "작성 중 · 이어하기 가능" : "아직 시작하지 않음"}</span></div>
      </div>
    </section>
  );
}

export function UserModelClient() {
  const [tab, setTab] = useState<"state" | "survey">("state");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [profile, setProfile] = useState<ProfileData>(() => inferProfile(DEFAULT_TEXT));
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "survey") setTab("survey");
    try {
      const savedText = localStorage.getItem("buysor-preview-state");
      const savedAnswers = localStorage.getItem("buysor-preview-survey");
      if (savedText) {
        setText(savedText);
        setProfile(inferProfile(savedText));
      }
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers) as Record<string, string | number>);
    } catch {}
  }, []);

  const current = SURVEY[step];
  const progress = Math.round(((step + 1) / SURVEY.length) * 100);
  const traits = useMemo(() => {
    const n = (id: string, fallback: number) => Number(answers[id] ?? fallback);
    return [
      ["가격 민감도", 100 - n("performance", 55)],
      ["성능 우선도", n("performance", 55)],
      ["위험 회피도", n("risk", 68)],
      ["장기 보유 성향", n("ownership", 76)],
      ["중고 수용도", n("used", 64)],
      ["재판매 중요도", n("resale", 62)],
    ] as Array<[string, number]>;
  }, [answers]);

  function analyze() {
    const inferred = inferProfile(text);
    setProfile(inferred);
    setConfirmed(false);
    try { localStorage.setItem("buysor-preview-state", text); } catch {}
  }

  function saveAnswer(id: string, value: string | number) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      try { localStorage.setItem("buysor-preview-survey", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const rows: Array<[string, string]> = [
    ["현재 제품", profile.currentProduct],
    ["주요 불만", profile.painPoint],
    ["편안한 예산", profile.budget],
    ["중고 구매", profile.usedOkay],
    ["구매 긴급도", profile.urgency],
    ["예상 사용기간", profile.duration],
    ["미래 계획", profile.futurePlan],
  ];

  return (
    <div className={styles.profilePage}>
      <section className={styles.profileHero}>
        <div><span className="section-kicker">MY USER MODEL</span><h1>나를 이해할수록<br/>판단은 더 정확해집니다.</h1></div>
        <p>설문을 많이 받는 것이 목적이 아닙니다. 제품 정보와 현재 상황, 보유 제품, 환경, 과거 경험, 예산, 미래 계획을 하나의 USER MODEL로 묶어 다음 구매 판단에 사용합니다.</p>
      </section>

      <div className={styles.tabs}>
        <button data-active={tab === "state"} onClick={() => setTab("state")}>지금 내 상태 말하기</button>
        <button data-active={tab === "survey"} onClick={() => setTab("survey")}>정밀 구매 프로필</button>
      </div>

      {tab === "state" ? (
        <section className={styles.profilePanel}>
          <article className={styles.editorCard}>
            <h2>지금 어떤 상황인가요?</h2>
            <p>형식 없이 편하게 말하세요. 원문은 그대로 보존하고, 구조화 결과는 확인받은 뒤 사용자 모델에 반영합니다.</p>
            <textarea className={styles.stateTextarea} value={text} onChange={(event) => setText(event.target.value)} />
            <div className={styles.editorFooter}><small>예산 · 보유 제품 · 불만 · 중고 가능 여부 · 구매 시점 · 미래 계획을 함께 말하면 정확도가 올라갑니다.</small><button onClick={analyze}>바이저가 이해하기</button></div>
          </article>
          <aside className={styles.insightCard}>
            <div className={styles.insightCardHead}><strong>바이저가 이렇게 이해했습니다</strong>{confirmed && <span className={styles.confirmed}><CheckCircle2 size={14}/> 확인됨</span>}</div>
            <div className={styles.insightList}>{rows.map(([label, value]) => <div className={styles.insightRow} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
            <div className={styles.confirmActions}><button onClick={() => setConfirmed(false)}>수정하기</button><button onClick={() => setConfirmed(true)}>맞아요, 저장</button></div>
          </aside>
        </section>
      ) : (
        <>
          <section className={styles.surveyCard}>
            <div className={styles.surveyTop}><span>{String(step + 1).padStart(2, "0")} / {String(SURVEY.length).padStart(2, "0")} · {current.title}</span><strong>{progress}%</strong></div>
            <div className={styles.surveyProgress}><span style={{ width: `${progress}%` }}/></div>
            <h2>{current.title}</h2>
            <p>{current.description}</p>
            <div className={styles.questionList}>
              {current.questions.map((question) => (
                <div className={styles.question} key={question.id}>
                  <strong>{question.label}</strong>
                  {question.kind === "choice" ? (
                    <div className={styles.choiceGrid}>{question.options.map((option) => <button key={option} data-selected={answers[question.id] === option} onClick={() => saveAnswer(question.id, option)}>{option}</button>)}</div>
                  ) : (
                    <div className={styles.scaleRow}><span>{question.left}</span><input type="range" min="0" max="100" value={Number(answers[question.id] ?? 50)} onChange={(event) => saveAnswer(question.id, Number(event.target.value))}/><span>{question.right}</span></div>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.surveyNav}><button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={15}/> 이전</button><button onClick={() => setStep((value) => Math.min(SURVEY.length - 1, value + 1))}>{step === SURVEY.length - 1 ? "저장하기" : "다음"} <ChevronRight size={15}/></button></div>
          </section>
          <section className={styles.resultCard}>
            <div className={styles.traitGrid}>{traits.map(([label, value]) => <div className={styles.trait} key={label}><span>{label}</span><strong>{Math.round(value)}</strong><div className={styles.traitBar}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div></div>)}</div>
            <div className={styles.resultCopy}><h3>이 점수는 결론이 아니라 보조 기준입니다.</h3><p>예산 상한, 호환성, 실제 용도, 사용 환경 같은 강한 조건을 먼저 적용하고 성향 점수는 후보 우선순위와 설명 방식에만 사용합니다. 카테고리에 들어가면 노트북·스마트폰·자동차·전동공구별 추가 질문이 필요한 경우에만 이어집니다.</p></div>
          </section>
        </>
      )}
    </div>
  );
}
