import type { Metadata } from "next";
import { LaunchCheck } from "@/components/launch-check";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Service availability",
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

