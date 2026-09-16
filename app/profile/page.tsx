import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { UserModelClient } from "@/components/user-model-client";

export const metadata: Metadata = {
  title: "구매 프로필",
  description: "BUYSOR가 사용자의 생활, 재정, 취향, 보유 제품, 환경, 과거 구매와 미래 계획을 이해하는 사용자 모델 페이지입니다.",
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
