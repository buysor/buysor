import type { Metadata } from "next";
import { DecisionRunner } from "@/components/decision-runner";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Purchase decision",
  description: "Decide whether to buy, wait or skip based on the product, your budget and situation.",
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

