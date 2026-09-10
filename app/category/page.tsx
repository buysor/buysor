import type { Metadata } from "next";
import { Grid2X2 } from "lucide-react";
import { DecisionStudio } from "@/components/decision-studio";
import { LocalizedText } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "카테고리로 찾기",
  description: "제품 사진 없이 카테고리부터 선택해 구매 판단을 시작합니다.",
};

export default function CategoryPage() {
  return (
    <SiteShell compact>
      <main className="lens-page">
        <section className="page-intro page-intro--split">
          <div>
            <span className="hero-eyebrow"><Grid2X2 size={15} /> CATEGORY</span>
            <h1><LocalizedText ko="사진이 없어도," en="No photo?" /><br /><LocalizedText ko="제품군부터 시작." en="Start by category." /></h1>
          </div>
          <div className="page-intro-note">
            <p><LocalizedText ko="카테고리는 검색 범위를 좁히는 시작점입니다. 최종 판단은 예산·용도·보유 제품·구매 시점까지 함께 봅니다." en="Category is only the starting scope. Budget, use, what you own and timing still drive the decision." /></p>
          </div>
        </section>
        <DecisionStudio embedded initialEntryMode="category" />
      </main>
    </SiteShell>
  );
}
