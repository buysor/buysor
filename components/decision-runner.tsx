"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  LoaderCircle,
  LogIn,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { DecisionAnswers, DecisionDraft, DecisionResult } from "@/lib/buysor-types";
import {useCommerce} from "./commerce-client";
import {usePreferences} from "@/components/preferences-provider";
import {FEATURES,POLICY_VERSION} from "@/lib/commerce-policy";
import {trackEvent} from "@/lib/analytics-client";
import {DecisionFeedback} from "@/components/decision-feedback";
import {localizeError} from "@/lib/ui-locale";
import styles from "./decision-result.module.css";

type Runtime = { configured: boolean; provider: string | null; model: string | null };
type Auth = { authenticated: boolean; email?: string };
type Phase = "loading" | "ready" | "signin" | "missing-ai" | "running" | "result" | "error";

export function DecisionRunner() {
  const {language,market}=usePreferences();
  const ko=language==="ko";
  const {data:commerce,error:commerceError}=useCommerce();
  const [consent,setConsent]=useState(false);
  const requestKey=useRef<string|null>(null);
  const inFlight=useRef(false);
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [answers, setAnswers] = useState<DecisionAnswers>({});
  const [runtime, setRuntime] = useState<Runtime>({ configured: false, provider: null, model: null });
  const [auth, setAuth] = useState<Auth>({ authenticated: false });
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [decisionId,setDecisionId]=useState<string|null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      let nextDraft: DecisionDraft | null = null;
      let nextAnswers: DecisionAnswers = {};
      try {
        const rawDraft = sessionStorage.getItem("buysor-draft");
        const rawAnswers = sessionStorage.getItem("buysor-answers");
        if (rawDraft) nextDraft = JSON.parse(rawDraft) as DecisionDraft;
        if (rawAnswers) {
          const parsed = JSON.parse(rawAnswers) as { answers?: DecisionAnswers; note?: string };
          nextAnswers = { ...(parsed.answers ?? {}), note: parsed.note ?? parsed.answers?.note ?? "" };
        }
      } catch {}
      if (!active) return;
      setDraft(nextDraft);
      setAnswers(nextAnswers);
      if (!nextDraft) {
        setError(ko ? "제품 입력 정보가 없습니다. Lens나 카테고리에서 다시 시작해 주세요." : "No product input found. Start again from Lens or Category.");
        setPhase("error");
        return;
      }

      try {
        const [runtimeResponse, authResponse] = await Promise.all([
          fetch("/api/ai/status", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);
        const nextRuntime = await runtimeResponse.json() as Runtime;
        const nextAuth = await authResponse.json() as Auth;
        if (!active) return;
        setRuntime(nextRuntime);
        setAuth(nextAuth);
        if (!nextRuntime.configured) setPhase("missing-ai");
        else if (!nextAuth.authenticated) setPhase("signin");
        else setPhase("ready");
      } catch {
        if (!active) return;
        setError(ko ? "판단 준비 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." : "Could not check decision readiness. Please try again shortly.");
        setPhase("error");
      }
    }
    void load();
    return () => { active = false; };
  }, [ko]);

  const answerSummary = useMemo(() => {
    const labels: Record<string, string> = ko ? {
      purpose: "목적", budget: "예산", current: "보유 상태", condition: "신품·중고", timing: "구매 시점",
    } : {
      purpose: "Purpose", budget: "Budget", current: "Current setup", condition: "Condition", timing: "Timing",
    };
    return Object.entries(answers)
      .filter(([key, value]) => key !== "note" && value)
      .map(([key, value]) => `${labels[key] ?? key}: ${String(value)}`);
  }, [answers, ko]);

  async function run() {
    if (!draft || inFlight.current || !consent) return;
    if (!commerce?.aiReady || !commerce.authenticated || (commerce.balance?.available ?? 0)<FEATURES.standard.credits) {setError(ko?"이용 상태와 잔액을 확인해 주세요.":"Check your account status and credit balance.");setPhase("error");return;}
    inFlight.current=true;
    requestKey.current ??= crypto.randomUUID();
    setPhase("running");
    setError("");
    trackEvent("decision_started",{inputType:draft.type,credits:FEATURES.standard.credits});
    try {
      const response = await fetch("/api/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, answers,language,market,requestKey:requestKey.current,policyVersion:POLICY_VERSION,acceptedCredits:FEATURES.standard.credits,feature:"standard" }),
      });
      const payload = await response.json() as { id?:string; error?: string; code?:string;requestState?:string; result?: DecisionResult };
      if (response.status === 401) {
        setPhase("signin");
        return;
      }
      if (response.status === 503 && payload.code === "AI_NOT_CONFIGURED") {
        setPhase("missing-ai");
        return;
      }
      if (!response.ok || !payload.result) { if(payload.requestState==="failed"||payload.code==="REQUEST_FAILED")requestKey.current=null;throw new Error(localizeError(payload.error,language,ko?"구매 판단 생성에 실패했습니다.":"Could not create the purchase decision.",payload.code));}
      setResult(payload.result);
      setDecisionId(payload.id??null);
      trackEvent("decision_completed",{verdict:payload.result.verdict,inputType:draft.type,evidenceSources:payload.result.evidenceSources?.length??0});
      setPhase("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (ko?"구매 판단 생성에 실패했습니다.":"Could not create the purchase decision."));
      trackEvent("decision_failed",{inputType:draft?.type??"unknown"});
      setPhase("error");
    } finally {inFlight.current=false;}
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className="section-kicker">BUYSOR DECISION</span>
          <h1>{ko?<>목록이 아니라,<br/>결론으로 끝냅니다.</>:<>Not another list.<br/>A decision.</>}</h1>
        </div>
        <p>{ko?"제품 입력과 이번 구매 조건, 저장된 USER MODEL을 함께 보고 BUY · WAIT · SKIP 중 하나를 먼저 판단합니다. 최신 제품·가격·출시 정보는 필요할 때 웹 근거를 확인하고, 검증되지 않은 부분은 추측하지 않습니다.":"BUYSOR combines the product, this purchase's constraints and your USER MODEL, then decides BUY · WAIT · SKIP first. Current product, price and release facts are web-checked when needed; unverified facts stay clearly unverified."}</p>
      </section>

      {draft ? <InputSummary draft={draft} answerSummary={answerSummary} ko={ko}/> : null}

      {phase === "loading" ? <Gate icon={<LoaderCircle className={styles.spin} size={24}/>} title={ko?"판단 준비 중":"Preparing your decision"} body={ko?"제품 입력, 로그인, AI 연결 상태를 확인하고 있습니다.":"Checking product input, sign-in and AI availability."}/> : null}

      {phase === "missing-ai" ? (
        <Gate
          icon={<Sparkles size={25}/>} title={ko?"분석 서비스 준비 중":"Analysis service is preparing"}
          body={ko?"실제 판단 품질과 원가 제한을 검증 중입니다. 이용 준비가 되기 전에는 크레딧을 차감하지 않습니다.":"Decision quality and cost controls are still being validated. Credits are not charged until the service is ready."}
          actions={<><a className={styles.secondary} href="/advisor">{ko?"조건 다시 보기":"Review needs"}</a><a className={styles.primary} href="/profile">{ko?"USER MODEL 확인":"Check USER MODEL"}</a></>}
        />
      ) : null}

      {phase === "signin" ? (
        <Gate
          icon={<LogIn size={25}/>} title={ko?"최종 판단을 저장하려면 로그인해 주세요.":"Sign in to save the final decision."}
          body={ko?"입력한 제품과 질문 답변은 이 브라우저에 유지됩니다. 로그인 후 이 페이지로 돌아오면 같은 입력으로 판단을 계속할 수 있습니다.":"Your product and answers stay in this browser. Sign in and return here to continue with the same input."}
          actions={<><a className={styles.primary} href="/login?return_to=%2Fdecision"><LogIn size={15}/> {ko?"Google 로그인":"Sign in with Google"}</a><a className={styles.secondary} href="/advisor">{ko?"조건 다시 보기":"Review needs"}</a></>}
        />
      ) : null}

      {phase === "ready" ? (
        <Gate icon={<ShieldCheck size={25}/>} title={ko?"시작 전, 사용량을 확인해 주세요.":"Confirm usage before starting."}
          body={ko?`표준 구매판단 ${FEATURES.standard.credits}C. 사진 입력 포함. 사용 가능 ${commerce?.balance?.available ?? '확인 중'}C. 최신 제품·가격·출시 정보는 필요 시 웹 검색으로 검증합니다.`:`Standard decision ${FEATURES.standard.credits}C, photo included. Available: ${commerce?.balance?.available ?? 'checking'}C. Current product, pricing and release facts are web-checked when needed.`}
          actions={<><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{ko?`${FEATURES.standard.credits}C 사용에 동의합니다.`:`I agree to use ${FEATURES.standard.credits}C.`}</label><button type="button" className={styles.primary} disabled={!consent||!commerce?.aiReady||(commerce.balance?.available??0)<FEATURES.standard.credits} onClick={run}>{ko?"10C로 판단 시작":"Start decision for 10C"} <ArrowRight size={15}/></button><a className={styles.secondary} href="/credits">{ko?"잔액·충전 확인":"Check balance"}</a>{commerceError?<p role="alert">{commerceError}</p>:null}</>}/>
      ) : null}

      {phase === "running" ? (
        <Gate
          icon={<LoaderCircle className={styles.spin} size={25}/>} title={ko?"제품과 내 조건을 함께 판단 중":"Evaluating product and fit"}
          body={ko?"제품 입력 → USER MODEL → 이번 구매 조건 → 최신 웹 근거 → BUY · WAIT · SKIP 순서로 분석합니다.":"Analyzing product input → USER MODEL → purchase constraints → current web evidence → BUY · WAIT · SKIP."}
        />
      ) : null}

      {phase === "error" ? (
        <Gate
          icon={<TriangleAlert size={25}/>} title={ko?"판단을 완료하지 못했습니다.":"Could not complete the decision."}
          body={error || (ko?"알 수 없는 오류가 발생했습니다.":"An unknown error occurred.")}
          actions={<><button type="button" className={styles.primary} onClick={() => draft ? void run() : window.location.assign("/lens")}><RefreshCw size={15}/> {ko?"다시 시도":"Try again"}</button><a className={styles.secondary} href="/lens">{ko?"Lens로 돌아가기":"Back to Lens"}</a></>}
        />
      ) : null}

      {phase === "result" && result ? <DecisionView result={result} ko={ko} decisionId={decisionId}/> : null}
    </div>
  );
}

