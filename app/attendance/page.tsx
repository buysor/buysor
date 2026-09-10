import type { Metadata } from "next";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { AttendanceClient } from "@/components/attendance-client";
import { LocalizedText } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "출석",
};

export default async function AttendancePage() {
  await requireChatGPTUser("/attendance");
  return (
    <SiteShell compact>
      <main className="attendance-page">
        <section className="page-intro">
          <span className="hero-eyebrow">DAILY WHEEL</span>
          <h1><LocalizedText ko="하루 한 번." en="Once a day." /><br /><LocalizedText ko="오늘의 크레딧." en="Today’s credits." /></h1>
        </section>
        <AttendanceClient />
        <section className="milestone-board">
          <div><span className="section-kicker">STREAK REWARDS</span><h2><LocalizedText ko="연속 기록 보상" en="Streak rewards" /></h2></div>
          <div className="milestone-list">
            <span><b>3<LocalizedText ko="일" en=" days" /></b> +1C</span>
            <span><b>7<LocalizedText ko="일" en=" days" /></b> +2C · <LocalizedText ko="추가 룰렛" en="extra spin" /></span>
            <span><b>14<LocalizedText ko="일" en=" days" /></b> +3C · <LocalizedText ko="추가 룰렛" en="extra spin" /></span>
            <span><b>21<LocalizedText ko="일" en=" days" /></b> +4C</span>
            <span className="jackpot"><b>30<LocalizedText ko="일" en=" days" /></b> +5C · JACKPOT</span>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
