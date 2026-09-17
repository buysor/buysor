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
import {FEATURES,POLICY_VERSION} from "@/lib/commerce-policy";
import styles from "./decision-result.module.css";

type Runtime = { configured: boolean; provider: string | null; model: string | null };
type Auth = { authenticated: boolean; email?: string };
type Phase = "loading" | "ready" | "signin" | "missing-ai" | "running" | "result" | "error";

export function DecisionRunner() {
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
        setError("제품 입력 정보가 없습니다. Lens나 카테고리에서 다시 시작해 주세요.");
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
        setError("판단 준비 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setPhase("error");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const answerSummary = useMemo(() => {
    const labels: Record<string, string> = {
      purpose: "목적",
      budget: "예산",
      current: "보유 상태",
      condition: "신품·중고",
      timing: "구매 시점",
    };
    return Object.entries(answers)
      .filter(([key, value]) => key !== "note" && value)
      .map(([key, value]) => `${labels[key] ?? key}: ${String(value)}`);
  }, [answers]);

  async function run() {
    if (!draft || inFlight.current || !consent) return;
    if (!commerce?.aiReady || !commerce.authenticated || (commerce.balance?.available ?? 0)<FEATURES.standard.credits) {setError("이용 상태와 잔액을 확인해 주세요.");setPhase("error");return;}
    inFlight.current=true;
    requestKey.current ??= crypto.randomUUID();
    setPhase("running");
    setError("");
    try {
      const response = await fetch("/api/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, answers,requestKey:requestKey.current,policyVersion:POLICY_VERSION,acceptedCredits:FEATURES.standard.credits,feature:"standard" }),
      });
      const payload = await response.json() as { error?: string; code?:string;requestState?:string; result?: DecisionResult };
      if (response.status === 401) {
        setPhase("signin");
        return;
      }
      if (response.status === 503 && payload.code === "AI_NOT_CONFIGURED") {
        setPhase("missing-ai");
        return;
      }
      if (!response.ok || !payload.result) { if(payload.requestState==="failed"||payload.code==="REQUEST_FAILED")requestKey.current=null;throw new Error(payload.error || "구매 판단 생성에 실패했습니다.");}
      setResult(payload.result);
      setPhase("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "구매 판단 생성에 실패했습니다.");
      setPhase("error");
    } finally {inFlight.current=false;}
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className="section-kicker">BUYSOR DECISION</span>
          <h1>목록이 아니라,<br/>결론으로 끝냅니다.</h1>
        </div>
        <p>제품 입력과 이번 구매 조건, 저장된 USER MODEL을 함께 보고 BUY · WAIT · SKIP 중 하나를 먼저 판단합니다. 현재 정보로 확실히 말할 수 없는 부분은 추측하지 않고 추가 확인 항목으로 남깁니다.</p>
      </section>

      {draft ? <InputSummary draft={draft} answerSummary={answerSummary}/> : null}

      {phase === "loading" ? <Gate icon={<LoaderCircle className={styles.spin} size={24}/>} title="판단 준비 중" body="제품 입력, 로그인, AI 연결 상태를 확인하고 있습니다."/> : null}

      {phase === "missing-ai" ? (
        <Gate
          icon={<Sparkles size={25}/>} title="분석 서비스 준비 중"
          body="실제 판단 품질과 원가 제한을 검증 중입니다. 이용 준비가 되기 전에는 크레딧을 차감하지 않습니다."
          actions={<><a className={styles.secondary} href="/advisor">조건 다시 보기</a><a className={styles.primary} href="/profile">USER MODEL 확인</a></>}
        />
      ) : null}

      {phase === "signin" ? (
        <Gate
          icon={<LogIn size={25}/>} title="최종 판단을 저장하려면 로그인해 주세요."
          body="입력한 제품과 질문 답변은 이 브라우저에 유지됩니다. 로그인 후 이 페이지로 돌아오면 같은 입력으로 판단을 계속할 수 있습니다."
          actions={<><a className={styles.primary} href="/login?return_to=%2Fdecision"><LogIn size={15}/> Google 로그인</a><a className={styles.secondary} href="/advisor">조건 다시 보기</a></>}
        />
      ) : null}

      {phase === "ready" ? (
        <Gate icon={<ShieldCheck size={25}/>} title="시작 전, 사용량을 확인해 주세요."
          body={`표준 구매판단 ${FEATURES.standard.credits}C. 사진 입력 포함. 사용 가능 ${commerce?.balance?.available ?? '확인 중'}C. 현재는 제공한 정보를 기준으로 판단하며 실시간 시세 자동 검증은 포함하지 않습니다.`}
          actions={<><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{FEATURES.standard.credits}C 사용에 동의합니다.</label><button type="button" className={styles.primary} disabled={!consent||!commerce?.aiReady||(commerce.balance?.available??0)<FEATURES.standard.credits} onClick={run}>10C로 판단 시작 <ArrowRight size={15}/></button><a className={styles.secondary} href="/credits">잔액·충전 확인</a>{commerceError?<p role="alert">{commerceError}</p>:null}</>}/>
      ) : null}

      {phase === "running" ? (
        <Gate
          icon={<LoaderCircle className={styles.spin} size={25}/>} title="제품과 내 조건을 함께 판단 중"
          body="제품 입력 → USER MODEL → 이번 구매 조건 → BUY · WAIT · SKIP 순서로 분석합니다. 확인되지 않은 최신 가격이나 출시 정보는 임의로 만들어내지 않습니다."
        />
      ) : null}

      {phase === "error" ? (
        <Gate
          icon={<TriangleAlert size={25}/>} title="판단을 완료하지 못했습니다."
          body={error || "알 수 없는 오류가 발생했습니다."}
          actions={<><button type="button" className={styles.primary} onClick={() => draft ? void run() : window.location.assign("/lens")}><RefreshCw size={15}/> 다시 시도</button><a className={styles.secondary} href="/lens">Lens로 돌아가기</a></>}
        />
      ) : null}

      {phase === "result" && result ? <DecisionView result={result}/> : null}
    </div>
  );
}

