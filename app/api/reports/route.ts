import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getReportData } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") === "monthly" ? "monthly" : "weekly";
    return Response.json(await getReportData(user, period));
  } catch (error) {
    console.error("Report GET failed", error);
    return Response.json({ error: "리포트를 불러오지 못했습니다." }, { status: 503 });
  }
}
