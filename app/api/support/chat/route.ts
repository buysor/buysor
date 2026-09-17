import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AiNotConfiguredError } from "@/lib/ai";
import {
  answerSupportFaq,
  generateSupportReply,
  type SupportHistoryMessage,
} from "@/lib/support-chat";
import {
  assertSupportRateLimit,
  SupportRateLimitError,
} from "@/lib/support-rate-limit";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 900;
const MAX_HISTORY_ITEMS = 8;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      message?: unknown;
      history?: unknown;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return Response.json({ error: "질문을 입력해 주세요." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `질문은 ${MAX_MESSAGE_LENGTH}자 이하로 입력해 주세요.` },
        { status: 400 },
      );
    }

    const history = sanitizeHistory(body.history);
    const faq = answerSupportFaq(message);
    if (faq) {
      return Response.json({
        ...faq,
        source: "faq",
      });
    }

    const user = await getChatGPTUser();
    await assertSupportRateLimit(request, {
      scope: "support-chat",
      limit: user ? 18 : 10,
      windowMs: 10 * 60 * 1000,
      userId: user?.id,
    });

    try {
      const reply = await generateSupportReply({ message, history });
      return Response.json({ ...reply, source: "ai" });
    } catch (error) {
      if (error instanceof AiNotConfiguredError) {
        return Response.json({
          reply: "이 질문은 기본 도움말만으로 정확히 답하기 어렵습니다. 현재 AI 상담 연결이 설정되지 않은 환경이라 자동 답변을 만들 수 없습니다. 아래 직접 문의 영역으로 넘기거나, 크레딧·로그인·Lens·오류 같은 주제로 다시 질문해 주세요.",
          handoffSuggested: true,
          suggestedQuestions: [
            "크레딧이 왜 차감됐나요?",
            "로그인이 안 돼요",
            "Lens는 어떻게 쓰나요?",
          ],
          source: "fallback",
        });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof SupportRateLimitError) {
      return Response.json(
        {
          error: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "retry-after": String(error.retryAfterSeconds) },
        },
      );
    }

    console.error("Support chat failed", error);
    return Response.json(
      { error: "상담봇 응답을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

function sanitizeHistory(value: unknown): SupportHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = "role" in item ? item.role : null;
      const content = "content" in item ? item.content : null;
      if (
        (role !== "user" && role !== "assistant")
        || typeof content !== "string"
      ) {
        return null;
      }
      const clean = content.trim().slice(0, 700);
      return clean ? { role, content: clean } satisfies SupportHistoryMessage : null;
    })
    .filter((item): item is SupportHistoryMessage => Boolean(item));
}
