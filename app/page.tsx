"use client";

import {
  ArrowRight,
  Ban,
  CalendarClock,
  Camera,
  CheckCircle2,
  Grid2X2,
  PackageCheck,
  Search,
  UserRound,
} from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";

const signals = [
  { ko: ["예산", "무리 없이 쓸 수 있는 금액"], en: ["Budget", "What you can comfortably spend"] },
  { ko: ["용도", "실제로 가장 자주 할 일"], en: ["Use", "What you will actually do most"] },
  { ko: ["보유 제품", "교체가 정말 필요한지"], en: ["What you own", "Whether an upgrade is necessary"] },
  { ko: ["구매 시점", "지금 살지 기다릴지"], en: ["Timing", "Buy now or wait"] },
  { ko: ["신품 · 중고", "가격과 상태, AS까지"], en: ["New · used", "Price, condition and warranty"] },
  { ko: ["감가 · 재판매", "나중에 남는 가치"], en: ["Resale", "What it may be worth later"] },
];

export default function Home() {
  const { language } = usePreferences();
  const ko = language === "ko";

  return (
    <SiteShell>
      <main>
        <section className="home-launch-hero">
          <div className="home-launch-copy">
            <span className="section-kicker">BUYSOR DECISION ENGINE</span>
            <h1>
              {ko ? <>검색은 충분합니다.<br /><span>결정이 필요합니다.</span></> : <>You have enough search.<br /><span>Now make the decision.</span></>}
            </h1>
            <p>
              {ko
                ? "BUYSOR는 제품을 먼저 늘어놓지 않습니다. 당신의 예산·용도·보유제품·구매시점을 먼저 보고, 지금 살지부터 무엇을 살지까지 하나의 결론으로 정리합니다."
                : "BUYSOR does not start with a wall of products. It starts with your budget, use, current gear and timing, then resolves whether to buy and what to buy."}
            </p>
            <div className="home-launch-actions">
              <a className="home-primary-cta" href="/lens"><Camera size={18} /> {ko ? "사진으로 결정 시작" : "Start with a photo"}</a>
              <a className="home-secondary-cta" href="/category"><Grid2X2 size={18} /> {ko ? "카테고리로 찾기" : "Browse by category"}</a>
            </div>
            <div className="home-launch-meta">
              <span><CheckCircle2 size={14} /> {ko ? "BUY · WAIT · SKIP" : "BUY · WAIT · SKIP"}</span>
              <span><CheckCircle2 size={14} /> {ko ? "신품 · 중고 · 시점" : "New · used · timing"}</span>
              <span><CheckCircle2 size={14} /> {ko ? "감가 · 재판매까지" : "Depreciation · resale"}</span>
            </div>
          </div>

          <div className="home-decision-visual" aria-label={ko ? "BUYSOR 의사결정 흐름" : "BUYSOR decision flow"}>
            <div className="home-decision-inputs">
              <span>{ko ? "예산" : "Budget"}</span>
              <span>{ko ? "용도" : "Use"}</span>
              <span>{ko ? "보유 제품" : "Current gear"}</span>
              <span>{ko ? "구매 시점" : "Timing"}</span>
            </div>
            <div className="home-decision-line" aria-hidden="true" />
            <div className="home-decision-core">
              <small>PERSONAL DECISION</small>
              <strong>BUYSOR</strong>
              <span>{ko ? "조건 × 시장 × 시점" : "Context × market × timing"}</span>
            </div>
            <div className="home-decision-line home-decision-line--out" aria-hidden="true" />
            <div className="home-decision-outcome">
              <div><b className="is-buy">BUY</b><b>WAIT</b><b>SKIP</b></div>
              <strong>{ko ? "지금 산다면 1순위까지" : "If BUY, the #1 pick too"}</strong>
              <span>{ko ? "추천 목록으로 다시 고민시키지 않습니다." : "No second round of list fatigue."}</span>
            </div>
          </div>
        </section>

        <section className="home-difference-section">
          <div className="section-title-row home-difference-title">
            <div>
              <span className="section-kicker">WHY BUYSOR</span>
              <h2>{ko ? <>추천 목록이 아니라,<br />결정을 만듭니다.</> : <>Not another list.<br />A decision.</>}</h2>
            </div>
            <p>{ko ? "기존 검색은 정보를 더 줍니다. BUYSOR는 서로 충돌하는 정보를 당신의 조건으로 정리합니다." : "Search gives you more information. BUYSOR resolves conflicting information against your situation."}</p>
          </div>

          <div className="home-compare-map">
            <article className="home-compare-card home-compare-card--old">
              <div className="home-compare-card-head"><Search size={19} /><strong>{ko ? "일반 검색 · 추천" : "Typical search · recommendation"}</strong></div>
              <div className="home-flow-row"><span>{ko ? "검색" : "Search"}</span><ArrowRight size={14} /><span>{ko ? "추천 목록" : "Product list"}</span><ArrowRight size={14} /><span>{ko ? "리뷰 비교" : "Compare reviews"}</span><ArrowRight size={14} /><b>{ko ? "다시 고민" : "Still deciding"}</b></div>
              <p>{ko ? "정보는 늘지만 최종 책임은 다시 사용자에게 돌아옵니다." : "More information, but the final decision is still yours to reconstruct."}</p>
            </article>

            <article className="home-compare-card home-compare-card--buysor">
              <div className="home-compare-card-head"><UserRound size={19} /><strong>BUYSOR</strong></div>
              <div className="home-flow-row"><span>{ko ? "나의 조건" : "My context"}</span><ArrowRight size={14} /><span>{ko ? "가격·시점·중고·감가" : "Price · timing · resale"}</span><ArrowRight size={14} /><b>BUY · WAIT · SKIP</b><ArrowRight size={14} /><strong>{ko ? "1순위 모델" : "#1 model"}</strong></div>
              <p>{ko ? "제품보다 사용자를 먼저 보고, 구매 여부와 구체적인 선택까지 한 흐름으로 끝냅니다." : "It starts with the person, then resolves both the timing and the exact product."}</p>
            </article>
          </div>
        </section>

        <section className="decision-triptych" aria-label={ko ? "세 가지 구매 결정" : "Three purchase decisions"}>
          <article className="buy-card">
            <PackageCheck aria-hidden="true" size={22} />
            <strong>BUY</strong>
            <span>{ko ? "조건과 시점이 맞을 때" : "When product and timing fit"}</span>
          </article>
          <article className="wait-card">
            <CalendarClock aria-hidden="true" size={22} />
            <strong>WAIT</strong>
            <span>{ko ? "조금 더 기다리는 게 나을 때" : "When waiting is the better move"}</span>
          </article>
          <article className="skip-card">
            <Ban aria-hidden="true" size={22} />
            <strong>SKIP</strong>
            <span>{ko ? "지금은 필요하지 않을 때" : "When you do not need it"}</span>
          </article>
        </section>

        <section className="signal-section signal-section--compact">
          <div className="section-title-row">
            <h2>{ko ? <>주특기는 제품 추천이 아니라,<br />당신에게 맞는 판단입니다.</> : <>The specialty is not recommendation.<br />It is fit.</>}</h2>
            <p>{ko ? "같은 제품도 사람과 상황이 다르면 답이 달라집니다." : "The same product can be right for one person and wrong for another."}</p>
          </div>
          <div className="signal-grid">
            {signals.map((item, index) => {
              const [title, detail] = ko ? item.ko : item.en;
              return (
                <article key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{title}</strong><p>{detail}</p></div>
                </article>
              );
            })}
          </div>
          <div className="home-final-actions">
            <a className="home-primary-cta" href="/lens">{ko ? "사진으로 시작하기" : "Start with a photo"} <ArrowRight aria-hidden="true" size={17} /></a>
            <a className="home-secondary-cta" href="/category">{ko ? "제품군부터 찾기" : "Start from a category"} <ArrowRight aria-hidden="true" size={17} /></a>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
