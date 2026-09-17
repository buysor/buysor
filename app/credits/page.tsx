import { Coins, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import styles from "../pricing/pricing.module.css";

const packs = [
  { amount: "60C", price: "5,900원", note: "가볍게 추가" },
  { amount: "180C", price: "14,900원", note: "가장 많이 쓰는 구간" },
  { amount: "500C", price: "34,900원", note: "깊은 분석을 넉넉하게" },
];

export default function CreditsPage() {
  return (
    <SiteShell compact>
      <main className={styles.page}>
        <section className={styles.creditsHero}>
          <div>
            <span>BUYSOR CREDIT</span>
            <h1>필요한 순간에만, 필요한 만큼.</h1>
            <p>검색과 카테고리 탐색은 무료로 두고, 실제 AI 분석과 판단처럼 비용이 발생하는 기능에만 크레딧을 사용합니다.</p>
          </div>
          <div className={styles.balance}><span>내 크레딧</span><strong>— C</strong><small>로그인 후 확인</small></div>
        </section>

        <div className={styles.notice}>아래 가격과 수량은 현재 시안값입니다. 결제 연동 전이며, 실제 판매가는 API 원가 검증 후 최종 확정됩니다.</div>

        <section className={styles.packGrid} aria-label="크레딧 충전 팩">
          {packs.map((pack) => (
            <article className={styles.pack} key={pack.amount}>
              <Coins size={24} />
              <strong>{pack.amount}</strong>
              <span>{pack.price}</span>
              <p>{pack.note}</p>
              <Link href="/login?return_to=/credits">구매 준비하기</Link>
            </article>
          ))}
        </section>

        <section className={styles.usageStrip}>
          <div><span>Lens</span><strong>1C</strong></div>
          <div><span>제품검색·카테고리</span><strong>0C</strong></div>
          <div><span>구매판단</span><strong>8C</strong></div>
          <div><span>동일 건 재판단</span><strong>4C</strong></div>
        </section>

        <section className={styles.policy}>
          <div><ShieldCheck size={18}/><strong>보너스 먼저 사용</strong><p>무료 보상 크레딧을 먼저 소진하고, 유료 크레딧은 뒤에 사용하도록 설계합니다.</p></div>
          <div><TimerReset size={18}/><strong>유효기간 분리</strong><p>보너스와 유료 크레딧의 만료 정책을 분리해 사용자가 손해 보지 않게 관리합니다.</p></div>
          <div><Sparkles size={18}/><strong>원가 기반 조정</strong><p>AI 모델 가격이 바뀌어도 서비스 전체 가격을 갈아엎지 않고 기능별 C만 조정할 수 있습니다.</p></div>
        </section>
      </main>
    </SiteShell>
  );
}
