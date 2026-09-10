import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false });
  return Response.json({ authenticated: true, email: user.email });
}
