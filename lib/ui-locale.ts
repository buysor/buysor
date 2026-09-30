type Language = "ko" | "en";

const PAGE_TITLES: Record<string, [string, string]> = {
  "/": ["BUYSOR — 구매 고민을 끝내는 AI", "BUYSOR — AI purchase decisions"],
  "/lens": ["BUYSOR Lens", "BUYSOR Lens"],
  "/category": ["카테고리로 찾기", "Browse categories"],
  "/advisor": ["내 조건 입력", "Your purchase needs"],
  "/decision": ["구매 판단 결과", "Purchase decision"],
  "/profile": ["구매 프로필", "Purchase profile"],
  "/my": ["내 바이저", "My BUYSOR"],
  "/credits": ["크레딧", "Credits"],
  "/pricing": ["월 멤버십", "Monthly membership"],
  "/usage-policy": ["사용권 가이드", "Credit policy"],
  "/guide": ["이용 가이드", "Usage guide"],
  "/support": ["고객지원", "Support"],
  "/attendance": ["출석 기록", "Daily check-in"],
  "/login": ["로그인", "Sign in"],
  "/reports/weekly": ["주간 리포트", "Weekly report"],
  "/reports/monthly": ["월간 리포트", "Monthly report"],
  "/billing/checkout": ["안전한 결제", "Secure checkout"],
  "/billing/success": ["결제 확인", "Payment verification"],
  "/billing/fail": ["결제 확인", "Payment verification"],
  "/admin": ["운영 대시보드", "Operations dashboard"],
  "/launch-check": ["출시 준비 상태", "Release readiness"],
};

export function getPageTitle(pathname: string | null, language: Language) {
  const path = pathname ?? "/";
  const title = (PAGE_TITLES[path] ?? ["BUYSOR", "BUYSOR"])[language === "ko" ? 0 : 1];
  return path === "/" ? title : `${title} | BUYSOR`;
}

// API error codes describe the same outcome in either display language.
// Unknown provider errors use the caller's localized fallback.
const ERROR_EN: Record<string, string> = {
  SIGN_IN_REQUIRED: "Please sign in with Google.",
  ADMIN_REQUIRED: "You do not have permission to access this page.",
  ORIGIN_REJECTED: "The request source could not be verified. Reload and try again.",
  JSON_REQUIRED: "The request format is invalid. Reload and try again.",
  EMPTY_BODY: "Please enter the required information.",
  BODY_TOO_LARGE: "The input is too large. Reduce it and try again.",
  INVALID_JSON: "Check the input format and try again.",
  SERVICE_UNAVAILABLE: "The request could not be completed. Please try again shortly.",
  ANALYSIS_BUDGET_EXCEEDED: "Reduce the input or choose a deep decision when available. Reserved credits are restored.",
  AI_PROVIDER_FAILED: "Could not connect to the analysis provider. Reserved credits are restored.",
  AI_INCOMPLETE: "The analysis could not finish. Reserved credits are restored.",
  PAYMENT_REVIEW: "Your payment status needs review. Please contact support.",
  INSUFFICIENT_CREDITS: "Not enough credits. Add credits before starting.",
  DAILY_LIMIT: "Today's analysis limit has been reached. Credits were not charged.",
  REQUEST_CONFLICT: "Check the analysis already in progress. Concurrent requests are not charged.",
  REQUEST_EXPIRED: "The request timed out. Check your credit status again.",
  PAYMENTS_OFFLINE: "The payment connection is unavailable. Please try again later.",
  PAYMENT_PROVIDER_ERROR: "Could not verify the payment provider's status. Recheck using your order number.",
  PAYMENT_MISMATCH: "The order and payment details do not match. Please contact support.",
  ORDER_NOT_FOUND: "The order could not be found.",
  PRICE_CHANGED: "Review the payment amount again.",
  ORDER_LIMIT: "Too many order requests. Check your existing order.",
  INVALID_CHECKOUT: "The checkout address could not be verified.",
  ORDER_NOT_PENDING: "Check the current order status.",
  PAYMENT_NOT_DONE: "Credits are added only after payment is confirmed.",
  REFUND_REVIEW: "Support needs to review the order status and credit usage before confirming a refund.",
  REFUND_PENDING: "The refund is being verified. Credits remain locked until verification finishes.",
  AI_NOT_CONFIGURED: "The analysis service is preparing. Credits are not charged.",
  CHECKOUT_NOT_READY: "Payment integration and service verification are in progress. No payment is made yet.",
  INVALID_ORDER: "Check the payment amount and purchase conditions.",
  INVALID_PAYMENT: "Check the payment details.",
  REFUND_CONFIRM_REQUIRED: "Confirm the order you want to refund.",
  INVALID_REQUEST: "Review your input and the required credits.",
  KEY_REUSED: "You cannot change the input for the same request ID.",
  REQUEST_FAILED: "This request has already failed. Check its status before starting another analysis.",
  ALREADY_REQUESTED: "This request has already been received.",
  DEEP_NOT_READY: "Deep decisions are being validated. Credits are not charged.",
  REJUDGE_NOT_READY: "Rejudging is being validated. Credits are not charged.",
  PARENT_REQUIRED: "An existing decision is required.",
  PARENT_NOT_FOUND: "The existing decision could not be found.",
  REJUDGE_SCOPE: "Rejudging supports only small changes to the same product's conditions.",
  INVALID_IMAGE: "Check the image file. Only JPG, PNG and WebP images are supported.",
  QUOTE_CHANGED: "Review the required credits again.",
  INVALID_RESULT: "The decision result is incomplete.",
  INVALID_QUESTION: "Enter a question between 1 and 900 characters.",
};

