import { headers } from "next/headers";
import { getChatGPTUser, isLocalRequest } from "@/app/chatgpt-auth";
import type { SubscriptionTier } from "@/lib/buysor-types";
import { getSubscriptionTier, setSubscriptionTierForPreview } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false, tier: "essential" });
  return Response.json({ authenticated: true, tier: await getSubscriptionTier(user) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!(await canUsePreviewSwitch())) {
    return Response.json({ error: "미리보기 환경에서만 등급을 변경할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json() as { tier?: SubscriptionTier };
  if (!body.tier || !["essential", "plus", "premium"].includes(body.tier)) {
    return Response.json({ error: "올바른 등급이 아닙니다." }, { status: 400 });
  }
  await setSubscriptionTierForPreview(user, body.tier);
  return Response.json({ tier: body.tier });
}

async function canUsePreviewSwitch() {
  if (await isLocalRequest()) return true;
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
  return host.endsWith("-buysor.peon9339.workers.dev") || host.startsWith("preview-user-model-reports-mobile-");
}
