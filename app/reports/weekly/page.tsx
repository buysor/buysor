import type { Metadata } from "next";
import { ReportClient } from "@/components/report-client";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "주간 리포트",
};

export default function WeeklyReportPage() {
  return (
    <SiteShell compact>
      <main>
        <ReportClient type="weekly" />
      </main>
    </SiteShell>
  );
}
