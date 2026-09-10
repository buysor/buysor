import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Camera, Coins, Layers3, Settings2, Sparkles, UserRound, WandSparkles } from "lucide-react";
import { LocalizedText } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "사용 설명서",
  description: "BUYSOR의 핵심 기능과 사용 순서를 한눈에 확인합니다.",
};

const guideItems = [
  {
    href: "/lens",
    icon: Camera,
    ko: ["01", "Lens로 시작", "사진·스크린샷·링크·제품명 중 가장 편한 방식으로 구매 대상을 알려주세요."],
    en: ["01", "Start with Lens", "Use a photo, screenshot, link or product name to tell BUYSOR what you are considering."],
  },
  {
    href: "/category",
    icon: Layers3,
    ko: ["02", "카테고리 선택", "사진이 없으면 카테고리에서 시작합니다. 제품군을 고른 뒤 내 조건을 입력하면 됩니다."],
    en: ["02", "Choose a category", "If you have no photo, narrow the product scope first. Categories never override your personal needs."],
  },
  {
    href: "/lens",
    icon: Sparkles,
    ko: ["03", "필요한 조건만 답하기", "용도·예산·보유 제품·구매 시점처럼 결정에 필요한 질문만 순서대로 답합니다."],
    en: ["03", "Answer only what matters", "BUYSOR asks only the decision-critical questions: use, budget, current setup and timing."],
  },
  {
    href: "/lens",
    icon: WandSparkles,
    ko: ["04", "BUY · WAIT · SKIP", "추천 목록보다 먼저 지금 사야 하는지, 기다릴지, 넘길지를 하나의 결론으로 정리합니다."],
    en: ["04", "BUY · WAIT · SKIP", "Before listing products, BUYSOR resolves whether you should buy, wait or skip."],
  },
  {
    href: "/attendance",
    icon: Coins,
    ko: ["05", "출석 · 크레딧", "로그인 후 하루 한 번 룰렛을 돌립니다. 실제 참여한 날만 출석으로 기록되고 서버에서 중복 지급을 막습니다."],
    en: ["05", "Attendance · credits", "Spin once per day after signing in. Only real participation counts, and the server blocks duplicate rewards."],
  },
  {
    href: "/my",
    icon: UserRound,
    ko: ["06", "내 바이저", "구매 기준, 최근 결정, 출석 상태와 설정을 계정 기준으로 관리합니다."],
    en: ["06", "My BUYSOR", "Manage your decision profile, history, attendance and settings per account."],
  },
  {
    href: "/my",
    icon: Settings2,
    ko: ["07", "언어 · 화면 설정", "한국어/영어와 라이트/다크 모드를 언제든 바꿀 수 있습니다."],
    en: ["07", "Language · appearance", "Switch between Korean/English and light/dark mode at any time."],
  },
];

export default function GuidePage() {
  return (
    <SiteShell compact>
      <main className="guide-page">
        <section className="page-intro page-intro--split">
          <div>
            <span className="hero-eyebrow"><BookOpen size={15} /> GUIDE</span>
            <h1><LocalizedText ko="설명은 짧게." en="Simple steps." /><br /><LocalizedText ko="결정은 정확하게." en="Clear decisions." /></h1>
          </div>
          <div className="page-intro-note">
            <p><LocalizedText ko="처음 사용하는 사람도 아래 순서대로 누르면 구매 판단까지 갈 수 있습니다." en="Follow the steps below to go from a product question to a purchase decision." /></p>
          </div>
        </section>

        <div className="guide-list">
          {guideItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} className="guide-row" key={item.ko[0]}>
                <span className="guide-number"><LocalizedText ko={item.ko[0]} en={item.en[0]} /></span>
                <span className="guide-icon"><Icon size={19} /></span>
                <span className="guide-copy">
                  <strong><LocalizedText ko={item.ko[1]} en={item.en[1]} /></strong>
                  <p><LocalizedText ko={item.ko[2]} en={item.en[2]} /></p>
                </span>
                <span className="guide-arrow">›</span>
              </Link>
            );
          })}
        </div>
      </main>
    </SiteShell>
  );
}
