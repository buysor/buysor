import type { SurveyAnswer } from "@/lib/buysor-types";

export type SurveyQuestion = {
  id: string;
  label: string;
  help: string;
  kind: "choice" | "scale";
  options?: string[];
  multiple?: boolean;
  exclusiveOptions?: string[];
  left?: string;
  right?: string;
};

export type SurveyStep = {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
};

const choice = (id: string, label: string, help: string, options: string[]): SurveyQuestion => ({
  id,
  label,
  help,
  kind: "choice",
  options,
});

const multiChoice = (id: string, label: string, help: string, options: string[], exclusiveOptions: string[] = []): SurveyQuestion => ({
  id,
  label,
  help,
  kind: "choice",
  options,
  multiple: true,
  exclusiveOptions,
});

const scale = (id: string, label: string, help: string, left: string, right: string): SurveyQuestion => ({
  id,
  label,
  help,
  kind: "scale",
  left,
  right,
});

export const GENERAL_SURVEY: SurveyStep[] = [
  {
    id: "life",
    title: "생활",
    description: "제품이 실제 일상과 업무에서 어떤 역할을 하는지 봅니다.",
    questions: [
      multiChoice("activity", "현재 생활 상태와 가장 가까운 것은?", "한 가지 역할로만 생활하지 않는 사용자를 위해 여러 항목을 함께 선택할 수 있습니다. 제품 사용시간, 이동성, 고장 시 영향도를 추정합니다.", ["학생", "직장인", "자영업", "프리랜서", "현장직", "가사·육아", "기타"]),
      scale("mobility", "제품을 들고 이동하는 빈도", "이동이 잦을수록 무게·크기·배터리의 중요도를 높입니다.", "거의 없음", "매우 잦음"),
      scale("downtime", "제품이 멈추면 생활·업무에 미치는 영향", "대체 제품이 있거나 하루 이틀 없어도 괜찮으면 왼쪽, 바로 업무가 멈추면 오른쪽입니다. 안정성·AS 우선순위에 반영합니다.", "영향 적음", "업무 중단"),
      multiChoice("sharedUse", "이 제품을 누가 주로 사용하나요?", "혼자 쓰면서 가족이나 팀과 공유하는 경우처럼 실제 사용자가 겹칠 수 있어 복수 선택을 허용합니다.", ["나만 사용", "가족과 공유", "팀·직원과 공유", "상황에 따라 다름"], ["상황에 따라 다름"]),
    ],
  },
  {
    id: "finance",
    title: "재정",
    description: "소득을 묻지 않고 실제 지출 여력과 부담 수준을 봅니다.",
    questions: [
      choice("budgetComfort", "구매해도 부담이 적은 가격대", "억지로 낼 수 있는 최대 금액이 아니라, 결제 후에도 생활에 무리가 적은 금액입니다.", ["30만원 이하", "30~50만원", "50~100만원", "100~200만원", "200~400만원", "400만원 이상", "제품마다 다름"]),
      choice("budgetMax", "정말 필요할 때 허용 가능한 최대 가격대", "편한 예산보다 높은 상한입니다. 성능 차이가 명확할 때만 이 범위까지 올릴 수 있습니다.", ["50만원 이하", "50~100만원", "100~200만원", "200~300만원", "300~500만원", "500만원 이상", "정해두지 않음"]),
      choice("installment", "할부에 대한 생각", "총액보다 월 부담을 더 중요하게 보는지 확인합니다.", ["가능하면 안 함", "필요하면 사용", "무이자면 사용", "월 부담이 낮으면 적극 사용"]),
      scale("resale", "되팔 때 가격이 얼마나 중요한가요?", "재판매를 중요하게 보면 감가율, 중고 수요, 브랜드 잔존가치를 더 강하게 반영합니다.", "거의 안 봄", "매우 중요"),
    ],
  },
  {
    id: "taste",
    title: "취향",
    description: "사양표가 아니라 실제 선택 기준의 우선순위를 잡습니다.",
    questions: [
      scale("performance", "가격보다 성능을 우선하는 정도", "가격 차이가 있어도 성능 여유를 위해 추가 지출할 의향입니다.", "가격 우선", "성능 우선"),
      scale("design", "성능이 비슷할 때 디자인에 더 지불할 의향", "외형·마감·색상·브랜드 감성을 위해 추가 비용을 낼 수 있는 정도입니다.", "거의 없음", "매우 큼"),
      scale("stability", "최신 기술과 검증된 안정성 중 선호", "출시 직후 신제품을 선호하면 왼쪽, 검증된 세대와 낮은 초기 위험을 선호하면 오른쪽입니다.", "신기술", "안정성"),
      scale("brandFlex", "브랜드를 바꿀 수 있는 정도", "기존 브랜드 고정 성향이 낮으면 왼쪽, 생태계·익숙함 때문에 같은 브랜드가 중요하면 오른쪽입니다.", "브랜드 자유", "브랜드 고정"),
    ],
  },
  {
    id: "owned",
    title: "보유 제품",
    description: "새 제품을 보기 전에 지금 가진 것으로 해결 가능한지 확인합니다.",
    questions: [
      multiChoice("replaceReason", "교체를 고민하는 이유", "교체 이유는 동시에 여러 개일 수 있습니다. 실제 불편과 업그레이드 욕구를 함께 반영합니다.", ["성능 부족", "고장·노후", "배터리", "휴대성", "새 기능", "호환성", "단순히 갖고 싶음"]),
      scale("ecosystem", "기존 액세서리·생태계에 묶여 있는 정도", "충전기·배터리·앱·파일·주변기기 때문에 전환 비용이 얼마나 큰지 봅니다.", "자유로움", "강하게 묶임"),
      choice("keepOld", "새 제품 구매 후 기존 제품 계획", "판매하면 실구매비가 낮아지고, 계속 사용하면 새 제품 필요성을 더 엄격하게 봅니다.", ["판매", "계속 사용", "가족·지인에게 전달", "보관", "폐기", "미정"]),
      multiChoice("backup", "고장 시 쓸 수 있는 대체 수단이 있나요?", "직접 보유한 대체 제품과 빌릴 수 있는 수단을 함께 선택할 수 있습니다.", ["있음", "없음", "빌리거나 대체 가능", "상황에 따라 다름"], ["없음", "상황에 따라 다름"]),
    ],
  },
  {
    id: "environment",
    title: "환경",
    description: "실제 사용하는 장소와 물리적 제약을 반영합니다.",
    questions: [
      multiChoice("place", "주 사용 환경", "실제로 사용하는 장소를 모두 선택하세요. 환경별 무게·내구성·배터리 조건을 함께 반영합니다.", ["집", "사무실", "학교", "이동 중", "현장", "차량", "야외", "복합"], ["복합"]),
      scale("harsh", "먼지·물·열·추위 등 거친 환경 노출", "값이 높을수록 방진·방수·내구성과 서비스성을 우선합니다.", "거의 없음", "매우 많음"),
      scale("noise", "소음·발열·크기가 구매에 미치는 영향", "성능이 좋아도 소음·발열·부피가 불편을 만드는 정도입니다.", "거의 없음", "매우 큼"),
      choice("space", "설치·보관 공간은 어떤가요?", "가전·공구·데스크 환경에서는 공간이 제품 선택을 제한할 수 있습니다.", ["넉넉함", "보통", "좁음", "이동·수납이 중요", "제품마다 다름"]),
    ],
  },
  {
    id: "past",
    title: "과거 구매",
    description: "후회와 만족 패턴을 다음 결정의 교정 데이터로 사용합니다.",
    questions: [
      multiChoice("regret", "자주 했던 구매 실수", "후회 원인은 여러 개가 겹칠 수 있습니다. 같은 실수를 반복하지 않도록 모두 반영합니다.", ["과한 사양", "너무 싼 제품", "충동 구매", "중고 상태 실패", "AS 문제", "호환성 실패", "거의 없음"], ["거의 없음"]),
      choice("research", "구매 전 비교에 쓰는 시간", "비교 피로가 얼마나 큰지 보고 답변 길이와 후보 수를 조절합니다.", ["10분 이내", "1시간 정도", "하루", "며칠", "몇 주 이상"]),
      multiChoice("usedExperience", "중고 구매 경험", "좋은 경험과 실패 경험이 함께 있을 수 있어 복수 선택을 허용합니다.", ["없음", "좋았음", "보통", "실패 경험 있음", "자주 구매"], ["없음"]),
      scale("regretRisk", "구매 후 후회를 얼마나 피하고 싶은가요?", "오른쪽일수록 WAIT 판단과 검증 조건을 더 보수적으로 적용합니다.", "빠른 결정", "후회 최소화"),
    ],
  },
  {
    id: "future",
    title: "미래 계획",
    description: "지금만 보지 않고 앞으로 3~12개월 변화를 함께 봅니다.",
    questions: [
      multiChoice("change", "12개월 안에 큰 생활 변화", "여러 변화가 예정되어 있다면 모두 선택하세요. 제품 조건이 바뀔 가능성을 함께 반영합니다.", ["없음", "이사", "취업·퇴사", "입학·졸업", "해외체류", "장기여행", "가족 변화", "사업·업무 변화"], ["없음"]),
      choice("wait", "필요하면 구매를 얼마나 미룰 수 있나요?", "사고 싶은 시점이 아니라 실제로 문제 없이 버틸 수 있는 최대 기간에 가깝게 선택하세요.", ["오늘", "1주", "1개월", "3개월", "6개월 이상"]),
      scale("ownership", "한 제품을 오래 쓰려는 성향", "오른쪽일수록 초기 가격보다 수명·내구성·장기 만족도를 더 봅니다.", "자주 교체", "오래 사용"),
      choice("futureExpansion", "앞으로 사용량이 늘어날 가능성", "현재 기준보다 미래 사용량이 커질 예정이면 여유 사양을 더 고려합니다.", ["줄어들 가능성", "비슷함", "조금 늘어남", "크게 늘어남", "모름"]),
    ],
  },
  {
    id: "style",
    title: "구매 성향",
    description: "판단 기준과 결과를 보여주는 방식까지 개인화합니다.",
    questions: [
      scale("risk", "신제품·중고·검증 부족 제품에 대한 위험 회피", "오른쪽일수록 검증된 제품, 보증, 반품 가능성, 낮은 실패 확률을 우선합니다.", "위험 감수", "안전 우선"),
      scale("used", "중고 제품 수용도", "값이 높을수록 중고 시세·감가·상태 점검을 적극적으로 후보에 포함합니다.", "신품만", "상태 좋으면 가능"),
      choice("answerStyle", "바이저에게 원하는 답변 방식", "판단 자체가 아니라 결과 표현 방식을 정합니다.", ["결론 하나", "2~3개 후보", "결론부터 + 근거", "근거를 자세히", "상황별 시나리오"]),
      scale("overbuy", "조금 비싸더라도 여유 사양을 사는 성향", "미래 사용량이 불확실할 때 과잉 구매를 허용하는 정도입니다.", "필요한 만큼만", "여유 있게"),
    ],
  },
  {
    id: "category",
    title: "카테고리",
    description: "자주 고민하는 카테고리에 맞춰 추가 질문의 깊이를 조정합니다.",
    questions: [
      multiChoice("category", "자주 고민하는 고관여 카테고리", "여러 카테고리를 함께 선택할 수 있습니다. 선택한 분야의 심화 질문을 이어서 보여줍니다.", ["노트북", "스마트폰", "자동차", "전동공구", "가전", "기타"]),
      scale("categoryDepth", "전문적인 세부 질문을 얼마나 받아도 괜찮나요?", "왼쪽이면 핵심 질문만, 오른쪽이면 성능·호환성·유지비까지 세밀하게 묻습니다.", "핵심만", "끝까지 세세하게"),
      scale("simulation", "3개 이상 대안 시뮬레이션이 필요한 정도", "오른쪽일수록 ‘지금 구매 / 기다리기 / 다른 구매 우선’ 같은 복수 시나리오를 적극적으로 보여줍니다.", "한 결론", "여러 시나리오"),
      choice("purchaseFrequency", "고관여 제품을 얼마나 자주 구매하나요?", "구매 빈도에 따라 리포트 주기와 재판단 알림의 중요도가 달라집니다.", ["1년에 1번 이하", "반년에 1번", "분기마다", "매달", "업무상 자주"]),
    ],
  },
];

