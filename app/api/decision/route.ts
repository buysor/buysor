import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AiNotConfiguredError, generateDecision } from "@/lib/ai";
import type { DecisionAnswers, DecisionDraft } from "@/lib/buysor-types";
import {
  completeDecision,
  createPendingDecision,
  failDecision,
  getUserProfile,
  listDecisionHistory,
} from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return Response.json({ items: await listDecisionHistory(user, limit) });
  } catch (error) {
    console.error("Decision history failed", error);
    return Response.json({ error: "구매 판단 기록을 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let decisionId: string | null = null;
  try {
    const body = await request.json() as {
      draft?: DecisionDraft;
      answers?: DecisionAnswers;
    };
    if (!body.draft || !body.draft.type || !body.draft.value) {
      return Response.json({ error: "제품 입력 정보가 없습니다." }, { status: 400 });
    }

    const answers = body.answers ?? {};
    decisionId = await createPendingDecision(user, body.draft, answers);
    const userModel = await getUserProfile(user);
    const result = await generateDecision({ draft: body.draft, answers, userModel });
    await completeDecision(user, decisionId, result);

    return Response.json({ id: decisionId, result });
  } catch (error) {
    if (decisionId) {
      try { await failDecision(user, decisionId); } catch {}
    }
    if (error instanceof AiNotConfiguredError) {
      return Response.json({ error: "AI_NOT_CONFIGURED", id: decisionId }, { status: 503 });
    }
    console.error("Decision generation failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "구매 판단 생성에 실패했습니다.", id: decisionId }, { status: 500 });
  }
}
