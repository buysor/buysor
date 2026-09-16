"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import styles from "./buysor-features.module.css";

type ReportClientProps = { type: "weekly" | "monthly" };
type Tier = "essential" | "plus" | "premium";

type ReportData = {
  metrics: string[][];
  bars: Array<[string, number, string]>;
  bullets: string[];
};

const weekly: ReportData = {
  metrics: [
    ["총 판단", "12", "이번 주"],
    ["BUY", "3", "구매 추천"],
    ["WAIT", "7", "기다리기"],
    ["SKIP", "2", "구매하지 않기"],
  ],
  bars: [["노트북", 82, "5"], ["전동공구", 63, "4"], ["가전", 42, "3"]],
  bullets: [
    "성능 부족에 민감하지만 즉시 구매보다 대기를 선택하는 비율이 높았습니다.",
    "중고 구매 가능 조건이 붙으면 예산 효율이 크게 개선됩니다.",
    "장기 보유를 선호해 교체 주기를 짧게 가져갈 이유가 적습니다.",
  ],
};

const monthly: ReportData = {
  metrics: [
    ["총 판단", "31", "이번 달"],
    ["실제 구매", "5", "완료"],
    ["보류", "18", "대기 중"],
    ["만족도", "8.4", "/10"],
  ],
  bars: [["가격 민감도", 76, "+11"], ["중고 수용도", 81, "+13"], ["장기 보유", 91, "+4"], ["성능 우선", 83, "-3"]],
  bullets: [
    "후보를 비교할수록 최초 예산보다 상향되는 패턴이 반복됐습니다.",
    "중고 제품을 고려한 구매에서 가격 만족도가 높았습니다.",
    "앞으로 3개월은 노트북보다 업무 병목이 큰 공구 구매 우선순위를 높게 볼 수 있습니다.",
  ],
};

const tierCopy: Record<Tier, { title: string; summary: string; features: string[] }> = {
  essential: {
    title: "Essential",
    summary: "개인화 구매 판단의 시작",
    features: ["USER MODEL", "정밀 구매 프로필", "구매 판단·기록"],
  },
  plus: {
    title: "Plus",
    summary: "내 구매 패턴을 읽는 리포트",
    features: ["주간 리포트", "월간 리포트", "성향 변화·재확인 큐"],
  },
  premium: {
    title: "Premium",
    summary: "앞으로의 구매까지 설계",
    features: ["Plus 전체", "3개+ 대안 시뮬레이션", "90일 구매 전략·후회 위험"],
  },
};

const premiumWeekly = {
  priorities: [
    ["1", "전동공구 세트", "업무 병목이 커서 먼저 검토", "이번 주"],
    ["2", "MacBook Pro", "신제품·가격 확인 후 재판단", "2~4주"],
    ["3", "스마트폰", "현재 제품으로 충분", "90일+"],
  ],
  timing: [
    ["지금", "공구 호환성·중고 시세 확인"],
    ["2주", "노트북 신제품 일정 재확인"],
    ["1개월", "예산 여력 다시 계산"],
    ["3개월", "보류한 구매 전체 재평가"],
  ],
};

const premiumMonthly = {
  priorities: [
    ["1", "업무 병목 해결", "전동공구", "높음"],
    ["2", "성능 업그레이드", "노트북", "보통"],
    ["3", "편의성 개선", "스마트폰", "낮음"],
  ],
  timing: [
    ["9월", "보유 공구·배터리 플랫폼 정리"],
    ["10월", "노트북 신제품·가격 추세 재판단"],
    ["11월", "구매 후 만족도와 다음 예산 재설정"],
    ["12월", "다음 분기 구매 계획 확정"],
  ],
};

