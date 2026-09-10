import type { Metadata } from "next";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { DashboardClient } from "@/components/dashboard-client";
import { LocalizedText } from "@/components/preferences-provider";
import { SiteShell } from "@/components/site-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "내 바이저",
};

export default async function MyBuysorPage() {
  await requireChatGPTUser("/my");

  return (
    <SiteShell compact>
      <main className="dashboard-page">
        <section className="dashboard-intro">
          <div>
            <span className="hero-eyebrow">MY BUYSOR</span>
            <h1><LocalizedText ko="나의" en="My" /><br /><LocalizedText ko="구매 기준실" en="decision space" /></h1>
          </div>
          <p><LocalizedText ko="나의 조건과 선택이 쌓일수록" en="As your choices build up," /><br /><strong><LocalizedText ko="다음 구매 판단이 더 정확해집니다." en="your next decision gets sharper." /></strong></p>
        </section>
        <DashboardClient />
      </main>
    </SiteShell>
  );
}
