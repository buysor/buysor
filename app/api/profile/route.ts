import {assertSameOrigin,boundedJson,errorResponse} from '@/lib/request-safety';
import { getChatGPTUser } from "@/app/chatgpt-auth";
import type { UserModelPayload } from "@/lib/buysor-types";
import { getUserProfile, saveUserProfile } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    return Response.json(await getUserProfile(user));
  } catch (error) {
    console.error("Profile GET failed", error);
    return Response.json({ error: "프로필을 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    assertSameOrigin(request);
    const body = await boundedJson(request,40000) as Partial<UserModelPayload>;
    const current = await getUserProfile(user);
    const next: UserModelPayload = {
      stateText: typeof body.stateText === "string" ? body.stateText : current.stateText,
      structuredState: body.structuredState === undefined ? current.structuredState : body.structuredState,
      survey: body.survey && typeof body.survey === "object" ? body.survey : current.survey,
      categoryProfiles: body.categoryProfiles && typeof body.categoryProfiles === "object" ? body.categoryProfiles : current.categoryProfiles,
      completion: typeof body.completion === "number" ? body.completion : current.completion,
    };
    return Response.json(await saveUserProfile(user, next));
  } catch (error) {
    console.error("Profile PUT failed", error);
    return Response.json({ error: "프로필을 저장하지 못했습니다." }, { status: 400 });
  }
}