function InputSummary({ draft, answerSummary }: { draft: DecisionDraft; answerSummary: string[] }) {
  const Icon = draft.type === "photo" ? Camera : draft.type === "link" ? Link2 : draft.type === "name" ? Search : FileText;
  return (
    <section className={styles.inputCard}>
      {draft.imageDataUrl ? <img className={styles.thumb} src={draft.imageDataUrl} alt="선택한 제품"/> : <div className={styles.inputIcon}><Icon size={20}/></div>}
      <div className={styles.inputCopy}>
        <span>이번 판단 입력</span>
        <strong>{draft.value}</strong>
        <small>{answerSummary.length ? answerSummary.join(" · ") : "조건 입력 완료"}{draft.note ? ` · ${draft.note}` : ""}</small>
      </div>
      <a className={styles.change} href="/advisor">조건 수정</a>
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

function DecisionView({ result }: { result: DecisionResult }) {
  return (
    <section className={styles.resultCard}>
      <div className={styles.verdict}>
        <div className={styles.badge} data-verdict={result.verdict}>{result.verdict}</div>
        <div className={styles.verdictCopy}>
          <span>BUYSOR FINAL DECISION</span>
          <h2>{result.headline}</h2>
          <p>{result.summary}</p>
          <div className={styles.confidence}><span>모델 자기평가 {Math.round(result.confidence)}% (검증된 정확도 아님)</span><i><span style={{width:`${result.confidence}%`}}/></i></div>
        </div>
      </div>

      <div className={styles.body}>
        {result.topPick ? (
          <article className={styles.topPick}>
            <div><span>1순위 선택</span><h3>{result.topPick.name}</h3><p>{result.topPick.why}</p></div>
            <div className={styles.price}><strong>{result.topPick.targetPrice || "가격 확인 필요"}</strong><small>{result.topPick.condition || "조건 확인 필요"}</small></div>
          </article>
        ) : null}

        <div className={styles.grid}>
          <ResultList icon={<CheckCircle2 size={14}/>} title="이 결론의 핵심 근거" items={result.reasons}/>
          <ResultList icon={<AlertTriangle size={14}/>} title="감수해야 할 트레이드오프" items={result.tradeoffs}/>
        </div>

        {result.waitFor || result.recheckAt ? <div className={styles.recheck}><Clock3 size={17}/><div><strong>다시 판단할 조건</strong><div>{result.waitFor || "조건 변화 시 재확인"}{result.recheckAt ? ` · ${result.recheckAt}` : ""}</div></div></div> : null}

        {result.alternatives.length ? (
          <article className={styles.section}>
            <div className={styles.sectionHead}><Sparkles size={14}/>대안</div>
            <div className={styles.alternatives}>{result.alternatives.map((item) => <div className={styles.alternative} key={`${item.name}-${item.whenBetter}`}><strong>{item.name}</strong><b>{item.whenBetter}</b><p>{item.reason}</p></div>)}</div>
          </article>
        ) : null}

        <div className={styles.grid}>
          {result.missingInformation.length ? <ResultList icon={<TriangleAlert size={14}/>} title="확인되지 않은 정보" items={result.missingInformation}/> : null}
          {result.userModelUsed.length ? <ResultList icon={<ShieldCheck size={14}/>} title="이번 판단에 반영된 내 조건" items={result.userModelUsed}/> : null}
        </div>

        <div className={styles.footer}><span>판단 결과는 계정 기록에 저장됩니다.</span><a className={styles.secondary} href="/my">내 바이저에서 기록 보기</a></div>
      </div>
    </section>
  );
}

function ResultList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items.length) return null;
  return <article className={styles.section}><div className={styles.sectionHead}>{icon}{title}</div><ul className={styles.list}>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}
