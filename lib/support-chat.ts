import {FEATURES,MEMBERSHIP,formatKRW} from './commerce-policy';
export type SupportHistoryMessage={role:'user'|'assistant';content:string};
export type SupportReply={reply:string;handoffSuggested:boolean;suggestedQuestions:string[]};
/** Public support is an explicit help guide, not an unmetered paid-model proxy. */
export function answerSupportFaq(message:string,language:'ko'|'en'='ko'): SupportReply {
 const ko=language==='ko';
 const s=message.trim().toLowerCase();
 let reply=ko?'사용법, 크레딧, 로그인, 환불 문의를 안내합니다. 개별 계정이나 결제내역은 이 채팅에서 조회하지 않습니다.':'I can explain usage, credits, sign-in and refunds. This chat does not access individual account or payment records.';
 let handoffSuggested=false;
 if(/크레딧|credit|charge|차감|출석|attendance|가입|signup|룰렛|roulette/.test(s)) reply=ko?`가입·출석·룰렛 자동 보상은 0C입니다. 표준 구매판단은 ${FEATURES.standard.credits}C이며 해당 건의 사진 해석을 포함합니다. 실행 전 사용량을 확인하고, 실패한 요청의 사용권은 복원합니다. 기본 탐색과 기록 조회는 무료입니다.`:`Automatic sign-up, attendance and roulette rewards are 0C. A standard purchase decision costs ${FEATURES.standard.credits}C and includes photo interpretation for that decision. Usage is shown before execution, and failed requests restore reserved credits. Basic browsing and history viewing are free.`;
 else if(/구독|subscription|멤버|member|결제|payment|요금|price/.test(s))reply=ko?`소액 팩과 선택형 멤버십을 분리합니다. 멤버십 계획은 월 ${formatKRW(MEMBERSHIP.price)} / ${MEMBERSHIP.credits}C이며 무제한이 아닙니다. 실제 판매 여부는 결제 페이지에 표시됩니다.`:`Credit packs and optional membership are separate. The membership plan is ${formatKRW(MEMBERSHIP.price)} / ${MEMBERSHIP.credits}C per month and is not unlimited. The billing page shows whether sales are currently enabled.`;
 else if(/로그인|login|sign.?in|계정|account/.test(s))reply=ko?'결제한 것과 같은 Google 계정으로 로그인해 주세요. 비밀번호나 인증코드는 문의에 넣지 마세요.':'Sign in with the same Google account used for payment. Never include passwords or verification codes in support messages.';
 else if(/lens|사진|photo|구매|purchase|판단|decision/.test(s))reply=ko?'Lens에서 사진·링크·제품명을 입력하고 예산과 용도를 알려주세요. 실제 구매판단은 최신 웹 근거를 필요에 따라 확인하며 BUY · WAIT · SKIP으로 정리합니다.':'Start in Lens with a photo, link or product name, then add budget and use. The actual decision can verify current web evidence when needed and returns BUY · WAIT · SKIP.';
 if(/환불|refund|오류|error|중복|duplicate|취소|cancel|안돼|안 돼/.test(s)){handoffSuggested=true;reply+=ko?' 문의 시 주문번호와 오류 발생 시간을 남겨 주세요. 카드번호나 인증정보는 보내지 마세요.':' Include the order number and time of the error. Do not send full card numbers or authentication secrets.';}
 return {reply,handoffSuggested,suggestedQuestions:ko?['크레딧 사용량','로그인 도움','환불 문의']:['Credit usage','Sign-in help','Refund help']};
}
