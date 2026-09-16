"use client";

import {
  ArrowRight,
  Camera,
  Grid2X2,
  Laptop,
  Smartphone,
  Tv,
  Wrench,
} from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";
import styles from "./home-mobile.module.css";

const signals = [
  { ko: ["예산", "무리 없이 쓸 수 있는 금액"], en: ["Budget", "What you can comfortably spend"] },
  { ko: ["용도", "실제로 가장 자주 할 일"], en: ["Use", "What you will actually do most"] },
  { ko: ["보유 제품", "교체가 정말 필요한지"], en: ["Current gear", "Whether an upgrade is really needed"] },
  { ko: ["사용 환경", "집·현장·이동 등 실제 조건"], en: ["Environment", "Where and how you really use it"] },
  { ko: ["구매 시점", "지금 살지 기다릴지"], en: ["Timing", "Buy now or wait"] },
  { ko: ["미래 계획", "이사·취업·여행·교체 계획까지"], en: ["Future plans", "What changes next"] },
];

const steps = [
  { ko: ["01", "보여주세요", "사진·스크린샷·링크·제품명 중 편한 방식으로 시작합니다."], en: ["01", "Show it", "Start with a photo, screenshot, link or product name."] },
  { ko: ["02", "당신을 반영합니다", "예산·보유 제품·환경·과거 경험·미래 계획을 함께 봅니다."], en: ["02", "Add your context", "Budget, current gear, environment, history and future plans."] },
  { ko: ["03", "결론으로 끝냅니다", "BUY · WAIT · SKIP, 그리고 필요할 때 1순위 모델까지 제시합니다."], en: ["03", "End with a decision", "BUY · WAIT · SKIP, plus the #1 pick when needed."] },
];

export default function Home() {
  const { language } = usePreferences();
  const ko = language === "ko";

  return (
    <SiteShell>
      <main className={styles.homeMain}>
        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{ko ? "치트키는 사진입니다." : "THE SHORTCUT IS A PHOTO."}</span>
            <h1>
              {ko ? <>사진 한 장이면,<br /><em>구매 결정 끝.</em></> : <>One photo.<br /><em>Decision done.</em></>}
            </h1>
            <p>
              {ko
                ? "추천 목록을 더 늘리지 않습니다. 제품과 당신의 상황을 함께 보고, 지금 사야 하는지부터 무엇을 사야 하는지까지 하나의 결론으로 정리합니다."
                : "No more endless recommendation lists. BUYSOR combines the product with your real situation and resolves whether to buy, wait or skip — and what to buy when the answer is yes."}
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primary} href="/lens"><Camera size={18} /> {ko ? "사진으로 시작하기" : "Start with a photo"}</a>
              <a className={styles.secondary} href="/category"><Grid2X2 size={17} /> {ko ? "카테고리로 찾기" : "Browse by category"} <ArrowRight size={15} /></a>
            </div>

            <div className={styles.heroMeta}>
              <span>{ko ? "전자제품 · 가전 · 전동공구" : "Electronics · appliances · tools"}</span>
              <span>{ko ? "신품 · 중고 · 감가 · 시점" : "New · used · resale · timing"}</span>
            </div>
          </div>

          <div className={styles.lensArtwork} aria-label={ko ? "BUYSOR Lens 분석 흐름" : "BUYSOR Lens analysis flow"}>
            <div className={styles.artGlow} aria-hidden="true" />
            <div className={styles.viewfinder} aria-hidden="true">
              <i className={styles.cornerA} />
              <i className={styles.cornerB} />
              <i className={styles.cornerC} />
              <i className={styles.cornerD} />
              <div className={styles.scanLine} />
            </div>

            <div className={`${styles.product} ${styles.productLaptop}`}><Laptop size={82} strokeWidth={1.3} /></div>
            <div className={`${styles.product} ${styles.productPhone}`}><Smartphone size={60} strokeWidth={1.35} /></div>
            <div className={`${styles.product} ${styles.productTool}`}><Wrench size={64} strokeWidth={1.35} /></div>
            <div className={`${styles.product} ${styles.productTv}`}><Tv size={66} strokeWidth={1.35} /></div>

            <div className={styles.visualLabel}>
              <span>BUYSOR LENS</span>
              <strong>{ko ? "제품을 보고, 당신까지 봅니다." : "See the product. Understand the person."}</strong>
            </div>

            <div className={styles.lensStatus}>
              <div className={styles.statusTitle}>
                <Camera size={18} />
                <div>
                  <span>{ko ? "사진을 넣으면" : "WHEN YOU ADD A PHOTO"}</span>
                  <strong>{ko ? "제품 인식부터 시작합니다." : "Product recognition starts here."}</strong>
                </div>
              </div>
              <div className={styles.statusChips}>
                <span>{ko ? "제품 식별" : "Product"}</span>
                <span>{ko ? "가격" : "Price"}</span>
                <span>{ko ? "상태" : "Condition"}</span>
                <span>{ko ? "주변 단서" : "Context"}</span>
              </div>
              <div className={styles.statusFlow}>
                <b>{ko ? "제품 정보" : "PRODUCT"}</b>
                <i>+</i>
                <b>USER MODEL</b>
                <i>→</i>
                <strong>{ko ? "구매 판단" : "DECISION"}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.stepsSection}>
          <div className={styles.sectionIntro}>
            <span>{ko ? "어렵게 시작하지 않습니다." : "NO LEARNING CURVE"}</span>
            <h2>{ko ? <>보여주고,<br />답을 받으세요.</> : <>Show it.<br />Get the answer.</>}</h2>
          </div>
          <div className={styles.stepsGrid}>
            {steps.map((item) => {
              const [number, title, body] = ko ? item.ko : item.en;
              return (
                <article key={number}>
                  <span>{number}</span>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </article>
              );
            })}
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
            <span>{ko ? "정보를 더 주는 서비스가 아니라" : "NOT MORE INFORMATION"}</span>
            <h2>{ko ? "구매 고민을 끝내는 서비스." : "The service that ends the decision."}</h2>
          </div>
          <a href="/lens">{ko ? "사진으로 결정 시작" : "Start deciding"} <ArrowRight size={17}/></a>
        </section>
      </main>
    </SiteShell>
  );
}