export const CATEGORY_SURVEYS: Record<string, SurveyStep> = {
  "노트북": {
    id: "category-laptop",
    title: "노트북 심화",
    description: "노트북 판단에서 성능보다 먼저 실제 작업과 이동 조건을 맞춥니다.",
    questions: [
      multiChoice("laptopWorkload", "주요 작업", "한 기기에서 여러 작업을 하는 경우가 많아 실제로 하는 작업을 모두 선택할 수 있습니다.", ["문서·웹", "개발", "사진 편집", "영상 편집", "3D·CAD", "게임", "AI·데이터 작업"]),
      scale("laptopPortability", "휴대성이 얼마나 중요한가요?", "오른쪽일수록 무게·충전기 크기·배터리를 더 강하게 봅니다.", "거의 고정", "매일 휴대"),
      multiChoice("laptopOS", "필요한 운영체제", "업무나 프로그램 때문에 macOS와 Windows가 모두 필요한 경우를 반영합니다.", ["macOS", "Windows", "상관없음", "아직 모름"], ["상관없음", "아직 모름"]),
      choice("laptopDisplay", "외부 모니터 사용", "외부 모니터가 많으면 화면 크기보다 포트·출력·GPU 조건이 중요해질 수 있습니다.", ["안 씀", "1대", "2대 이상", "상황에 따라"]),
      scale("laptopBattery", "배터리 지속시간 중요도", "콘센트 없이 오래 써야 할수록 전성비와 실사용 배터리를 우선합니다.", "낮음", "매우 중요"),
      scale("laptopLongevity", "4년 이상 사용 가능성이 필요한 정도", "오래 쓸수록 현재 충분함보다 메모리·저장공간·지원 기간 여유를 더 봅니다.", "2년 안팎", "4년 이상"),
    ],
  },
  "스마트폰": {
    id: "category-phone",
    title: "스마트폰 심화",
    description: "카메라·배터리·생태계·크기 중 실제 체감 우선순위를 정합니다.",
    questions: [
      scale("phoneCamera", "카메라 중요도", "사진·영상 품질이 구매 이유인지 확인합니다.", "기록용", "매우 중요"),
      scale("phoneBattery", "배터리 중요도", "충전 빈도와 장시간 외출 여부를 반영합니다.", "보통", "최우선"),
      choice("phoneSize", "선호 크기", "휴대성과 영상·게임 몰입 사이의 우선순위를 봅니다.", ["작고 가벼움", "보통", "큰 화면", "상관없음"]),
      multiChoice("phoneEcosystem", "현재 생태계", "여러 생태계의 기기를 함께 쓰는 경우를 정확히 반영할 수 있습니다.", ["Apple", "Galaxy", "Android 기타", "혼합", "상관없음"], ["혼합", "상관없음"]),
      scale("phoneGaming", "게임·고성능 앱 사용", "높을수록 칩셋, 발열, 디스플레이를 더 봅니다.", "거의 없음", "매우 많음"),
      choice("phoneCycle", "평균 교체 주기", "교체 주기가 길수록 배터리 수명과 장기 지원을 더 중요하게 봅니다.", ["1~2년", "2~3년", "3~4년", "4년 이상"]),
    ],
  },
  "자동차": {
    id: "category-car",
    title: "자동차 심화",
    description: "차량 가격뿐 아니라 사용량·주차·유지비·보유기간을 함께 봅니다.",
    questions: [
      choice("carDistance", "월 평균 주행거리", "연료비·전기차 경제성·감가에 큰 영향을 줍니다.", ["500km 이하", "500~1,000km", "1,000~2,000km", "2,000km 이상", "모름"]),
      choice("carPassengers", "주 탑승 인원", "차체 크기와 좌석·적재공간 필요성을 결정합니다.", ["1명", "2명", "3~4명", "5명 이상", "상황에 따라"]),
      multiChoice("carParking", "주차·충전 환경", "집과 직장처럼 환경이 여러 곳이면 해당 조건을 모두 선택할 수 있습니다.", ["전용 주차+충전 가능", "주차만 가능", "공용 충전 의존", "주차 제약 큼", "모름"], ["모름"]),
      choice("carCondition", "신차·중고 선호", "감가와 보증, 초기 비용의 우선순위를 반영합니다.", ["신차만", "신차 선호", "중고도 가능", "중고 적극 고려"]),
      choice("carOwnership", "예상 보유기간", "짧게 보유하면 감가, 오래 보유하면 내구성과 유지비 비중이 커집니다.", ["2년 이하", "3~5년", "6~8년", "9년 이상"]),
      scale("carMaintenance", "정비·관리 부담을 감수할 수 있는 정도", "오른쪽일수록 유지보수가 복잡한 선택도 허용할 수 있습니다.", "간단해야 함", "관리 가능"),
    ],
  },
  "전동공구": {
    id: "category-tool",
    title: "전동공구 심화",
    description: "공구 한 대보다 배터리 플랫폼·작업환경·사용빈도를 먼저 맞춥니다.",
    questions: [
      multiChoice("toolWork", "주 작업 종류", "실제로 하는 작업을 모두 선택하세요. 작업별 토크·정밀도·집진·안전 요구를 함께 반영합니다.", ["목공", "인테리어", "전기·설비", "자동차 정비", "금속", "DIY", "복합"], ["복합"]),
      multiChoice("toolPlatform", "현재 배터리 플랫폼", "두 개 이상의 배터리 플랫폼을 보유한 경우 모두 선택할 수 있습니다.", ["Makita", "Milwaukee", "DeWalt", "Bosch", "HiKOKI", "기타", "없음"], ["없음"]),
      choice("toolFrequency", "사용 빈도", "업무용인지 가끔 쓰는지에 따라 내구성과 가격 기준이 달라집니다.", ["월 1회 이하", "주 1회", "주 2~4회", "거의 매일", "하루 종일 업무용"]),
      scale("toolCordless", "무선이 필요한 정도", "현장 이동이 많을수록 배터리 무게를 감수하더라도 무선 가치를 높게 봅니다.", "유선 가능", "무선 필수"),
      scale("toolDust", "먼지·충격 환경", "오른쪽일수록 방진·내구성·AS 네트워크를 더 중요하게 봅니다.", "깨끗한 환경", "거친 현장"),
      scale("toolService", "AS·부품 수급 중요도", "업무 중단 비용이 크면 수리 속도와 부품 접근성을 강하게 반영합니다.", "낮음", "매우 중요"),
    ],
  },
};

