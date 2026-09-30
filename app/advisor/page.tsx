import type { Metadata } from "next";
import { AdvisorForm } from "@/components/advisor-form";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Your purchase needs",
};

export default function AdvisorPage() {
  return (
    <SiteShell compact>
      <main className="advisor-page">
        <AdvisorForm />
      </main>
    </SiteShell>
  );
}

