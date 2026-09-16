import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AiNotConfiguredError, analyzeUserState } from "@/lib/ai";
import { getUserProfile, saveUserProfile } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json() as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) return Response.json({ error: "현재 상태를 먼저 입력해 주세요." }, { status: 400 });

    const structuredState = await analyzeUserState(text);
    const current = await getUserProfile(user);
    const saved = await saveUserProfile(user, {
      ...current,
      stateText: text,
      structuredState,
      completion: Math.max(current.completion, 25),
    });

    return Response.json({ structuredState, profile: saved });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return Response.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    console.error("Profile analysis failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "상태 분석에 실패했습니다." }, { status: 500 });
  }
}
