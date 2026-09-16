"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, MessageSquareText, SlidersHorizontal } from "lucide-react";
import styles from "./buysor-features.module.css";
import helpStyles from "./user-model-help.module.css";

type ProfileData = {
  currentProduct: string;
  painPoint: string;
  budget: string;
  usedOkay: string;
  urgency: string;
  duration: string;
  futurePlan: string;
};

type QuestionBase = {
  id: string;
  label: string;
  help: string;
};

type Question =
  | (QuestionBase & { kind: "choice"; options: string[] })
  | (QuestionBase & { kind: "scale"; left: string; right: string });

type SurveyStep = { title: string; description: string; questions: Question[] };
type SaveState = "idle" | "draft" | "saved";

const SURVEY: SurveyStep[] = [
  {
    title: "생활",
    description: "제품이 실제 생활에서 얼마나 중요한지 확인합니다.",
    questions: [
      {
        id: "activity",
        label: "현재 생활 상태와 가장 가까운 것은?",
        help: "직업명을 맞히려는 질문이 아닙니다. 제품을 주로 어디서, 얼마나 오래, 얼마나 자주 쓰는지 추정하기 위한 기준입니다. 완벽히 맞는 항목이 없으면 가장 가까운 것을 고르세요.",
        kind: "choice",
        options: ["학생", "직장인", "자영업", "프리랜서", "현장직", "기타"],
      },
      {
        id: "mobility",
        label: "제품을 들고 이동하는 빈도",
        help: "주로 한 장소에서만 쓰면 왼쪽, 출퇴근·출장·현장 이동처럼 자주 들고 다니면 오른쪽으로 옮기세요. 값이 높을수록 무게·크기·배터리 비중을 더 크게 봅니다.",
        kind: "scale",
        left: "거의 없음",
        right: "매우 잦음",
      },
      {
        id: "downtime",
        label: "제품이 고장 나면 생활·업무에 미치는 영향",
        help: "고장 나도 대체 제품으로 버틸 수 있으면 왼쪽, 제품 하나가 멈추면 업무나 생활이 바로 중단된다면 오른쪽입니다. 값이 높을수록 안정성·AS·내구성을 우선합니다.",
        kind: "scale",
        left: "영향 적음",
        right: "업무 중단",
      },
    ],
  },
  {
    title: "재정",
    description: "소득을 캐묻지 않고, 실제 구매 가능한 범위를 봅니다.",
    questions: [
      {
        id: "budgetComfort",
        label: "구매할 때 가장 편한 가격대",
        help: "‘억지로 낼 수 있는 최대 금액’이 아니라 결제하고도 생활에 부담이 크지 않은 금액을 뜻합니다. 실제 추천에서는 이 편한 예산과 최대 예산을 구분해서 봅니다.",
        kind: "choice",
        options: ["50만원 이하", "50~100만원", "100~200만원", "200~400만원", "400만원 이상", "제품마다 다름"],
      },
      {
        id: "installment",
        label: "할부에 대한 생각",
        help: "가격이 같아도 현금흐름 부담이 다르기 때문에 묻습니다. 할부를 싫어하면 총액이 낮은 선택을, 월 부담을 중시하면 월 납입액까지 고려합니다.",
        kind: "choice",
        options: ["가능하면 안 함", "필요하면 사용", "월 부담이 낮으면 사용", "적극 활용"],
      },
      {
        id: "resale",
        label: "나중에 되팔 때 가격이 얼마나 중요한가요?",
        help: "몇 년 뒤 중고로 팔 가능성이 거의 없으면 왼쪽, 되팔 가격까지 구매 판단의 일부라면 오른쪽입니다. 값이 높을수록 감가율과 중고 수요를 더 강하게 반영합니다.",
        kind: "scale",
        left: "중요하지 않음",
        right: "매우 중요",
      },
    ],
  },
  {
    title: "취향",
    description: "사양표가 아니라 실제 선택 기준의 우선순위를 잡습니다.",
    questions: [
      {
        id: "performance",
        label: "가격보다 성능을 우선하는 정도",
        help: "비슷한 제품에서 가격 차이가 나더라도 더 빠르고 강한 성능을 위해 추가 비용을 낼 의향이 어느 정도인지 묻습니다. 왼쪽은 가성비, 오른쪽은 성능 여유를 더 중요하게 봅니다.",
        kind: "scale",
        left: "가격 우선",
        right: "성능 우선",
      },
      {
        id: "design",
        label: "성능이 비슷하다면 디자인에 더 지불할 의향",
        help: "성능이 거의 같을 때 외형·마감·색상·브랜드 감성 때문에 더 비싼 제품을 선택해도 괜찮은지 묻습니다. 기능 차이가 크면 이 값보다 기능 조건을 먼저 적용합니다.",
        kind: "scale",
        left: "없음",
        right: "큼",
      },
      {
        id: "stability",
        label: "신기술과 검증된 안정성 중 선호",
        help: "막 나온 신기능과 최신 세대를 선호하면 왼쪽, 이미 검증된 세대와 낮은 초기 불량 위험을 선호하면 오른쪽입니다. 출시 직후 제품을 추천할지 기다릴지 판단할 때 쓰입니다.",
        kind: "scale",
        left: "신기술",
        right: "안정성",
      },
    ],
  },
  {
    title: "보유 제품",
    description: "새 제품보다 먼저, 지금 가진 제품으로 해결 가능한지 봅니다.",
    questions: [
      {
        id: "replaceReason",
        label: "교체를 고민하는 가장 큰 이유",
        help: "‘새 제품이 좋아 보여서’와 ‘현재 제품이 실제 문제를 만들고 있어서’를 구분하려는 질문입니다. 가장 자주 체감하는 이유 하나를 고르세요.",
        kind: "choice",
        options: ["성능 부족", "고장·노후", "배터리", "휴대성", "새 기능", "단순히 갖고 싶음"],
      },
      {
        id: "ecosystem",
        label: "기존 액세서리·생태계에 묶여 있는 정도",
        help: "보유 충전기·배터리·앱·파일·주변기기 때문에 브랜드나 플랫폼을 바꾸기 어려운 정도입니다. 오른쪽일수록 제품 단독 가격보다 전환 비용을 더 크게 봅니다.",
        kind: "scale",
        left: "자유로움",
        right: "강하게 묶임",
      },
      {
        id: "keepOld",
        label: "새 제품 구매 후 기존 제품 계획",
        help: "기존 제품을 판매한다면 실구매비를 낮출 수 있고, 계속 쓴다면 새 제품이 꼭 필요한지 더 엄격하게 봅니다. 실제 계획과 가장 가까운 것을 선택하세요.",
        kind: "choice",
        options: ["판매", "계속 사용", "가족에게 전달", "보관", "폐기"],
      },
    ],
  },
  {
    title: "환경",
    description: "사용 장소와 물리적 제약을 반영합니다.",
    questions: [
      {
        id: "place",
        label: "주 사용 환경",
        help: "제품이 가장 오래 머무는 장소를 묻습니다. 집과 사무실을 반반 쓰는 것처럼 하나로 고르기 어렵다면 ‘복합’을 선택하세요. 환경에 따라 크기·소음·내구성 조건이 달라집니다.",
        kind: "choice",
        options: ["집", "사무실", "학교", "이동 중", "현장", "차량", "복합"],
      },
      {
        id: "harsh",
        label: "먼지·물·열·추위 등 거친 환경 노출",
        help: "일반 실내처럼 보호된 환경이면 왼쪽, 공사 현장·야외·차량 내부처럼 먼지·습기·고온·저온에 자주 노출되면 오른쪽입니다. 값이 높을수록 방진·방수·내구성을 중요하게 봅니다.",
        kind: "scale",
        left: "거의 없음",
        right: "매우 많음",
      },
      {
        id: "noise",
        label: "소음·발열·크기가 구매에 미치는 영향",
        help: "성능이 좋아도 팬 소음, 발열, 큰 부피 때문에 불편할 수 있는지 묻습니다. 이런 요소가 실제 사용 만족도를 많이 좌우한다면 오른쪽으로 설정하세요.",
        kind: "scale",
        left: "거의 없음",
        right: "매우 큼",
      },
    ],
  },
  {
    title: "과거 구매",
    description: "후회와 만족 패턴을 다음 결정의 교정 데이터로 씁니다.",
    questions: [
      {
        id: "regret",
        label: "가장 자주 했던 구매 실수",
        help: "과거의 실수를 다시 반복하지 않기 위한 질문입니다. 가장 큰 손해나 후회를 만든 유형을 고르면 비슷한 상황에서 바이저가 더 강하게 경고합니다.",
        kind: "choice",
        options: ["과한 사양", "싼 제품 재구매", "충동 구매", "중고 상태 실패", "AS 문제", "거의 없음"],
      },
      {
        id: "research",
        label: "구매 전 비교에 쓰는 시간",
        help: "조사량 자체를 평가하려는 게 아닙니다. 비교를 오래 할수록 결정 피로가 커지는지, 빠른 결론이 필요한지를 판단하는 참고값입니다.",
        kind: "choice",
        options: ["10분 이내", "1시간", "하루", "며칠", "몇 주 이상"],
      },
      {
        id: "regretRisk",
        label: "구매 후 후회를 얼마나 피하고 싶은가요?",
        help: "조금 불확실해도 빨리 결정하고 싶으면 왼쪽, 시간이 더 걸리더라도 잘못 사는 가능성을 최대한 줄이고 싶으면 오른쪽입니다. 오른쪽일수록 WAIT 판단이 더 쉽게 나올 수 있습니다.",
        kind: "scale",
        left: "빠른 결정",
        right: "후회 최소화",
      },
    ],
  },
  {
    title: "미래 계획",
    description: "지금만 보지 않고 다음 3~12개월 계획을 함께 봅니다.",
    questions: [
      {
        id: "change",
        label: "12개월 안에 큰 생활 변화",
        help: "이사·취업·입학·해외 체류처럼 제품 필요 조건이 바뀔 사건이 있는지 확인합니다. 가까운 미래에 환경이 바뀌면 지금 최적의 제품이 몇 달 뒤에는 불편할 수 있습니다.",
        kind: "choice",
        options: ["없음", "이사", "취업·퇴사", "입학", "해외체류", "여행", "가족 변화"],
      },
      {
        id: "wait",
        label: "필요하면 구매를 얼마나 미룰 수 있나요?",
        help: "현재 제품으로 버틸 수 있는 기간을 뜻합니다. ‘사고 싶은 시점’이 아니라 실제로 문제 없이 기다릴 수 있는 최대 기간에 가깝게 선택하세요.",
        kind: "choice",
        options: ["오늘", "1주", "1개월", "3개월", "6개월 이상"],
      },
      {
        id: "ownership",
        label: "한 제품을 오래 쓰려는 성향",
        help: "신제품이 나오면 자주 교체하는 편이면 왼쪽, 한 번 사면 오래 쓰고 교체 횟수를 줄이고 싶으면 오른쪽입니다. 오른쪽일수록 초기 가격보다 수명과 장기 만족도를 더 봅니다.",
        kind: "scale",
        left: "자주 교체",
        right: "오래 사용",
      },
    ],
  },
  {
    title: "구매 성향",
    description: "바이저가 답을 제시하는 방식까지 개인화합니다.",
    questions: [
      {
        id: "risk",
        label: "새 제품·중고·검증 부족 제품에 대한 위험 회피",
        help: "초기 불량, 중고 상태 편차, 신제품 검증 부족 같은 위험을 어느 정도 감수할 수 있는지 묻습니다. 오른쪽일수록 검증된 모델과 보증 조건을 우선합니다.",
        kind: "scale",
        left: "위험 감수",
        right: "안전 우선",
      },
      {
        id: "used",
        label: "중고 제품 수용도",
        help: "신품만 원하면 왼쪽, 상태·보증·가격이 합리적이면 중고도 적극 고려할 수 있으면 오른쪽입니다. 값이 높을수록 중고 시세와 감가를 후보에 포함합니다.",
        kind: "scale",
        left: "신품만",
        right: "상태만 좋으면 가능",
      },
      {
        id: "answerStyle",
        label: "바이저에게 원하는 답변 방식",
        help: "판단 자체보다 결과를 어떻게 보여줄지 정하는 질문입니다. ‘하나만’은 결론 중심, ‘2~3개 후보’는 비교 중심, ‘상황별 시나리오’는 조건 변화에 따른 대안을 함께 보여줍니다.",
        kind: "choice",
        options: ["하나만 골라줘", "2~3개 후보", "근거를 길게", "결론부터", "상황별 시나리오"],
      },
    ],
  },
  {
    title: "카테고리",
    description: "카테고리 진입 시 필요한 추가 질문만 이어서 묻습니다.",
    questions: [
      {
        id: "category",
        label: "가장 자주 고민하는 고관여 카테고리",
        help: "앞으로 어떤 종류의 추가 질문을 우선 준비할지 정합니다. 이 선택이 다른 카테고리 사용을 막는 건 아닙니다.",
        kind: "choice",
        options: ["노트북", "스마트폰", "자동차", "전동공구", "가전", "기타"],
      },
      {
        id: "categoryDepth",
        label: "전문적인 세부 질문을 얼마나 받아도 괜찮나요?",
        help: "핵심 질문 몇 개로 빠르게 끝내고 싶으면 왼쪽, 성능·호환성·환경·유지비까지 세밀하게 묻는 것이 괜찮다면 오른쪽입니다. 질문 수를 개인화하는 데 사용합니다.",
        kind: "scale",
        left: "핵심만",
        right: "끝까지 세세하게",
      },
      {
        id: "simulation",
        label: "3개 이상 대안 시뮬레이션이 필요한 정도",
        help: "하나의 최종 결론만 보고 싶으면 왼쪽, ‘지금 구매 / 기다리기 / 다른 제품 먼저’처럼 여러 선택의 결과를 비교하고 싶으면 오른쪽입니다. Premium 전략 리포트의 깊이에도 반영됩니다.",
        kind: "scale",
        left: "한 결론",
        right: "여러 시나리오",
      },
    ],
  },
];

