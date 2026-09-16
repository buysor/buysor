"use client";

import { ArrowRight, Camera, Grid2X2, Link2, Type } from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";
import styles from "./home-mobile.module.css";

const startMethods = [
  { icon: Camera, ko: "사진", en: "Photo", href: "/lens" },
  { icon: Link2, ko: "링크", en: "Link", href: "/lens?mode=link" },
  { icon: Type, ko: "제품명", en: "Product", href: "/lens?mode=name" },
  { icon: Grid2X2, ko: "카테고리", en: "Category", href: "/category" },
];

const signals = [
  { ko: ["예산", "무리 없이 쓸 수 있는 금액"], en: ["Budget", "What you can comfortably spend"] },
  { ko: ["용도", "실제로 가장 자주 할 일"], en: ["Use", "What you will actually do most"] },
  { ko: ["보유 제품", "교체가 정말 필요한지"], en: ["Current gear", "Whether an upgrade is really needed"] },
  { ko: ["환경", "집·현장·이동 등 실제 조건"], en: ["Environment", "Where and how you use it"] },
  { ko: ["시점", "지금 살지 기다릴지"], en: ["Timing", "Buy now or wait"] },
  { ko: ["계획", "이사·취업·여행·교체까지"], en: ["Plans", "What changes next"] },
];

export default function Home() {
  const { language } = usePreferences();
  const ko = language === "ko";

  return (
    <SiteShell>
      <main className={styles.homeMain}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.productName}>BUYSOR</span>
            <h1>
              {ko ? (
                <>
                  <span className={styles.heroTitleLine}>사진 한 장이면</span>
                  <span className={styles.heroTitleLine}>구매 고민 끝.</span>
                </>
              ) : (
                <>
                  <span className={styles.heroTitleLine}>One photo.</span>
                  <span className={styles.heroTitleLine}>Decision done.</span>
                </>
              )}
            </h1>
            <p>
              {ko
                ? "전자제품·가전·전동공구까지. 사진이나 링크, 제품명으로 시작하면 제품 정보와 당신의 상황을 함께 보고 BUY · WAIT · SKIP부터 판단합니다."
                : "Electronics, appliances and power tools. Start with a photo, link or product name and BUYSOR combines product information with your situation to decide BUY · WAIT · SKIP first."}
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="/lens"><Camera size={17} /> {ko ? "사진으로 시작하기" : "Start with a photo"}</a>
              <a className={styles.secondary} href="/category">{ko ? "카테고리 보기" : "Browse categories"} <ArrowRight size={15} /></a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <img src="/buysor-product-family.svg" alt={ko ? "전자제품, 가전, 전동공구를 함께 보여주는 BUYSOR 대표 이미지" : "BUYSOR hero showing electronics, appliances and power tools"} />
            <div className={styles.visualLegend} aria-label={ko ? "지원 카테고리" : "Supported categories"}>
              <span>{ko ? "전자제품" : "Electronics"}</span>
              <span>{ko ? "가전" : "Appliances"}</span>
              <span>{ko ? "전동공구" : "Power tools"}</span>
            </div>
            <div className={styles.visualFlow}>
              <span>{ko ? "제품 정보" : "PRODUCT"}</span>
              <i>+</i>
              <span>USER MODEL</span>
              <i>→</i>
              <strong>{ko ? "구매 판단" : "DECISION"}</strong>
            </div>
          </div>
        </section>

        <section className={styles.methodSection}>
          <div className={styles.methodCopy}>
            <span>{ko ? "모델명을 몰라도 됩니다." : "NO MODEL NAME REQUIRED"}</span>
            <h2>{ko ? "보여주거나, 붙여넣거나, 그냥 적으세요." : "Show it, paste it, or type it."}</h2>
            <p>{ko ? "입력 방식은 달라도 판단 방식은 같습니다. 제품 정보와 USER MODEL을 함께 봅니다." : "Different inputs, same decision engine. Product information is combined with your USER MODEL."}</p>
          </div>

          <div className={styles.methodLinks}>
            {startMethods.map(({ icon: Icon, ko: labelKo, en: labelEn, href }) => (
              <a href={href} key={labelKo}>
                <Icon size={20} />
                <span>{ko ? labelKo : labelEn}</span>
                <ArrowRight size={15} />
              </a>
            ))}
          </div>
        </section>

        <section className={styles.statementSection}>
          <span>BUY · WAIT · SKIP</span>
          <h2>{ko ? <>추천보다 먼저,<br />지금 사야 하는지.</> : <>Before recommendations,<br />should you buy at all?</>}</h2>
          <p>{ko ? "필요하면 1순위 제품까지. 필요하지 않으면 기다리거나 사지 않는 이유까지." : "When buying makes sense, get the top pick. When it does not, get the reason to wait or skip."}</p>
          <a href="/lens">{ko ? "구매 판단 시작" : "Start a decision"} <ArrowRight size={16} /></a>
        </section>

        <section className={styles.contextSection}>
          <div className={styles.contextLead}>
            <span>{ko ? "제품보다 당신부터" : "YOU BEFORE THE PRODUCT"}</span>
            <h2>{ko ? <>같은 제품도,<br />정답은 다릅니다.</> : <>Same product.<br />Different answer.</>}</h2>
            <p>{ko ? "BUYSOR는 스펙표만 비교하지 않습니다. 현재 상황과 앞으로의 계획까지 다음 판단에 반영합니다." : "BUYSOR does not stop at specifications. Your current situation and future plans change the decision."}</p>
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
          <span>BUYSOR</span>
          <h2>{ko ? "구매 고민을 끝내는 AI." : "AI that ends the buying decision."}</h2>
          <div>
            <a className={styles.primary} href="/lens"><Camera size={17} /> {ko ? "사진으로 시작하기" : "Start with a photo"}</a>
            <a className={styles.finalTextLink} href="/profile">{ko ? "나를 먼저 알려주기" : "Build my profile"} <ArrowRight size={15} /></a>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
