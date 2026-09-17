import { Check, CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import styles from "./pricing.module.css";

const plans = [
  {
    name: "Essential",
    price: "5,900원",
    credits: "월 70C 제공",
    copy: "가볍게 시작하는 기본 플랜",
    features: ["Lens 기본 분석", "구매판단 기록 저장", "제품검색·카테고리", "기본 판단 리포트", "구매 히스토리"],
  },
  {
    name: "Plus",
    price: "9,900원",
    credits: "월 140C 제공",
    copy: "가장 균형 잡힌 핵심 플랜",
    featured: true,
    features: ["Essential의 모든 기능", "주간 리포트", "월간 리포트", "BUY·WAIT·SKIP 패턴", "재확인 큐", "구매 우선순위"],
  },
  {
    name: "Premium",
    price: "19,900원",
    credits: "월 320C 제공",
    copy: "더 깊은 분석이 필요한 사용자를 위한 플랜",
    features: ["Plus의 모든 기능", "구매 우선순위 심층 분석", "제품별 타임라인", "복수 구매 전략", "대안 시뮬레이션", "더 넓은 분석 한도"],
  },
];

export default function PricingPage() {
  return (
    <SiteShell compact>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span>결제 플랜</span>
            <h1>나에게 맞는 <em>구매 결정</em> 플랜.</h1>
            <p>필요한 만큼 쓰고, 더 깊은 판단이 필요할수록 더 넉넉하게. 무제한 대신 사용량이 보이는 구조로 설계합니다.</p>
          </div>
          <div className={styles.heroBadge}><CreditCard size={22} /><strong>월 결제</strong><small>시안 요금제</small></div>
        </section>

        <div className={styles.notice}>가격과 크레딧 수량은 현재 시안값이며, 실제 API 원가와 사용자 사용량 검증 후 조정될 수 있습니다.</div>

        <section className={styles.planGrid} aria-label="월 결제 플랜">
          {plans.map((plan) => (
            <article className={`${styles.planCard} ${plan.featured ? styles.featured : ""}`} key={plan.name}>
              {plan.featured ? <span className={styles.recommend}>추천 플랜</span> : null}
              <h2>{plan.name}</h2>
              <div className={styles.price}><strong>{plan.price}</strong><span>/ 월</span></div>
              <b>{plan.credits}</b>
              <p>{plan.copy}</p>
              <Link className={plan.featured ? styles.primaryCta : styles.secondaryCta} href="/login?return_to=/pricing">지금 시작하기</Link>
              <ul>
                {plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section className={styles.creditPanel}>
          <div className={styles.creditIntro}>
            <span>추가 크레딧</span>
            <h2>모자랄 때만 더.</h2>
            <p>월 플랜과 별개로 필요한 만큼 추가 충전합니다.</p>
          </div>
          <div className={styles.creditTiles}>
            {[['60C','5,900원'],['180C','14,900원'],['500C','34,900원']].map(([amount,price]) => (
              <Link href="/credits" className={styles.creditTile} key={amount}>
                <Sparkles size={17}/><div><strong>{amount}</strong><span>{price}</span></div><b>보기</b>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.usageStrip}>
          <div><span>Lens</span><strong>1C</strong></div>
          <div><span>제품검색·카테고리</span><strong>0C</strong></div>
          <div><span>구매판단</span><strong>8C</strong></div>
          <div><span>동일 건 재판단</span><strong>4C</strong></div>
        </section>
      </main>
    </SiteShell>
  );
}