const EMPTY_PROFILE: ProfileData = {
  currentProduct: "—",
  painPoint: "—",
  budget: "—",
  usedOkay: "—",
  urgency: "—",
  duration: "—",
  futurePlan: "—",
};

const EXAMPLE_TEXT = "다음 달 이사 예정이고 예산은 150만원 정도예요. 지금 M1 맥북에어를 쓰는데 영상편집이 느립니다. 중고도 괜찮고 급하지 않아서 한두 달 기다릴 수 있어요. 2~3년은 쓰고 싶습니다.";
const LEGACY_EXAMPLES = new Set([
  EXAMPLE_TEXT,
  "다음 달 이사 예정이고 예산은 150만원 정도예요. 현재 M1 맥북에어를 쓰는데 영상편집이 느리고, 중고도 괜찮아요. 급하지 않아서 한두 달 기다릴 수 있고 2~3년은 쓰고 싶어요.",
]);

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

function QuestionHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={helpStyles.helpWrap} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={helpStyles.helpButton}
        aria-label="이 질문 설명 보기"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        !
      </button>
      <span className={helpStyles.tooltip} data-open={open} role="tooltip">
        <b>이 질문은 왜 묻나요?</b>
        <span>{text}</span>
      </span>
    </span>
  );
}

export function PersonalizationBanner() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("buysor-preview-survey");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string | number>;
      setProgress(Math.min(100, Math.round((Object.keys(parsed).length / 27) * 100)));
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
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [usingExample, setUsingExample] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [profileSaveState, setProfileSaveState] = useState<SaveState>("idle");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [surveySaveState, setSurveySaveState] = useState<SaveState>("idle");
  const [surveySavedAt, setSurveySavedAt] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "survey") setTab("survey");

    try {
      const savedText = localStorage.getItem("buysor-preview-state");
      const savedAnswers = localStorage.getItem("buysor-preview-survey");
      const savedAt = localStorage.getItem("buysor-preview-survey-saved-at");

      if (savedText && !LEGACY_EXAMPLES.has(savedText)) {
        setText(savedText);
        setProfile(inferProfile(savedText));
        setHasAnalysis(true);
      } else if (savedText && LEGACY_EXAMPLES.has(savedText)) {
        localStorage.removeItem("buysor-preview-state");
      }

      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers) as Record<string, string | number>);
        setSurveySaveState(savedAt ? "saved" : "draft");
      }
      if (savedAt) setSurveySavedAt(savedAt);
    } catch {}
  }, []);

  const current = SURVEY[step];
  const progress = Math.round(((step + 1) / SURVEY.length) * 100);
  const answeredCount = Object.keys(answers).length;
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
    const clean = text.trim();
    if (!clean) return;
    setProfile(inferProfile(clean));
    setHasAnalysis(true);
    setConfirmed(false);
    setProfileSaveState("draft");
    if (!usingExample) {
      try { localStorage.setItem("buysor-preview-state", clean); } catch {}
    }
  }

  function useExample() {
    setText(EXAMPLE_TEXT);
    setUsingExample(true);
    setHasAnalysis(false);
    setConfirmed(false);
    setProfileSaveState("idle");
  }

  function clearState() {
    setText("");
    setProfile(EMPTY_PROFILE);
    setUsingExample(false);
    setHasAnalysis(false);
    setConfirmed(false);
    setProfileSaveState("idle");
    try {
      localStorage.removeItem("buysor-preview-state");
      localStorage.removeItem("buysor-preview-profile");
    } catch {}
  }

  function saveProfile() {
    if (!hasAnalysis) return;
    try {
      localStorage.setItem("buysor-preview-profile", JSON.stringify({ text: text.trim(), profile, savedAt: new Date().toISOString() }));
      if (!usingExample) localStorage.setItem("buysor-preview-state", text.trim());
      setConfirmed(true);
      setProfileSaveState("saved");
    } catch {
      setProfileSaveState("draft");
    }
  }

  function saveAnswer(id: string, value: string | number) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      try {
        localStorage.setItem("buysor-preview-survey", JSON.stringify(next));
        localStorage.removeItem("buysor-preview-survey-saved-at");
        setSurveySaveState("draft");
        setSurveySavedAt(null);
      } catch {}
      return next;
    });
  }

  function saveSurvey() {
    try {
      const savedAt = new Date().toISOString();
      localStorage.setItem("buysor-preview-survey", JSON.stringify(answers));
      localStorage.setItem("buysor-preview-survey-saved-at", savedAt);
      setSurveySavedAt(savedAt);
      setSurveySaveState("saved");
    } catch {
      setSurveySaveState("draft");
    }
  }

  function handleSurveyPrimary() {
    if (step < SURVEY.length - 1) {
      setStep((value) => Math.min(SURVEY.length - 1, value + 1));
      return;
    }
    saveSurvey();
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
        <p>제품 정보와 현재 상황, 보유 제품, 환경, 과거 경험, 예산, 미래 계획을 하나의 USER MODEL로 묶어 다음 구매 판단에 사용합니다.</p>
      </section>

      <div className={styles.tabs}>
        <button data-active={tab === "state"} onClick={() => setTab("state")}>지금 내 상태 말하기</button>
        <button data-active={tab === "survey"} onClick={() => setTab("survey")}>정밀 구매 프로필</button>
      </div>

      {tab === "state" ? (
        <section className={styles.profilePanel}>
          <article className={styles.editorCard}>
            <h2>지금 어떤 상황인가요?</h2>
            <p>형식 없이 편하게 말하세요. 입력하지 않은 내용은 바이저가 임의로 만들어내지 않습니다.</p>
            <textarea
              className={styles.stateTextarea}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setUsingExample(false);
                setHasAnalysis(false);
                setConfirmed(false);
                setProfileSaveState("idle");
              }}
              placeholder="예: 현재 쓰는 제품, 불편한 점, 편한 예산, 중고 가능 여부, 언제까지 필요한지, 앞으로의 계획 등을 자유롭게 적어주세요."
            />
            <div className={styles.exampleRow}>
              <button type="button" onClick={useExample}>예시 한번 넣어보기</button>
              {text && <button type="button" onClick={clearState}>비우기</button>}
              <span>예시는 실제 사용자 정보가 아니며 자동 저장되지 않습니다.</span>
            </div>
            <div className={styles.editorFooter}><small>입력한 내용만 분석합니다.</small><button disabled={!text.trim()} onClick={analyze}>바이저가 이해하기</button></div>
          </article>

          <aside className={styles.insightCard}>
            {!hasAnalysis ? (
              <div className={styles.analysisEmpty}>
                <span>아직 분석 전</span>
                <strong>내 상황을 적고<br/>“바이저가 이해하기”를 눌러주세요.</strong>
                <p>여기에 사용자가 입력한 내용만 구조화해서 보여줍니다.</p>
              </div>
            ) : (
              <>
                <div className={styles.insightCardHead}><strong>바이저가 이렇게 이해했습니다</strong>{confirmed && <span className={styles.confirmed}><CheckCircle2 size={14}/> 확인됨</span>}</div>
                <div className={styles.insightList}>{rows.map(([label, value]) => <div className={styles.insightRow} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
                <div className={styles.confirmActions}><button onClick={() => { setConfirmed(false); setProfileSaveState("draft"); }}>수정하기</button><button onClick={saveProfile}>맞아요, 저장</button></div>
                {profileSaveState === "saved" && <div className={helpStyles.profileSaveNote}><CheckCircle2 size={14}/> 이 브라우저에 저장되었습니다.</div>}
              </>
            )}
          </aside>
        </section>
      ) : (
        <>
          <section className={styles.surveyCard}>
            <div className={styles.surveyTop}><span>{String(step + 1).padStart(2, "0")} / {String(SURVEY.length).padStart(2, "0")} · {current.title}</span><strong>{progress}%</strong></div>
            <div className={styles.surveyProgress}><span style={{ width: `${progress}%` }}/></div>
            <h2>{current.title}</h2><p>{current.description}</p>

            <div className={styles.questionList}>
              {current.questions.map((question) => (
                <div className={styles.question} key={question.id}>
                  <div className={helpStyles.questionHead}>
                    <strong>{question.label}</strong>
                    <QuestionHelp text={question.help}/>
                  </div>

                  {question.kind === "choice" ? (
                    <div className={styles.choiceGrid}>
                      {question.options.map((option) => (
                        <button key={option} data-selected={answers[question.id] === option} onClick={() => saveAnswer(question.id, option)}>{option}</button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.scaleRow}>
                      <span>{question.left}</span>
                      <input type="range" min="0" max="100" value={Number(answers[question.id] ?? 50)} onChange={(event) => saveAnswer(question.id, Number(event.target.value))}/>
                      <span>{question.right}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={helpStyles.surveyNavWrap}>
              <div className={helpStyles.saveMeta} data-state={surveySaveState}>
                <span className={helpStyles.saveDot}/>
                <span>
                  {surveySaveState === "saved"
                    ? `저장 완료 · ${answeredCount}/27문항${surveySavedAt ? ` · ${new Date(surveySavedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : ""}`
                    : surveySaveState === "draft"
                      ? `임시 저장 중 · ${answeredCount}/27문항`
                      : `답변하면 자동으로 임시 저장됩니다 · ${answeredCount}/27문항`}
                </span>
              </div>

              <div className={helpStyles.surveyButtons}>
                <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={15}/> 이전</button>
                <button data-saved={step === SURVEY.length - 1 && surveySaveState === "saved"} onClick={handleSurveyPrimary}>
                  {step === SURVEY.length - 1
                    ? surveySaveState === "saved" ? "저장 완료" : "저장하기"
                    : "다음"} <ChevronRight size={15}/>
                </button>
              </div>
            </div>
          </section>

          <section className={styles.resultCard}>
            <div className={styles.traitGrid}>{traits.map(([label, value]) => <div className={styles.trait} key={label}><span>{label}</span><strong>{Math.round(value)}</strong><div className={styles.traitBar}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div></div>)}</div>
            <div className={styles.resultCopy}><h3>이 점수는 결론이 아니라 보조 기준입니다.</h3><p>예산 상한, 호환성, 실제 용도, 사용 환경 같은 강한 조건을 먼저 적용하고 성향 점수는 후보 우선순위와 설명 방식에만 사용합니다.</p></div>
          </section>
        </>
      )}
    </div>
  );
}
