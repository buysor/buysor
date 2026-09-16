import type { Metadata } from "next";
import { LaunchCheck } from "@/components/launch-check";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "출시 준비 상태",
};

export default function LaunchCheckPage() {
  return (
    <SiteShell compact>
      <main>
        <LaunchCheck />
      </main>
    </SiteShell>
  );
}
