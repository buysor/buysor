import type { Metadata } from "next";
import { Eye, ShieldCheck, WandSparkles } from "lucide-react";
import { DecisionStudio } from "@/components/decision-studio";
import { LocalizedText } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "BUYSOR Lens",
  description: "사진과 스크린샷에서 구매 판단에 필요한 제품 단서를 찾습니다.",
};

export default function LensPage() {
  return (
    <SiteShell compact>
      <main className="lens-page">
        <section className="page-intro page-intro--split">
          <div>
            <span className="hero-eyebrow"><Eye size={15} /> BUYSOR LENS</span>
            <h1><LocalizedText ko="보이는 그대로," en="Start with" /><br /><LocalizedText ko="판단을 시작합니다." en="what you see." /></h1>
          </div>
          <div className="page-intro-note">
            <p><LocalizedText ko="모델명을 몰라도 괜찮습니다. 사진 속 제품, 가격, 상태와 주요 단서를 먼저 확인합니다." en="You do not need the model name. We start with the product, price, condition, and visible clues." /></p>
            <div><span><WandSparkles size={15} /> <LocalizedText ko="모델 후보 식별" en="Model clues" /></span><span><ShieldCheck size={15} /> <LocalizedText ko="상태 단서 확인" en="Condition clues" /></span></div>
          </div>
        </section>
        <DecisionStudio embedded />
      </main>
    </SiteShell>
  );
}
