"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, XCircle } from "lucide-react";

type Health = {
  ok: boolean;
  app: boolean;
  database: { binding: boolean; ready: boolean; tables: Record<string, boolean>; error?: string };
  ai: { configured: boolean; provider: string | null; model: string | null };
  googleAuth: { configured: boolean };
  billing: { configured: boolean; note: string };
};

export function LaunchCheck() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("상태 확인 실패");
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "상태 확인 실패"));
  }, []);

  if (error) return <div style={{ padding: 24, border: "1px solid var(--line)", borderRadius: 20 }}>{error}</div>;
  if (!health) return <div style={{ minHeight: 300, display: "grid", placeItems: "center" }}><LoaderCircle className="spin" size={28}/></div>;

  const rows = [
    ["웹 앱", health.app, "페이지와 Worker 런타임"],
    ["D1 연결", health.database.binding, health.database.ready ? "핵심 테이블 준비 완료" : "마이그레이션 적용 필요"],
    ["Google 로그인 설정", health.googleAuth.configured, "Client ID · Secret · Session Secret"],
    ["AI 판단 엔진", health.ai.configured, health.ai.configured ? `${health.ai.provider} · ${health.ai.model}` : "AI_PROVIDER · AI_MODEL · API Key 필요"],
    ["유료 결제", health.billing.configured, "등급 권한은 준비됨 · 결제 제공자 연결은 별도"],
  ] as const;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px,.6fr)", gap: 28, alignItems: "end" }}>
        <div><span className="section-kicker">RELEASE READINESS</span><h1 style={{ margin: "10px 0 0", fontSize: "clamp(42px,6vw,70px)", lineHeight: 1, letterSpacing: "-.07em" }}>출시 전,<br/>남은 것만 봅니다.</h1></div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>가짜 데모가 아니라 실제 런타임·DB·로그인·AI 연결 상태를 확인합니다. 초록색은 현재 구동 가능, 빨간색은 외부 연결 또는 마이그레이션이 남은 항목입니다.</p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        {rows.map(([label, ready, note]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "36px minmax(130px,.4fr) minmax(0,1fr)", gap: 12, alignItems: "center", padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 15, background: "var(--paper)" }}>{ready ? <CheckCircle2 size={20} style={{ color: "var(--green)" }}/> : <XCircle size={20} style={{ color: "var(--red)" }}/>}<strong style={{ fontSize: 13 }}>{label}</strong><span style={{ color: "var(--muted)", fontSize: 12 }}>{note}</span></div>)}
      </section>

      {!health.database.ready ? <section style={{ padding: 18, border: "1px solid color-mix(in srgb,var(--amber) 35%,var(--line))", borderRadius: 17, background: "color-mix(in srgb,var(--amber) 6%,var(--paper))" }}><div style={{ display: "flex", gap: 9, alignItems: "center" }}><CircleAlert size={18} style={{ color: "var(--amber)" }}/><strong>D1 마이그레이션 필요</strong></div><p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>새 USER MODEL·판단 기록·구독·피드백 테이블이 아직 원격 DB에 없으면 관련 기능은 503으로 실패합니다. 코드와 migration 파일은 이미 준비되어 있습니다.</p></section> : null}

      <section style={{ padding: 18, border: "1px solid var(--line)", borderRadius: 17, background: "var(--surface)" }}>
        <strong style={{ fontSize: 13 }}>DB 테이블</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>{Object.entries(health.database.tables).map(([name, ready]) => <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 999, background: "var(--paper)", border: "1px solid var(--line)", fontSize: 10 }}>{ready ? <CheckCircle2 size={12} style={{ color: "var(--green)" }}/> : <XCircle size={12} style={{ color: "var(--red)" }}/>} {name}</span>)}</div>
      </section>
    </div>
  );
}
