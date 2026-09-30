import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { UserModelClient } from "@/components/user-model-client";

export const metadata: Metadata = {
  title: "Decision profile",
  description: "Build a decision profile around your budget, preferences, current products, environment and future plans.",
};

export default function ProfilePage() {
  return (
    <SiteShell compact>
      <main>
        <UserModelClient />
      </main>
    </SiteShell>
  );
}