function InputSummary({ draft, answerSummary, ko }: { draft: DecisionDraft; answerSummary: string[]; ko: boolean }) {
  const Icon = draft.type === "photo" ? Camera : draft.type === "link" ? Link2 : draft.type === "name" ? Search : FileText;
  return (
    <section className={styles.inputCard}>
      {draft.imageDataUrl ? <img className={styles.thumb} src={draft.imageDataUrl} alt={ko?"선택한 제품":"Selected product"}/> : <div className={styles.inputIcon}><Icon size={20}/></div>}
      <div className={styles.inputCopy}>
        <span>{ko?"이번 판단 입력":"Decision input"}</span>
        <strong>{draft.value}</strong>
        <small>{answerSummary.length ? answerSummary.join(" · ") : (ko?"조건 입력 완료":"Needs completed")}{draft.note ? ` · ${draft.note}` : ""}</small>
      </div>
      <a className={styles.change} href="/advisor">{ko?"조건 수정":"Edit needs"}</a>
    </section>
  );
}

function Gate({ icon, title, body, actions }: { icon: React.ReactNode; title: string; body: string; actions?: React.ReactNode }) {
  return (
    <section className={styles.gateCard}>
      <div className={styles.gateInner}>
        <span className={styles.gateIcon}>{icon}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        {actions ? <div className={styles.gateActions}>{actions}</div> : null}
      </div>
    </section>
  );
}

