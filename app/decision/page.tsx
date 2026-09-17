import type { Metadata } from "next";
import { DecisionRunner } from "@/components/decision-runner";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "구매 판단 결과",
  description: "제품과 사용자의 조건을 함께 반영해 BUY, WAIT, SKIP으로 구매 결정을 정리합니다.",
};

export default function DecisionPage() {
  return (
    <SiteShell compact>
      <main>
        <DecisionRunner />
      </main>
    </SiteShell>
  );
}
