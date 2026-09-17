"use client";

import {
  ArrowRight,
  Camera,
  Check,
  Coins,
  CreditCard,
  Grid2X2,
  ScanSearch,
} from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { usePreferences } from "@/components/preferences-provider";
import styles from "./home-mobile.module.css";
import { HomeStory } from "@/components/home-story";
import showroom from "./hero-showroom.module.css";

const features = [
  {
    icon: ScanSearch,
    href: "/lens",
    ko: ["Lens", "사진으로 바로 시작", "제품 사진·스크린샷·링크·제품명으로 시작하면 판단에 필요한 핵심 정보를 정리합니다."],
    en: ["Lens", "Start from a photo", "Start from a product photo, screenshot, link, or model name."],
  },
  {
    icon: Coins,
    href: "/credits",
    ko: ["크레딧", "필요한 만큼만", "무료 기능은 그대로 쓰고, AI 분석이 필요한 순간에만 크레딧을 사용합니다."],
    en: ["Credits", "Use only what you need", "Free browsing stays free. Credits are used only for AI analysis."],
  },
  {
    icon: CreditCard,
    href: "/pricing",
    ko: ["월 결제", "자주 쓸수록 간결하게", "매달 필요한 크레딧과 리포트 기능을 한 번에 관리하는 플랜입니다."],
    en: ["Membership", "Simple for frequent use", "Manage monthly credits and reports in one plan."],
  },
];

export default function Home() {
  const { language } = usePreferences();
  const ko = language === "ko";

  return (
    <SiteShell>
      <main className={styles.homeMain}>
        <section className={`${styles.hero} ${showroom.stage}`}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{ko ? "구매 고민, 이제 하나로." : "One place for every buying decision."}</span>
            <h1>
              <span>{ko ? "사진 한 장이면," : "One photo."}</span>
              <span><em>{ko ? "구매 결정" : "Decision"}</em>{ko ? " 끝." : " done."}</span>
            </h1>
            <p>
              {ko
                ? "전자제품·가전·전동공구까지. 사진이나 링크, 제품명으로 시작하면 제품 정보와 당신의 상황을 함께 보고 지금 사야 할지, 기다릴지, 사지 않을지 판단합니다."
                : "Electronics, appliances and power tools. Start with a photo, link or product name and BUYSOR decides whether to buy, wait or skip for your situation."}
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primary} href="/lens">
                <Camera size={18} /> {ko ? "사진으로 시작하기" : "Start with a photo"} <ArrowRight size={16} />
              </Link>
              <Link className={styles.secondary} href="/category">
                <Grid2X2 size={17} /> {ko ? "카테고리 보기" : "Browse categories"} <ArrowRight size={15} />
              </Link>
            </div>

            <div className={styles.proofs}>
              <span><Check size={14} /> {ko ? "사진·링크·제품명 모두 가능" : "Photo, link, or model name"}</span>
              <span><Check size={14} /> {ko ? "구매 시점까지 판단" : "Timing included"}</span>
              <span><Check size={14} /> {ko ? "광고 없는 판단" : "No sponsored ranking"}</span>
            </div>
          </div>

          <div className={`${styles.heroVisual} ${showroom.frame}`} aria-hidden="true">
            <picture>
              <source
                type="image/avif"
                srcSet="/buysor-studio-v6-1536.avif"
                width={1536}
                height={1024}
              />
              <img
                src="/buysor-home-showroom-20260917.webp"
                alt=""
                width={1536}
                height={1024}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
        </section>

        <section className={styles.quickSection}>
          <div className={styles.quickLead}>
            <span>HOW IT WORKS</span>
            <h2>{ko ? <>어려운 구매를,<br />쉽고 명확하게.</> : <>Hard choices,<br />made clear.</>}</h2>
            <p>
              {ko
                ? "정보를 더 쌓는 대신, 필요한 정보만 모아 하나의 결정으로 정리합니다."
                : "Less searching. More deciding. BUYSOR turns the right context into one clear decision."}
            </p>
          </div>

          <div className={styles.featureGrid}>
            {features.map(({ icon: Icon, href, ko: koText, en: enText }) => {
              const [title, subtitle, description] = ko ? koText : enText;
              return (
                <Link href={href} className={styles.featureCard} key={title}>
                  <div className={styles.featureIcon}><Icon size={22} /></div>
                  <div>
                    <strong>{title}</strong>
                    <span>{subtitle}</span>
                    <p>{description}</p>
                  </div>
                  <ArrowRight className={styles.cardArrow} size={17} />
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.decisionStrip}>
          <div>
            <span>BUY · WAIT · SKIP</span>
            <h2>{ko ? "추천보다 먼저, 지금 사야 하는지." : "Before recommendations, should you buy at all?"}</h2>
          </div>
          <Link href="/lens">{ko ? "구매 판단 시작" : "Start a decision"} <ArrowRight size={16} /></Link>
        </section>
        <HomeStory />
      </main>
    </SiteShell>
  );
}