function DecisionView({ result, ko, decisionId }: { result: DecisionResult; ko: boolean; decisionId:string|null }) {
  return (
    <section className={styles.resultCard}>
      <div className={styles.verdict}>
        <div className={styles.badge} data-verdict={result.verdict}>{result.verdict}</div>
        <div className={styles.verdictCopy}>
          <span>BUYSOR FINAL DECISION</span>
          <h2>{result.headline}</h2>
          <p>{result.summary}</p>
          <div className={styles.confidence}><span>{ko?"모델 자기평가":"Model self-assessment"} {Math.round(result.confidence)}% {ko?"(검증된 정확도 아님)":"(not validated accuracy)"}</span><i><span style={{width:`${result.confidence}%`}}/></i></div>
        </div>
      </div>

      <div className={styles.body}>
        {result.topPick ? (
          <article className={styles.topPick}>
            <div><span>{ko?"1순위 선택":"Top pick"}</span><h3>{result.topPick.name}</h3><p>{result.topPick.why}</p></div>
            <div className={styles.price}><strong>{result.topPick.targetPrice || (ko?"가격 확인 필요":"Price verification needed")}</strong><small>{result.topPick.condition || (ko?"조건 확인 필요":"Condition verification needed")}</small></div>
          </article>
        ) : null}

        <div className={styles.grid}>
          <ResultList icon={<CheckCircle2 size={14}/>} title={ko?"이 결론의 핵심 근거":"Why this decision"} items={result.reasons}/>
          <ResultList icon={<AlertTriangle size={14}/>} title={ko?"감수해야 할 트레이드오프":"Trade-offs"} items={result.tradeoffs}/>
        </div>

        {result.waitFor || result.recheckAt ? <div className={styles.recheck}><Clock3 size={17}/><div><strong>{ko?"다시 판단할 조건":"When to reconsider"}</strong><div>{result.waitFor || (ko?"조건 변화 시 재확인":"Recheck when conditions change")}{result.recheckAt ? ` · ${result.recheckAt}` : ""}</div></div></div> : null}

        {result.alternatives.length ? (
          <article className={styles.section}>
            <div className={styles.sectionHead}><Sparkles size={14}/>{ko?"대안":"Alternatives"}</div>
            <div className={styles.alternatives}>{result.alternatives.map((item) => <div className={styles.alternative} key={`${item.name}-${item.whenBetter}`}><strong>{item.name}</strong><b>{item.whenBetter}</b><p>{item.reason}</p></div>)}</div>
          </article>
        ) : null}

        <div className={styles.grid}>
          {result.missingInformation.length ? <ResultList icon={<TriangleAlert size={14}/>} title={ko?"확인되지 않은 정보":"Unverified information"} items={result.missingInformation}/> : null}
          {result.userModelUsed.length ? <ResultList icon={<ShieldCheck size={14}/>} title={ko?"이번 판단에 반영된 내 조건":"Your conditions used"} items={result.userModelUsed}/> : null}
        </div>

        {result.evidenceSources?.length ? <article className={styles.section}><div className={styles.sectionHead}><Search size={14}/>{ko?"웹 근거":"Web evidence"}</div><ul className={styles.list}>{result.evidenceSources.map((source)=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></article> : null}
        {decisionId ? <DecisionFeedback decisionId={decisionId} ko={ko}/> : null}
        <div className={styles.footer}><span>{ko?"판단 결과는 계정 기록에 저장됩니다.":"The decision is saved to your account history."}</span><a className={styles.secondary} href="/my">{ko?"내 바이저에서 기록 보기":"View history"}</a></div>
      </div>
    </section>
  );
}

function ResultList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items.length) return null;
  return <article className={styles.section}><div className={styles.sectionHead}>{icon}{title}</div><ul className={styles.list}>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}
