"use client";

import { ArrowRight, Camera, Grid2X2 } from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";
import styles from "./home-mobile.module.css";

const signals = [
  { ko: ["예산", "무리 없이 쓸 수 있는 금액"], en: ["Budget", "What you can comfortably spend"] },
  { ko: ["용도", "실제로 가장 자주 할 일"], en: ["Use", "What you will actually do most"] },
  { ko: ["보유 제품", "교체가 정말 필요한지"], en: ["Current gear", "Whether an upgrade is really needed"] },
  { ko: ["사용 환경", "집·현장·이동 등 실제 조건"], en: ["Environment", "Where and how you actually use it"] },
  { ko: ["구매 시점", "지금 살지 기다릴지"], en: ["Timing", "Buy now or wait"] },
  { ko: ["미래 계획", "이사·취업·여행·교체 계획까지"], en: ["Future plans", "What changes next"] },
];

export default function Home() {
  const { language } = usePreferences();
  const ko = language === "ko";

  return (
    <SiteShell>
      <main className={styles.homeMain}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{ko ? "구매 고민을 끝내는 AI" : "AI FOR BUYING DECISIONS"}</span>
            <h1>
              {ko ? <>사진 한 장이면,<br /><em>구매 결정 끝.</em></> : <>One photo.<br /><em>One clear decision.</em></>}
            </h1>
            <p>
              {ko
                ? "추천 목록을 더 늘리지 않습니다. 예산·용도·보유 제품·환경·구매 시점까지 보고, 지금 사야 하는지부터 무엇을 사야 하는지까지 정리합니다."
                : "No more endless recommendation lists. BUYSOR considers your budget, use, current gear, environment and timing, then resolves whether to buy and what to buy."}
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primary} href="/lens"><Camera size={18} /> {ko ? "사진으로 시작하기" : "Start with a photo"}</a>
              <a className={styles.secondary} href="/category"><Grid2X2 size={17} /> {ko ? "카테고리로 찾기" : "Browse by category"} <ArrowRight size={15} /></a>
            </div>

            <div className={styles.heroMeta}>
              <span>{ko ? "사진 · 스크린샷 · 링크 · 제품명" : "Photo · screenshot · link · product"}</span>
              <span aria-hidden="true">•</span>
              <span>{ko ? "신품 · 중고 · 시점 · 감가" : "New · used · timing · resale"}</span>
            </div>
          </div>

          <div className={styles.decisionStage} aria-label={ko ? "BUYSOR의 구매 판단 예시" : "BUYSOR decision example"}>
            <div className={styles.stageTop}>
              <span>BUYSOR</span>
              <small>{ko ? "당신의 상황에 따라 답이 달라집니다" : "The answer changes with your context"}</small>
            </div>
            <div className={`${styles.stageRow} ${styles.buy}`}>
              <strong>BUY</strong>
              <span>{ko ? "지금 사는 게 맞을 때" : "Buy now"}</span>
            </div>
            <div className={`${styles.stageRow} ${styles.wait}`}>
              <strong>WAIT</strong>
              <span>{ko ? "기다리는 게 더 이득일 때" : "Wait"}</span>
            </div>
            <div className={`${styles.stageRow} ${styles.skip}`}>
              <strong>SKIP</strong>
              <span>{ko ? "지금은 살 이유가 없을 때" : "Skip"}</span>
            </div>
            <div className={styles.stageFoot}>{ko ? "BUY라면 1순위 모델과 이유까지." : "If BUY, you also get the #1 pick and why."}</div>
          </div>
        </section>

        <section className={styles.contextSection}>
          <div className={styles.sectionHead}>
            <h2>{ko ? <>제품보다,<br />당신부터 봅니다.</> : <>You first.<br />Products second.</>}</h2>
            <p>{ko ? "같은 제품도 사람과 상황이 다르면 정답이 달라집니다." : "The same product can be right for one person and wrong for another."}</p>
          </div>
          <div className={styles.signalList}>
            {signals.map((item, index) => {
              const [title, detail] = ko ? item.ko : item.en;
              return (
                <div className={styles.signalRow} key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.finalSection}>
          <div>
            <span>{ko ? "정보를 더 주는 서비스가 아니라" : "Not more information"}</span>
            <h2>{ko ? "결정을 끝내는 서비스." : "A service that ends the decision."}</h2>
          </div>
          <a href="/lens">{ko ? "사진으로 결정 시작" : "Start deciding"} <ArrowRight size={17}/></a>
        </section>
      </main>
    </SiteShell>
  );
}
