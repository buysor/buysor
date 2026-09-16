"use client";

import Link from "next/link";
import { LockKeyhole, MessageSquareText, SlidersHorizontal } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import styles from "./preview.module.css";

const survey = [
  ["생활", "사용 장소 · 이동 빈도 · 사용시간"],
  ["재정", "편한 예산 · 최대 예산 · 지출 여력"],
  ["취향", "성능 · 디자인 · 중고 · 안정성"],
  ["보유 제품", "현재 제품 · 상태 · 불만 · 주변기기"],
  ["환경", "실내외 · 공간 · 충전 · 먼지 · 소음"],
  ["과거 구매", "만족 · 후회 · 재구매 · 수리 경험"],
  ["미래 계획", "이사 · 취업 · 해외 · 구매 예정"],
  ["구매 성향", "가격 민감도 · 장기보유 · 위험회피"],
  ["카테고리", "노트북 · 폰 · 자동차 · 공구 조건"],
];

function LockedReport({ monthly = false }: { monthly?: boolean }) {
  return (
    <article className={styles.reportCard}>
      <div className={styles.blurred}>
        <h3>{monthly ? "월간 리포트" : "주간 리포트"}</h3>
        <div className={styles.reportDate}>{monthly ? "9월 구매 판단 요약" : "이번 주 구매 판단 요약"}</div>
        <div className={styles.fakeStats}>
          <div className={styles.stat}><strong>{monthly ? "31" : "12"}</strong><span>총 판단</span></div>
          <div className={styles.stat}><strong>{monthly ? "18" : "7"}</strong><span>기다리기</span></div>
          <div className={styles.stat}><strong>{monthly ? "8.4" : "3"}</strong><span>{monthly ? "만족도" : "구매"}</span></div>
        </div>
        <div className={styles.fakeLines}><span/><span/><span/></div>
        <div className={styles.fakeLines}><span/><span/><span/></div>
      </div>
      <div className={styles.lock}>
        <div className={styles.lockBox}>
          <LockKeyhole size={24} />
          <strong>{monthly ? "월간 리포트 잠금" : "주간 리포트 잠금"}</strong>
          <p>무료 사용자는 미리보기만 보입니다. 실제 개인 데이터는 구독 권한 확인 후에만 서버에서 전달됩니다.</p>
        </div>
      </div>
    </article>
  );
}

export default function PreviewPage() {
  return (
    <SiteShell>
      <main className={styles.previewPage}>
        <div className={styles.previewNotice}>
          <strong>임시 미리보기 브랜치</strong>
          <span>운영 중인 main 브랜치는 건드리지 않았습니다.</span>
        </div>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>BUYSOR USER MODEL</span>
          <h1>나를 더 알수록,<br/>구매 판단은 더 정확해집니다.</h1>
          <p>현재 BUYSOR 디자인 흐름을 유지하면서 사용자 모델, 정밀 설문, 주간·월간 리포트, 모바일 대응을 추가했을 때의 실제 화면 구조를 미리 확인하는 페이지입니다.</p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>카테고리 상단 개인화 영역</h2>
            <p>기존 카테고리 기능은 그대로 두고, 그 위에만 개인화 진입점을 추가합니다.</p>
          </div>
          <div className={styles.personalCard}>
            <div>
              <h3>바이저가 나를 더 정확히 이해하게 만들기</h3>
              <p>지금 상황과 구매 기준을 알려주면 같은 제품이라도 당신에게 맞는 결론으로 판단합니다.</p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="#state"><MessageSquareText size={17}/> 지금 내 상태 말하기</Link>
                <Link className={styles.secondary} href="#survey"><SlidersHorizontal size={17}/> 정밀 구매 프로필 설정</Link>
              </div>
            </div>
            <div className={styles.profileMeta}>
              <div className={styles.profileRow}><span>구매 프로필 완성도</span><strong>68%</strong></div>
              <div className={styles.bar}><span/></div>
              <div className={styles.profileRow}><span>최근 업데이트</span><span>3일 전</span></div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="state">
          <div className={styles.sectionHead}>
            <h2>지금 내 상태 말하기</h2>
            <p>자유입력 원문은 보존하고, 구조화 결과는 사용자 확인 후 USER MODEL에 반영합니다.</p>
          </div>
          <div className={styles.personalCard}>
            <div>
              <h3>지금 어떤 상황인가요?</h3>
              <p>예: “다음 달 이사 예정이고 예산은 150만원 정도예요. 현재 M1 맥북에어를 쓰는데 영상편집이 느리고, 중고도 괜찮아요.”</p>
            </div>
            <div className={styles.profileMeta}>
              <div className={styles.profileRow}><span>현재 제품</span><strong>M1 MacBook Air</strong></div>
              <div className={styles.profileRow}><span>주요 불만</span><strong>영상 편집 성능</strong></div>
              <div className={styles.profileRow}><span>예산</span><strong>약 150만원</strong></div>
              <div className={styles.profileRow}><span>중고</span><strong>가능</strong></div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="survey">
          <div className={styles.sectionHead}>
            <h2>MBTI급 정밀 구매 프로필</h2>
            <p>한 번에 몰아넣지 않고 단계형으로 진행하며 중간 저장과 이어하기를 전제로 합니다.</p>
          </div>
          <div className={styles.surveyGrid}>
            {survey.map(([title, detail], index) => (
              <div className={styles.surveyItem} key={title}><b>{String(index + 1).padStart(2,"0")} {title}</b><span>{detail}</span></div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>주간 · 월간 리포트</h2>
            <p>운영 요구대로 무료 상태에서는 실제 데이터 대신 잠금 미리보기만 제공합니다.</p>
          </div>
          <div className={styles.reports}>
            <LockedReport />
            <LockedReport monthly />
          </div>
        </section>

        <div className={styles.mobileNote}><strong>모바일:</strong> 900px 이하에서 리포트 1열, 640px 이하에서 설문 1열·버튼 세로 배치로 전환되도록 미리보기 자체도 반응형으로 만들었습니다.</div>
      </main>
    </SiteShell>
  );
}
