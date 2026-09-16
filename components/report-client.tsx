"use client";

import { useState } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import styles from "./buysor-features.module.css";

type ReportClientProps = { type: "weekly" | "monthly"; unlocked?: boolean };

const weekly = {
  metrics: [["총 판단", "12", "이번 주"], ["BUY", "3", "구매 추천"], ["WAIT", "7", "기다리기"], ["SKIP", "2", "구매하지 않기"]],
  bars: [["노트북", 82, "5"], ["전동공구", 63, "4"], ["가전", 42, "3"]],
  bullets: ["성능 부족에 민감하지만 즉시 구매보다 대기를 선택하는 비율이 높았습니다.", "중고 구매 가능 조건이 붙으면 예산 효율이 크게 개선됩니다.", "장기 보유를 선호해 교체 주기를 짧게 가져갈 이유가 적습니다."],
};

const monthly = {
  metrics: [["총 판단", "31", "이번 달"], ["실제 구매", "5", "완료"], ["보류", "18", "대기 중"], ["만족도", "8.4", "/10"]],
  bars: [["가격 민감도", 76, "+11"], ["중고 수용도", 81, "+13"], ["장기 보유", 91, "+4"], ["성능 우선", 83, "-3"]],
  bullets: ["후보를 비교할수록 최초 예산보다 상향되는 패턴이 반복됐습니다.", "중고 제품을 고려한 구매에서 가격 만족도가 높았습니다.", "앞으로 3개월은 노트북보다 업무 병목이 큰 공구 구매 우선순위를 높게 볼 수 있습니다."],
};

export function ReportClient({ type, unlocked = false }: ReportClientProps) {
  const data = type === "weekly" ? weekly : monthly;
  const isMonthly = type === "monthly";
  const [memberPreview, setMemberPreview] = useState(unlocked);

  return (
    <div className={styles.reportPage}>
      <section className={styles.reportHero}>
        <div><span className="section-kicker">{isMonthly ? "MONTHLY REPORT" : "WEEKLY REPORT"}</span><h1>{isMonthly ? "월간 리포트" : "주간 리포트"}</h1></div>
        <div>
          <p>{isMonthly ? "한 달의 구매 판단, 실제 구매, 만족도, 성향 변화를 묶어 다음 달 결정을 준비합니다." : "이번 주에 무엇을 고민했고 왜 기다렸는지, 다시 확인할 결정이 무엇인지 정리합니다."}</p>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button className={styles.secondaryButton} type="button" onClick={() => setMemberPreview((value) => !value)}>{memberPreview ? "무료 잠금 화면 보기" : "구독자 화면 직접 보기"}</button>
          </div>
        </div>
      </section>

      <section className={styles.reportShell}>
        <div className={styles.reportContent} data-locked={!memberPreview}>
          <div className={styles.reportTopStats}>{data.metrics.map(([label, value, note]) => <div className={styles.metric} key={label}><span>{label}</span><strong>{value}</strong><b>{note}</b></div>)}</div>
          <div className={styles.reportGrid}>
            <article className={styles.reportCard}><h2>{isMonthly ? "지난달 대비 구매 성향 변화" : "이번 주 가장 많이 고민한 카테고리"}</h2><div className={styles.barList}>{data.bars.map(([label, width, note]) => <div className={styles.barItem} key={String(label)}><span>{label}</span><div className={styles.bar}><span style={{width:`${width}%`}}/></div><strong>{note}</strong></div>)}</div></article>
            <article className={styles.reportCard}><h2>바이저가 본 반복 패턴</h2><ul className={styles.insightBullets}>{data.bullets.map((item) => <li key={item}>{item}</li>)}</ul></article>
          </div>
          <div className={styles.reportGrid}>
            <article className={styles.reportCard}><h2>{isMonthly ? "다음 달 다시 볼 결정" : "다시 확인할 결정"}</h2><div className={styles.decisionRow}><div><strong>MacBook Pro</strong><span>현재 제품 유지 가능 · 신제품 시점 근접</span></div><span className={styles.pill}>WAIT</span></div><div className={styles.decisionRow}><div><strong>전동공구 세트</strong><span>업무 병목 우선 해결 후보</span></div><span className={styles.pill}>REVIEW</span></div></article>
            <article className={styles.reportCard}><h2>{isMonthly ? "3개월 구매 시나리오" : "다음 주 체크 포인트"}</h2>{isMonthly ? <div className={styles.scenarioGrid}><div className={styles.scenario}><small>A</small><strong>노트북 지금 구매</strong><p>성능 문제 즉시 해결, 이후 예산 여유 감소</p></div><div className={styles.scenario} data-best="true"><small>B · 추천</small><strong>2개월 대기 + 공구 우선</strong><p>업무 병목 먼저 해결, 신제품 확인, 현금 여유 유지</p></div><div className={styles.scenario}><small>C</small><strong>모두 유지</strong><p>지출은 없지만 현재 불편 지속</p></div></div> : <ul className={styles.insightBullets}><li>노트북 가격과 신제품 일정 다시 확인</li><li>공구 실제 사용빈도와 보유 배터리 호환성 확인</li><li>최근 보류 이유가 여전히 유효한지 재판단</li></ul>}</article>
          </div>
        </div>

        {!memberPreview && <div className={styles.lockLayer}><div className={styles.lockCard}><div className={styles.lockIcon}><LockKeyhole size={22}/></div><h2>{isMonthly ? "월간 리포트" : "주간 리포트"}는 월 구독 전용입니다.</h2><p>무료 상태에서는 잠금 미리보기만 제공합니다. 실제 개인 리포트 데이터는 구독 권한을 확인한 사용자에게만 서버에서 전달됩니다.</p><button className={styles.primaryButton} type="button" onClick={() => setMemberPreview(true)}><Sparkles size={14}/> 미리보기에서 구독자 화면 확인</button></div></div>}
      </section>
      {memberPreview && <div className={styles.memberNote}><Sparkles size={14}/> 구독 회원 화면 예시 · 실제 운영에서는 권한 확인 후 표시</div>}
    </div>
  );
}
