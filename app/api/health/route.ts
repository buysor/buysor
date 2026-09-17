import { getD1Binding } from "@/db";
import {checkoutReady} from "@/lib/commerce-runtime";
import { getAiRuntimeStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

const requiredTables = [
  "users",
  "attendance",
  "credit_ledger",
  "user_profiles",
  "decisions",
  "subscriptions",
  "purchase_feedback",
] as const;

export async function GET() {
  const ai = getAiRuntimeStatus();
  const database = await checkDatabase();
  return Response.json({
    ok: database.ready,
    app: true,
    database,
    ai,
    googleAuth: {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SESSION_SECRET),
    },
    billing: {
      configured: checkoutReady(),
      note: "구독 결제 제공자는 아직 연결되지 않았습니다. 등급 권한 구조는 준비되어 있습니다.",
    },
  }, {headers:{"cache-control":"no-store"}});
}

async function checkDatabase() {
  try {
    const result = await getD1Binding()
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all<{ name: string }>();
    const existing = new Set((result.results ?? []).map((row) => row.name));
    const tables = Object.fromEntries(requiredTables.map((name) => [name, existing.has(name)]));
    return {
      binding: true,
      ready: requiredTables.every((name) => existing.has(name)),
      tables,
    };
  } catch (error) {
    return {
      binding: false,
      ready: false,
      tables: Object.fromEntries(requiredTables.map((name) => [name, false])),
      error: "database unavailable",
    };
  }
}
