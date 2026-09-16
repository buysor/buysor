"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LogIn,
  MessageSquareText,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { StructuredUserState, UserModelPayload } from "@/lib/buysor-types";
import {
  getSurveyQuestionCount,
  getSurveySteps,
  type SurveyQuestion,
} from "@/lib/user-model-survey";
import styles from "./buysor-features.module.css";
import helpStyles from "./user-model-help.module.css";

type SaveState = "idle" | "draft" | "saving" | "saved" | "error";
type AuthState = "loading" | "guest" | "authenticated";
type AiState = "loading" | "ready" | "missing";

const EMPTY_PROFILE: UserModelPayload = {
  stateText: "",
  structuredState: null,
  survey: {},
  categoryProfiles: {},
  completion: 0,
};

const EXAMPLE_TEXT = "다음 달 이사 예정이고 예산은 150만원 정도예요. 지금 M1 맥북에어를 쓰는데 영상편집이 느립니다. 중고도 괜찮고 급하지 않아서 한두 달 기다릴 수 있어요. 2~3년은 쓰고 싶습니다.";

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
  const [status, setStatus] = useState("아직 시작하지 않음");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const auth = await fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()) as { authenticated?: boolean };
        if (auth.authenticated) {
          const profile = await fetch("/api/profile", { cache: "no-store" }).then((response) => response.json()) as UserModelPayload;
          if (!active) return;
          setProgress(Number(profile.completion ?? 0));
          setStatus(profile.completion > 0 ? "계정에 저장됨 · 이어하기 가능" : "아직 시작하지 않음");
          return;
        }
      } catch {}

      try {
        const raw = localStorage.getItem("buysor-user-model");
        if (!raw || !active) return;
        const profile = JSON.parse(raw) as UserModelPayload;
        setProgress(Number(profile.completion ?? 0));
        setStatus(profile.completion > 0 ? "이 브라우저에 임시 저장됨" : "아직 시작하지 않음");
      } catch {}
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <section className={styles.personalBanner}>
      <div>
        <span className="section-kicker">PERSONAL DECISION MODEL</span>
        <h2>바이저가 나를 더 정확히 이해하게 만들기</h2>
        <p>현재 상황과 구매 기준을 알려주면 제품만 보지 않고 당신의 조건까지 다음 구매 판단에 자동 반영합니다.</p>
        <div className={styles.bannerActions}>
          <a className={styles.primaryButton} href="/profile?tab=state"><MessageSquareText size={16}/> 지금 내 상태 말하기</a>
          <a className={styles.secondaryButton} href="/profile?tab=survey"><SlidersHorizontal size={16}/> 정밀 구매 프로필 설정</a>
        </div>
      </div>
      <div className={styles.profileSummary}>
        <div className={styles.summaryRow}><span>구매 프로필 완성도</span><strong>{progress}%</strong></div>
        <div className={styles.progressTrack}><span style={{ width: `${progress}%` }}/></div>
        <div className={styles.summaryRow}><span>상태</span><span>{status}</span></div>
      </div>
    </section>
  );
}

