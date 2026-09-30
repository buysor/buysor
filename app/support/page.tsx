"use client";

import { useMemo, useState } from "react";
import { Bot, Mail, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { usePreferences } from "@/components/preferences-provider";
import styles from "./support.module.css";
import { localizeError } from "@/lib/ui-locale";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApiReply = {
  reply?: string;
  handoffSuggested?: boolean;
  suggestedQuestions?: string[];
  error?: string;
  code?: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "안녕하세요. BUYSOR 고객지원입니다. 크레딧, 로그인, Lens, 구매 판단 사용법, 오류 신고처럼 서비스 이용과 관련된 질문을 도와드릴 수 있습니다.",
  },
];

const initialSuggestions = [
  "크레딧은 언제 차감되나요?",
  "Lens는 어떻게 쓰나요?",
  "로그인이 계속 풀려요",
];

export default function SupportPage() {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const greeting = ko ? initialMessages[0] : {role: "assistant" as const, content: "Hello. BUYSOR Support can help with credits, sign-in, Lens, purchase-decision usage and error reports."};
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [handoffSuggested, setHandoffSuggested] = useState(false);
  const [suggestions, setSuggestions] = useState<{language: "ko" | "en"; items: string[]} | null>(null);
  const visibleSuggestions = suggestions?.language === language ? suggestions.items : ko ? initialSuggestions : ["When are credits charged?", "How do I use Lens?", "I keep getting signed out"];

  const history = useMemo(() => messages.slice(-8), [messages]);

  async function sendMessage(value?: string) {
    const message = (value ?? input).trim();
    if (!message || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(0, -1),
          language,
        }),
      });
      const body = await response.json() as ApiReply;
      const reply = response.ok && body.reply
        ? body.reply
        : localizeError(body.error, language, ko ? "상담봇 응답을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : "Could not load a support reply. Please try again shortly.", body.code);

      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      setHandoffSuggested(Boolean(body.handoffSuggested) || !response.ok);
      if (Array.isArray(body.suggestedQuestions) && body.suggestedQuestions.length) {
        setSuggestions({language, items: body.suggestedQuestions.slice(0, 3)});
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: ko ? "네트워크 오류로 상담봇에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." : "Could not connect to support due to a network error. Please try again.",
        },
      ]);
      setHandoffSuggested(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteShell compact>
      <main className={styles.main}>
        <section className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>BUYSOR SUPPORT</span>
            <h1>{ko ? "도움이 필요하신가요?" : "Need help?"}</h1>
            <p>{ko ? "먼저 상담봇으로 빠르게 해결하고, 계정 확인이 필요한 문제만 직접 문의로 넘깁니다." : "Start with the support guide. Contact us directly when your account needs review."}</p>
          </div>

          <div className={styles.trustRow}>
            <span><Sparkles size={16} /> {ko ? "빠른 해결" : "Quick help"}</span>
            <span><Bot size={16} /> {ko ? "언제든 이용할 수 있는 도움말" : "Self-service help, anytime"}</span>
            <span><ShieldCheck size={16} /> {ko ? "비밀정보 비노출" : "Keep private information safe"}</span>
          </div>
        </section>

        <p style={{color:"var(--muted)",fontSize:13}}>{ko?"BUYSOR 요금은 USD 기준이며 세금과 최종 금액은 결제창에서 확인합니다. 제품 예산은 선택한 구매 지역의 통화를 사용합니다.":"BUYSOR prices are in USD. Review applicable tax and the final total at checkout. Product budgets use the currency of your selected shopping region."}</p>
        <section className={styles.grid}>
          <aside className={styles.sidebar}>
            <h2>{ko?"상담 항목":"Help topics"}</h2>
            <button type="button" onClick={() => sendMessage(ko ? "구매 판단 이용법을 알려줘" : "How do I use purchase decisions?")}>{ko ? "구매 판단 이용법" : "Purchase decisions"} <span>{ko ? "판단 결과와 기능 사용" : "Results and features"}</span></button>
            <button type="button" onClick={() => sendMessage(ko ? "크레딧과 멤버십 차이를 알려줘" : "What is the difference between credits and membership?")}>{ko ? "결제·크레딧" : "Billing and credits"} <span>{ko ? "멤버십, 충전, 사용 내역" : "Membership, top-ups and history"}</span></button>
            <button type="button" onClick={() => sendMessage(ko ? "로그인 문제가 있어" : "I have a sign-in problem")}>{ko ? "계정·로그인" : "Account and sign-in"} <span>{ko ? "로그인과 프로필 문제" : "Sign-in and profile issues"}</span></button>
            <button type="button" onClick={() => sendMessage(ko ? "오류 신고는 어떻게 해?" : "How do I report an error?")}>{ko ? "오류 신고" : "Report an error"} <span>{ko ? "화면과 기능의 문제" : "Screen and feature issues"}</span></button>
            <button type="button" onClick={() => sendMessage(ko ? "기타 질문이 있어" : "I have another question")}>{ko ? "기타 질문" : "Other questions"} <span>{ko ? "그 밖의 궁금한 점" : "Anything else"}</span></button>
          </aside>

          <section className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div>
                <Bot size={19} />
                <div><strong>{ko?"바이저 상담봇":"BUYSOR Support"}</strong><span>{ko?"서비스 이용 질문 전용":"Service-usage help"}</span></div>
              </div>
              <span className={styles.aiBadge}>{ko?"도움말 상담":"HELP GUIDE"}</span>
            </div>

            <div className={styles.messages} aria-live="polite">
              {[greeting, ...messages].map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? styles.userRow : styles.assistantRow}>
                  <div className={styles.avatar}>{message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}</div>
                  <div className={styles.bubble}>{message.content}</div>
                </div>
              ))}
              {loading ? (
                <div className={styles.assistantRow}>
                  <div className={styles.avatar}><Bot size={16} /></div>
                  <div className={styles.loadingBubble}>{ko?"답변을 확인하고 있습니다…":"Checking the answer…"}</div>
                </div>
              ) : null}
            </div>

            <div className={styles.suggestions}>
              {visibleSuggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={loading}>{suggestion}</button>
              ))}
            </div>

            <div className={styles.composer}>
              <textarea
                value={input}
                maxLength={900}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={ko?"궁금한 내용을 입력하세요":"Type your question"}
                aria-label={ko?"고객지원 질문":"Support question"}
              />
              <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()} aria-label={ko?"보내기":"Send"}><Send size={18} /></button>
            </div>

            <div className={styles.privacy}>{ko?"계정 비밀번호, 인증번호, API 키, 카드번호 전체를 입력하지 마세요.":"Do not enter account passwords, verification codes, API keys or full card numbers."}</div>
          </section>

          <aside className={styles.contactCard}>
            <Mail size={20} />
            <h2>{ko ? "직접 문의하기" : "Contact us directly"}</h2>
            <p>{ko ? "결제 분쟁, 중복 차감, 반복 로그인 실패처럼 계정 확인이 필요한 문제는 직접 문의로 넘깁니다." : "Contact us directly for payment disputes, duplicate charges or repeated sign-in failures that need account review."}</p>
            <a href={ko ? "mailto:peon9339@gmail.com?subject=BUYSOR%20고객지원%20문의" : "mailto:peon9339@gmail.com?subject=BUYSOR%20Support%20Request"}>{ko?"이메일로 직접 문의":"Contact by email"}</a>
            <small>{ko?"영어 또는 한국어로 문의하세요. 주문 번호, 시간대, 오류 설명을 알려주시면 확인에 도움이 됩니다.":"Write in English or Korean. Include your order ID, time zone and a short description of what happened."}</small>
            {handoffSuggested ? <div className={styles.handoff}>{ko?"이 문의는 직접 확인이 필요한 가능성이 높습니다.":"This issue likely needs direct review."}</div> : null}
          </aside>
        </section>
      </main>
    </SiteShell>
  );
}

