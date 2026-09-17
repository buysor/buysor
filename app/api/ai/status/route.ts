import { getAiRuntimeStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getAiRuntimeStatus());
}