export function UserModelClient() {
  const [tab, setTab] = useState<"state" | "survey">("state");
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [aiState, setAiState] = useState<AiState>("loading");
  const [profile, setProfile] = useState<UserModelPayload>(EMPTY_PROFILE);
  const [text, setText] = useState("");
  const [structuredState, setStructuredState] = useState<StructuredUserState | null>(null);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const answers = profile.survey ?? {};
  const steps = useMemo(() => getSurveySteps(answers), [answers]);
  const current = steps[Math.min(step, steps.length - 1)];
  const totalQuestions = getSurveyQuestionCount(answers);
  const answeredCount = Object.keys(answers).filter((key) => answers[key] !== "" && answers[key] !== undefined).length;
  const surveyPercent = totalQuestions ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0;
  const overallCompletion = Math.min(100, Math.round((text.trim() ? 20 : 0) + (surveyPercent * 0.8)));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "survey") setTab("survey");

    let active = true;
    async function load() {
      let local: UserModelPayload = EMPTY_PROFILE;
      try {
        const raw = localStorage.getItem("buysor-user-model");
        if (raw) local = { ...EMPTY_PROFILE, ...JSON.parse(raw) } as UserModelPayload;
      } catch {}

      try {
        const [authResponse, aiResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/ai/status", { cache: "no-store" }),
        ]);
        const auth = await authResponse.json() as { authenticated?: boolean };
        const ai = await aiResponse.json() as { configured?: boolean };
        if (!active) return;
        setAiState(ai.configured ? "ready" : "missing");

        if (auth.authenticated) {
          setAuthState("authenticated");
          const serverResponse = await fetch("/api/profile", { cache: "no-store" });
          if (serverResponse.ok) {
            const server = await serverResponse.json() as UserModelPayload;
            const resolved = server.completion > 0 || server.stateText || Object.keys(server.survey ?? {}).length
              ? { ...EMPTY_PROFILE, ...server }
              : local;
            setProfile(resolved);
            setText(resolved.stateText ?? "");
            setStructuredState(resolved.structuredState ?? null);
            if (resolved === local && local.completion > 0) void persistProfile(local, true);
            return;
          }
        } else {
          setAuthState("guest");
        }
      } catch {
        if (!active) return;
        setAuthState("guest");
        setAiState("missing");
      }

      setProfile(local);
      setText(local.stateText ?? "");
      setStructuredState(local.structuredState ?? null);
    }

    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (step >= steps.length) setStep(Math.max(0, steps.length - 1));
  }, [step, steps.length]);

  function writeLocal(next: UserModelPayload) {
    try { localStorage.setItem("buysor-user-model", JSON.stringify(next)); } catch {}
  }

  async function persistProfile(next: UserModelPayload, silent = false) {
    writeLocal(next);
    if (authState !== "authenticated") {
      if (!silent) {
        setSaveState("saved");
        setMessage("이 브라우저에 임시 저장했습니다. 로그인하면 계정에 동기화됩니다.");
      }
      return true;
    }

    if (!silent) setSaveState("saving");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("save failed");
      const saved = await response.json() as UserModelPayload;
      setProfile(saved);
      writeLocal(saved);
      if (!silent) {
        setSaveState("saved");
        setMessage("계정에 저장했습니다.");
      }
      return true;
    } catch {
      if (!silent) {
        setSaveState("error");
        setMessage("계정 저장에 실패했습니다. 입력 내용은 이 브라우저에 임시 보관했습니다.");
      }
      return false;
    }
  }

  function updateText(value: string) {
    setText(value);
    setStructuredState(null);
    setAnalysisState("idle");
    setMessage("");
    const next = { ...profile, stateText: value, structuredState: null, completion: computeCompletion(value, answers) };
    setProfile(next);
    writeLocal(next);
    setSaveState("draft");
  }

  async function saveRawState() {
    const next = { ...profile, stateText: text.trim(), structuredState, completion: overallCompletion };
    setProfile(next);
    await persistProfile(next);
  }

  async function analyzeState() {
    const clean = text.trim();
    if (!clean) return;
    setAnalysisState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/profile/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      const payload = await response.json() as { error?: string; structuredState?: StructuredUserState; profile?: UserModelPayload };
      if (response.status === 503 && payload.error === "AI_NOT_CONFIGURED") {
        setAiState("missing");
        setAnalysisState("idle");
        setMessage("AI API가 연결되면 이 원문을 실제로 구조화합니다. 지금은 원문과 설문만 안전하게 저장할 수 있습니다.");
        await saveRawState();
        return;
      }
      if (response.status === 401) {
        setAnalysisState("error");
        setMessage("AI 분석을 계정에 저장하려면 먼저 로그인해 주세요.");
        return;
      }
      if (!response.ok || !payload.structuredState) throw new Error(payload.error || "analysis failed");

      setStructuredState(payload.structuredState);
      const next = payload.profile ?? {
        ...profile,
        stateText: clean,
        structuredState: payload.structuredState,
        completion: computeCompletion(clean, answers),
      };
      setProfile(next);
      writeLocal(next);
      setAnalysisState("done");
      setSaveState("saved");
      setMessage("바이저가 원문을 구조화했습니다. 틀린 항목이 있으면 원문을 수정하고 다시 분석하세요.");
    } catch (error) {
      setAnalysisState("error");
      setMessage(error instanceof Error ? error.message : "상태 분석에 실패했습니다.");
    }
  }

  function setAnswer(question: SurveyQuestion, value: string | number) {
    const nextAnswers = { ...answers, [question.id]: value };
    const category = typeof nextAnswers.category === "string" ? nextAnswers.category : "";
    const categoryProfiles = { ...(profile.categoryProfiles ?? {}) };
    if (current.id.startsWith("category-") && category) {
      categoryProfiles[category] = { ...(categoryProfiles[category] ?? {}), [question.id]: value };
    }
    const next: UserModelPayload = {
      ...profile,
      stateText: text,
      structuredState,
      survey: nextAnswers,
      categoryProfiles,
      completion: computeCompletion(text, nextAnswers),
    };
    setProfile(next);
    writeLocal(next);
    setSaveState("draft");
    setMessage("");
  }

  async function goNext() {
    await persistProfile({ ...profile, stateText: text, structuredState, completion: overallCompletion }, true);
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    await persistProfile({ ...profile, stateText: text, structuredState, completion: overallCompletion });
  }

  const traits = useMemo(() => {
    const value = (id: string) => typeof answers[id] === "number" ? Number(answers[id]) : null;
    const performance = value("performance");
    return [
      ["가격 민감도", performance === null ? null : 100 - performance],
      ["성능 우선도", performance],
      ["위험 회피도", value("risk")],
      ["장기 보유 성향", value("ownership")],
      ["중고 수용도", value("used")],
      ["재판매 중요도", value("resale")],
    ] as Array<[string, number | null]>;
  }, [answers]);

  const rows = structuredState ? [
    ["현재 제품", structuredState.currentProduct],
    ["주요 불만", structuredState.painPoint],
    ["편안한 예산", structuredState.comfortableBudget],
    ["최대 예산", structuredState.maximumBudget],
    ["중고 구매", structuredState.usedAccepted === null ? null : structuredState.usedAccepted ? "가능" : "선호하지 않음"],
    ["구매 긴급도", structuredState.urgency],
    ["예상 사용기간", structuredState.expectedUsePeriod],
    ["사용 환경", structuredState.environment],
    ["미래 계획", structuredState.futurePlan],
  ] : [];

  return (
    <div className={styles.profilePage}>
      <section className={styles.profileHero}>
        <div><span className="section-kicker">MY USER MODEL</span><h1>나를 이해할수록<br/>판단은 더 정확해집니다.</h1></div>
        <p>현재 상황, 보유 제품, 환경, 과거 구매, 예산, 미래 계획을 하나의 USER MODEL로 묶어 모든 구매 판단에 자동 반영합니다.</p>
      </section>

      <div className={styles.tabs}>
        <button data-active={tab === "state"} onClick={() => setTab("state")}>지금 내 상태 말하기</button>
        <button data-active={tab === "survey"} onClick={() => setTab("survey")}>정밀 구매 프로필</button>
      </div>

      {tab === "state" ? (
        <section className={styles.profilePanel}>
          <article className={styles.editorCard}>
            <h2>지금 어떤 상황인가요?</h2>
            <p>형식 없이 편하게 적으세요. AI가 연결되어 있을 때만 실제 의미 분석을 수행하며, 없는 정보는 임의로 만들어내지 않습니다.</p>
            <textarea
              className={styles.stateTextarea}
              value={text}
              maxLength={6000}
              onChange={(event) => updateText(event.target.value)}
              placeholder="예: 현재 쓰는 제품, 불편한 점, 편한 예산과 최대 예산, 중고 가능 여부, 언제 필요한지, 사용 환경, 앞으로의 계획 등을 자유롭게 적어주세요."
            />
            <div className={styles.exampleRow}>
              <button type="button" onClick={() => updateText(EXAMPLE_TEXT)}>예시 한번 넣어보기</button>
              {text ? <button type="button" onClick={() => updateText("")}>비우기</button> : null}
              <span>예시는 자동 저장되지 않으며 직접 입력한 내용만 USER MODEL에 반영합니다.</span>
            </div>
            <div className={styles.editorFooter}>
              <small>
                {aiState === "ready" ? "AI 의미 분석 가능" : aiState === "missing" ? "AI API 연결 전 · 원문 저장만 가능" : "AI 연결 상태 확인 중"}
              </small>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={!text.trim() || saveState === "saving"} onClick={saveRawState}>원문 저장</button>
                <button type="button" disabled={!text.trim() || analysisState === "loading"} onClick={analyzeState}>
                  {analysisState === "loading" ? <><LoaderCircle className="spin" size={15}/> 분석 중</> : <><Sparkles size={15}/> 바이저가 이해하기</>}
                </button>
              </div>
            </div>
            {message ? <p style={{ marginTop: 12, fontSize: 12, color: saveState === "error" || analysisState === "error" ? "var(--red)" : "var(--muted)" }}>{message}</p> : null}
            {authState === "guest" ? <a href="/login?return_to=%2Fprofile" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, fontWeight: 800, color: "var(--blue)" }}><LogIn size={14}/> 로그인하면 모든 기기에서 프로필을 이어갈 수 있습니다.</a> : null}
          </article>

          <aside className={styles.insightCard}>
            {!structuredState ? (
              <div className={styles.analysisEmpty}>
                <span>{aiState === "missing" ? "AI 연결 대기" : "아직 분석 전"}</span>
                <strong>{aiState === "missing" ? <>API 연결 후<br/>원문을 실제로 이해합니다.</> : <>내 상황을 적고<br/>“바이저가 이해하기”를 눌러주세요.</>}</strong>
                <p>가짜 분석값이나 미리 정해둔 답을 표시하지 않습니다.</p>
              </div>
            ) : (
              <>
                <div className={styles.insightCardHead}><strong>바이저가 이렇게 이해했습니다</strong><span className={styles.confirmed}><CheckCircle2 size={14}/> 분석 완료</span></div>
                <div className={styles.insightList}>
                  {rows.map(([label, value]) => <div className={styles.insightRow} key={label}><span>{label}</span><strong>{value || "확인 필요"}</strong></div>)}
                </div>
                {structuredState.mustHaves.length ? <div style={{ marginTop: 8, fontSize: 12 }}><strong>반드시 반영</strong><p style={{ color: "var(--muted)", lineHeight: 1.6 }}>{structuredState.mustHaves.join(" · ")}</p></div> : null}
                {structuredState.uncertainties.length ? <div style={{ marginTop: 8, fontSize: 12 }}><strong>추가 확인 필요</strong><p style={{ color: "var(--muted)", lineHeight: 1.6 }}>{structuredState.uncertainties.join(" · ")}</p></div> : null}
              </>
            )}
          </aside>
        </section>
      ) : (
        <>
          <section className={styles.surveyCard}>
            <div className={styles.surveyTop}>
              <span>{String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")} · {current.title}</span>
              <strong>{surveyPercent}% · {answeredCount}/{totalQuestions}문항</strong>
            </div>
            <div className={styles.surveyProgress}><span style={{ width: `${Math.round(((step + 1) / steps.length) * 100)}%` }}/></div>
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
                      {(question.options ?? []).map((option) => (
                        <button key={option} data-selected={answers[question.id] === option} onClick={() => setAnswer(question, option)}>{option}</button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.scaleRow}>
                      <span>{question.left}</span>
                      <input type="range" min="0" max="100" value={typeof answers[question.id] === "number" ? Number(answers[question.id]) : 50} onChange={(event) => setAnswer(question, Number(event.target.value))}/>
                      <span>{question.right}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={helpStyles.surveyNavWrap}>
              <div className={helpStyles.saveMeta} data-state={saveState === "saved" ? "saved" : saveState === "draft" || saveState === "saving" ? "draft" : "idle"}>
                <span className={helpStyles.saveDot}/>
                <span>{saveState === "saving" ? "계정에 저장 중" : saveState === "saved" ? (authState === "authenticated" ? "계정 저장 완료" : "브라우저 임시 저장 완료") : `답변 즉시 임시 저장 · ${answeredCount}/${totalQuestions}`}</span>
              </div>
              <div className={helpStyles.surveyButtons}>
                <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={15}/> 이전</button>
                <button onClick={goNext}>{step === steps.length - 1 ? "프로필 저장" : "다음"} <ChevronRight size={15}/></button>
              </div>
            </div>
          </section>

          <section className={styles.resultCard}>
            <div className={styles.traitGrid}>
              {traits.map(([label, value]) => <div className={styles.trait} key={label}><span>{label}</span><strong>{value === null ? "—" : Math.round(value)}</strong><div className={styles.traitBar}><i style={{ width: `${value ?? 0}%` }}/></div></div>)}
            </div>
            <div className={styles.resultCopy}>
              <h3>점수로 사람을 단정하지 않습니다.</h3>
              <p>예산 상한, 호환성, 실제 용도, 사용 환경 같은 강한 조건을 먼저 적용하고 성향 점수는 후보 우선순위와 설명 방식에만 사용합니다. 선택하지 않은 문항은 임의의 기본값으로 판단하지 않습니다.</p>
              <div style={{ marginTop: 12 }}><strong>전체 USER MODEL 완성도 {overallCompletion}%</strong></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function computeCompletion(text: string, answers: Record<string, string | number>) {
  const total = getSurveyQuestionCount(answers);
  const answered = Object.keys(answers).filter((key) => answers[key] !== "" && answers[key] !== undefined).length;
  const surveyPercent = total ? Math.min(100, (answered / total) * 100) : 0;
  return Math.min(100, Math.round((text.trim() ? 20 : 0) + (surveyPercent * 0.8)));
}
