import type { Metadata } from "next";
import { ReportClient } from "@/components/report-client";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "월간 리포트",
};

export default function MonthlyReportPage() {
  return (
    <SiteShell compact>
      <main>
        <ReportClient type="monthly" />
      </main>
    </SiteShell>
  );
}
