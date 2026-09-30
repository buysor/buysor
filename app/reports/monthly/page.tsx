import type { Metadata } from "next";
import { ReportClient } from "@/components/report-client";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Monthly report",
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