const ERROR_KO: Record<string,string> = {
 PAYMENTS_OFFLINE:"아직 결제가 연결되지 않았습니다.",PAYMENT_PROVIDER_ERROR:"결제 상태를 확인하지 못했습니다. 같은 주문 번호로 다시 확인해 주세요.",
 PAYMENT_MISMATCH:"주문과 결제 정보가 일치하지 않습니다. 고객지원에 문의해 주세요.",ORDER_NOT_FOUND:"주문을 찾지 못했습니다.",PRICE_CHANGED:"현재 가격을 확인하고 다시 진행해 주세요.",
 ORDER_LIMIT:"주문 요청이 많습니다. 기존 주문을 먼저 확인해 주세요.",INVALID_CHECKOUT:"결제창 주소를 확인하지 못했습니다.",ORDER_NOT_PENDING:"현재 주문 상태를 확인해 주세요.",
 PAYMENT_NOT_DONE:"결제가 확인된 후 크레딧을 지급합니다.",PAYMENT_REVIEW:"결제 상태를 고객지원에서 확인해야 합니다.",REFUND_REVIEW:"주문과 사용 내역을 고객지원에서 확인해야 합니다.",
 REFUND_PENDING:"환불 확인 중입니다. 확인이 끝날 때까지 해당 크레딧을 잠시 보류합니다.",CHECKOUT_NOT_READY:"결제를 준비 중입니다. 아직 요금이 청구되지 않습니다.",
};

export function localizeError(message: unknown, language: Language, fallback: string, code?: string) {
  const text = typeof message === "string" ? message : "";
  if (language === "ko") return (code && ERROR_KO[code]) || (/[가-힣]/.test(text) ? text : fallback);
  if (code && ERROR_EN[code]) return ERROR_EN[code];
  if (code?.startsWith("REQUEST_")) return "This request has already been processed or is in progress. Check its status first.";
  if (text === "로그인이 필요합니다.") return "Please sign in.";
  if (text === "접근 권한이 없습니다.") return "You do not have permission to access this page.";
  return text && !/[\uac00-\ud7a3\u3131-\u318e]/.test(text) ? text : fallback;
}