export function ReportClient({ type }: ReportClientProps) {
  const data = type === "weekly" ? weekly : monthly;
  const isMonthly = type === "monthly";
  const [tier, setTier] = useState<Tier>("plus");
  const locked = tier === "essential";
  const premium = tier === "premium";
  const premiumData = isMonthly ? premiumMonthly : premiumWeekly;

  return (
    <div className={styles.reportPage}>
      <section className={styles.reportHero}>
        <div>
          <span className="section-kicker">{isMonthly ? "MONTHLY REPORT" : "WEEKLY REPORT"}</span>
          <h1>{isMonthly ? "월간 리포트" : "주간 리포트"}</h1>
        </div>
        <p>
          {isMonthly
            ? "한 달의 구매 판단, 실제 구매, 만족도와 성향 변화를 묶어 다음 달 결정을 준비합니다."
            : "이번 주에 무엇을 고민했고 왜 기다렸는지, 다시 확인할 결정이 무엇인지 정리합니다."}
        </p>
      </section>

      <section className={styles.tierPreview} aria-label="구독 등급 미리보기">
        <div className={styles.tierPreviewHead}>
          <div>
            <span>PREVIEW</span>
            <strong>등급별 리포트 차이 직접 보기</strong>
          </div>
          <small>실제 운영에서는 로그인 계정의 구독 권한으로 자동 결정됩니다.</small>
        </div>
        <div className={styles.tierGrid}>
          {(Object.keys(tierCopy) as Tier[]).map((key) => {
            const item = tierCopy[key];
            return (
              <button
                type="button"
                className={styles.tierCard}
                data-active={tier === key}
                data-tier={key}
                aria-pressed={tier === key}
                onClick={() => setTier(key)}
                key={key}
              >
                <span className={styles.tierName}>{item.title}</span>
                <strong>{item.summary}</strong>
                <ul>{item.features.map((feature) => <li key={feature}><CheckCircle2 size={13}/>{feature}</li>)}</ul>
                {key === "essential" && <b className={styles.tierBadge}>리포트 미포함</b>}
                {key === "plus" && <b className={styles.tierBadge}>리포트 시작</b>}
                {key === "premium" && <b className={styles.tierBadge}>전략·시뮬레이션</b>}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.reportShell}>
        <div className={styles.reportContent} data-locked={locked}>
          <div className={styles.reportTopStats}>
            {data.metrics.map(([label, value, note]) => (
              <div className={styles.metric} key={label}>
                <span>{label}</span><strong>{value}</strong><b>{note}</b>
              </div>
            ))}
          </div>

          <div className={styles.reportGrid}>
            <article className={styles.reportCard}>
              <div className={styles.cardEyebrow}><TrendingUp size={14}/>{isMonthly ? "변화" : "집중"}</div>
              <h2>{isMonthly ? "지난달 대비 구매 성향 변화" : "이번 주 가장 많이 고민한 카테고리"}</h2>
              <div className={styles.barList}>
                {data.bars.map(([label, width, note]) => (
                  <div className={styles.barItem} key={label}>
                    <span>{label}</span><div className={styles.bar}><span style={{width:`${width}%`}}/></div><strong>{note}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.reportCard}>
              <div className={styles.cardEyebrow}><ShieldCheck size={14}/>패턴</div>
              <h2>바이저가 본 반복 패턴</h2>
              <ul className={styles.insightBullets}>{data.bullets.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>

          <div className={styles.reportGrid}>
            <article className={styles.reportCard}>
              <div className={styles.cardEyebrow}><Clock3 size={14}/>재확인</div>
              <h2>{isMonthly ? "다음 달 다시 볼 결정" : "다시 확인할 결정"}</h2>
              <div className={styles.decisionRow}>
                <div><strong>MacBook Pro</strong><span>현재 제품 유지 가능 · 신제품 시점 근접</span></div><span className={styles.pill}>WAIT</span>
              </div>
              <div className={styles.decisionRow}>
                <div><strong>전동공구 세트</strong><span>업무 병목 우선 해결 후보</span></div><span className={styles.pill}>REVIEW</span>
              </div>
            </article>

            <article className={styles.reportCard}>
              <div className={styles.cardEyebrow}><WalletCards size={14}/>구매 결과</div>
              <h2>{isMonthly ? "구매 후 만족도 피드백" : "다음 주 체크 포인트"}</h2>
              {isMonthly ? (
                <div className={styles.feedbackSummary}>
                  <strong>8.4<small>/10</small></strong>
                  <div><b>7일·30일 피드백 반영</b><span>다시 사도 같은 선택인지 확인해 USER MODEL을 교정합니다.</span></div>
                </div>
              ) : (
                <ul className={styles.insightBullets}>
                  <li>노트북 가격과 신제품 일정 다시 확인</li>
                  <li>공구 실제 사용빈도와 보유 배터리 호환성 확인</li>
                  <li>최근 보류 이유가 여전히 유효한지 재판단</li>
                </ul>
              )}
            </article>
          </div>

          <section className={styles.premiumBlock} data-available={premium}>
            <div className={styles.premiumHead}>
              <div><Crown size={17}/><span>PREMIUM ONLY</span><h2>{isMonthly ? "앞으로 90일 구매 전략" : "다음 행동까지 정하는 구매 전략"}</h2></div>
              {!premium && <b>Premium에서 열림</b>}
            </div>

            <div className={styles.premiumContent}>
              <article className={styles.strategyCard}>
                <h3>구매 우선순위</h3>
                <div className={styles.priorityList}>
                  {premiumData.priorities.map(([rank, title, reason, timing]) => (
                    <div className={styles.priorityRow} key={`${rank}-${title}`}>
                      <b>{rank}</b><div><strong>{title}</strong><span>{reason}</span></div><em>{timing}</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.strategyCard}>
                <h3>{isMonthly ? "90일 타임라인" : "재판단 타이밍"}</h3>
                <div className={styles.timeline}>
                  {premiumData.timing.map(([when, action]) => <div key={`${when}-${action}`}><b>{when}</b><span>{action}</span></div>)}
                </div>
              </article>
            </div>

            {isMonthly ? (
              <div className={styles.scenarioSection}>
                <div className={styles.scenarioTitle}><Sparkles size={15}/><strong>3개 이상 대안 시뮬레이션</strong><span>지금 하나만 추천하지 않고, 미래 계획까지 넣어 선택의 결과를 비교합니다.</span></div>
                <div className={styles.scenarioGrid}>
                  <div className={styles.scenario}><small>A</small><strong>노트북 지금 구매</strong><p>성능 문제 즉시 해결 · 이후 구매 예산 여유 감소</p><b>72 / 100</b></div>
                  <div className={styles.scenario} data-best="true"><small>B · 현재 최적</small><strong>2개월 대기 + 공구 우선</strong><p>업무 병목 먼저 해결 · 신제품 확인 · 예산 여유 유지</p><b>91 / 100</b></div>
                  <div className={styles.scenario}><small>C</small><strong>기존 제품 모두 유지</strong><p>지출 없음 · 현재 생산성 문제 지속</p><b>61 / 100</b></div>
                </div>
              </div>
            ) : (
              <div className={styles.premiumSignalGrid}>
                <div><span>예산 압박</span><strong>낮음</strong><p>현재 보류를 유지하면 다음 핵심 구매 예산을 보존합니다.</p></div>
                <div><span>후회 위험</span><strong>중간</strong><p>후보 비교 중 예산 상향 패턴을 다시 확인해야 합니다.</p></div>
                <div><span>결정 신뢰도</span><strong>높음</strong><p>보유 제품과 사용 기간 정보가 충분히 반영됐습니다.</p></div>
              </div>
            )}

            {!premium && <div className={styles.premiumLock}><Crown size={22}/><strong>Plus는 과거를 분석하고, Premium은 앞으로의 구매를 설계합니다.</strong><span>90일 계획 · 구매 우선순위 · 예산 충돌 · 후회 위험 · 3개 이상 대안 시뮬레이션이 Premium에 추가됩니다.</span><button type="button" onClick={() => setTier("premium")}>Premium 화면 직접 보기</button></div>}
          </section>
        </div>

        {locked && (
          <div className={styles.lockLayer}>
            <div className={styles.lockCard}>
              <div className={styles.lockIcon}><LockKeyhole size={22}/></div>
              <span className={styles.lockTier}>ESSENTIAL</span>
              <h2>리포트는 Plus부터 사용할 수 있습니다.</h2>
              <p>Essential은 USER MODEL, 정밀 프로필, 구매 판단과 기록에 집중합니다. 주간·월간 리포트와 구매 패턴 분석은 Plus에서 시작합니다.</p>
              <button className={styles.primaryButton} type="button" onClick={() => setTier("plus")}><Sparkles size={14}/> Plus 리포트 직접 보기</button>
            </div>
          </div>
        )}
      </section>

      <div className={styles.reportFootnote}>현재 화면의 숫자는 미리보기용 예시 데이터입니다. 실제 출시에서는 사용자 본인의 판단·구매·7일/30일 만족도 데이터만 집계합니다.</div>
    </div>
  );
}
