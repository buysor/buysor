import {FEATURES,MEMBERSHIP,formatKRW} from './commerce-policy';
export type SupportHistoryMessage={role:'user'|'assistant';content:string};
export type SupportReply={reply:string;handoffSuggested:boolean;suggestedQuestions:string[]};
/** Public support is an explicit help guide, not an unmetered paid-model proxy. */
export function answerSupportFaq(message:string): SupportReply {
 const s=message.trim().toLowerCase();
 let reply='사용법, 크레딧, 로그인, 환불 문의를 안내합니다. 개별 계정이나 결제내역은 이 채팅에서 조회하지 않습니다.';
 let handoffSuggested=false;
 if(/크레딧|credit|차감|출석|가입|룰렛/.test(s)) reply=`가입·출석·룰렛 자동 보상은 0C입니다. 표준 구매판단은 ${FEATURES.standard.credits}C이며 해당 건의 사진 해석을 포함합니다. 실행 전 사용량을 확인하고, 실패한 요청의 사용권은 복원합니다. 기본 탐색과 기록 조회는 무료입니다.`;
 else if(/구독|멤버|결제|요금/.test(s))reply=`소액 팩과 선택형 멤버십을 분리합니다. 멤버십 계획은 월 ${formatKRW(MEMBERSHIP.price)} / ${MEMBERSHIP.credits}C이며 무제한이 아닙니다. 실제 판매 여부는 결제 페이지에 표시됩니다.`;
 else if(/로그인|계정/.test(s))reply='결제한 것과 같은 Google 계정으로 로그인해 주세요. 비밀번호나 인증코드는 문의에 넣지 마세요.';
 else if(/lens|사진|구매|판단/.test(s))reply='Lens에서 사진·링크·제품명을 입력하고 예산과 용도를 알려주세요. 상담봇은 제품 구매판단을 대신하지 않습니다. 실시간 시세를 확인한 것처럼 안내하지 않습니다.';
 if(/환불|오류|중복|취소|안돼|안 돼/.test(s)){handoffSuggested=true;reply+=' 문의 시 주문번호와 오류 발생 시간을 남겨 주세요. 카드번호나 인증정보는 보내지 마세요.';}
 return {reply,handoffSuggested,suggestedQuestions:['크레딧 사용량','로그인 도움','환불 문의']};
}
