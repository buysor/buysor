"use client";

import { useMemo, useState } from "react";
import { Bot, Mail, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import styles from "./support.module.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApiReply = {
  reply?: string;
  handoffSuggested?: boolean;
  suggestedQuestions?: string[];
  error?: string;
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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [handoffSuggested, setHandoffSuggested] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions);

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
        }),
      });
      const body = await response.json() as ApiReply;
      const reply = response.ok && body.reply
        ? body.reply
        : body.error || "상담봇 응답을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      setHandoffSuggested(Boolean(body.handoffSuggested) || !response.ok);
      if (Array.isArray(body.suggestedQuestions) && body.suggestedQuestions.length) {
        setSuggestions(body.suggestedQuestions.slice(0, 3));
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "네트워크 오류로 상담봇에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
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
            <h1>도움이 필요하신가요?</h1>
            <p>먼저 상담봇으로 빠르게 해결하고, 계정 확인이 필요한 문제만 직접 문의로 넘깁니다.</p>
          </div>

          <div className={styles.trustRow}>
            <span><Sparkles size={16} /> 빠른 해결</span>
            <span><Bot size={16} /> 24시간 상담</span>
            <span><ShieldCheck size={16} /> 비밀정보 비노출</span>
          </div>
        </section>

        <section className={styles.grid}>
          <aside className={styles.sidebar}>
            <h2>상담 항목</h2>
            <button type="button" onClick={() => sendMessage("구매 판단 이용법을 알려줘")}>구매 판단 이용법 <span>판단 결과와 기능 사용</span></button>
            <button type="button" onClick={() => sendMessage("크레딧과 멤버십 차이를 알려줘")}>결제·크레딧 <span>멤버십, 충전, 사용 내역</span></button>
            <button type="button" onClick={() => sendMessage("로그인 문제가 있어")}>계정·로그인 <span>로그인과 프로필 문제</span></button>
            <button type="button" onClick={() => sendMessage("오류 신고는 어떻게 해?")}>오류 신고 <span>화면과 기능의 문제</span></button>
            <button type="button" onClick={() => sendMessage("기타 질문이 있어")}>기타 질문 <span>그 밖의 궁금한 점</span></button>
          </aside>

          <section className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div>
                <Bot size={19} />
                <div><strong>바이저 상담봇</strong><span>서비스 이용 질문 전용</span></div>
              </div>
              <span className={styles.aiBadge}>도움말 상담</span>
            </div>

            <div className={styles.messages} aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? styles.userRow : styles.assistantRow}>
                  <div className={styles.avatar}>{message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}</div>
                  <div className={styles.bubble}>{message.content}</div>
                </div>
              ))}
              {loading ? (
                <div className={styles.assistantRow}>
                  <div className={styles.avatar}><Bot size={16} /></div>
                  <div className={styles.loadingBubble}>답변을 확인하고 있습니다…</div>
                </div>
              ) : null}
            </div>

            <div className={styles.suggestions}>
              {suggestions.map((suggestion) => (
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
                placeholder="궁금한 내용을 입력하세요"
                aria-label="고객지원 질문"
              />
              <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()} aria-label="보내기"><Send size={18} /></button>
            </div>

            <div className={styles.privacy}>계정 비밀번호, 인증번호, API 키, 카드번호 전체를 입력하지 마세요.</div>
          </section>

          <aside className={styles.contactCard}>
            <Mail size={20} />
            <h2>직접 문의하기</h2>
            <p>결제 분쟁, 중복 차감, 반복 로그인 실패처럼 계정 확인이 필요한 문제는 직접 문의로 넘깁니다.</p>
            <a href="mailto:peon9339@gmail.com?subject=BUYSOR%20고객지원%20문의">이메일로 직접 문의</a>
            <small>현재는 이메일 클라이언트를 여는 임시 연결입니다. 서버 전송형 문의 시스템은 별도 연결이 필요합니다.</small>
            {handoffSuggested ? <div className={styles.handoff}>이 문의는 직접 확인이 필요한 가능성이 높습니다.</div> : null}
          </aside>
        </section>
      </main>
    </SiteShell>
  );
}