export function nextSurveyAnswer(question: SurveyQuestion, current: SurveyAnswer | undefined, value: string | number): SurveyAnswer {
  if (question.kind !== "choice" || !question.multiple || typeof value !== "string") return value;

  const currentValues = Array.isArray(current)
    ? current.filter((item): item is string => typeof item === "string")
    : typeof current === "string" ? [current] : [];
  const exclusive = new Set(question.exclusiveOptions ?? []);

  if (currentValues.includes(value)) {
    return currentValues.filter((item) => item !== value);
  }
  if (exclusive.has(value)) return [value];

  return [...currentValues.filter((item) => !exclusive.has(item)), value];
}

export function getCategoryForStepId(stepId: string) {
  return Object.entries(CATEGORY_SURVEYS).find(([, step]) => step.id === stepId)?.[0] ?? null;
}

export function getSurveySteps(answers: Record<string, SurveyAnswer>) {
  const raw = answers.category;
  const categories = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : typeof raw === "string" ? [raw] : [];
  const extras = categories
    .map((category) => CATEGORY_SURVEYS[category])
    .filter((step): step is SurveyStep => Boolean(step));
  return [...GENERAL_SURVEY, ...extras];
}

export function getSurveyQuestionCount(answers: Record<string, SurveyAnswer>) {
  return getSurveySteps(answers).reduce((sum, step) => sum + step.questions.length, 0);
}
