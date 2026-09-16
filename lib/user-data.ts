import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { getD1Binding } from "@/db";
import type {
  DecisionAnswers,
  DecisionDraft,
  DecisionHistoryItem,
  DecisionResult,
  ReportData,
  SubscriptionTier,
  UserModelPayload,
} from "@/lib/buysor-types";

const DAY = 86_400_000;

export async function ensureUserRecord(user: ChatGPTUser) {
  const db = getD1Binding();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`,
    )
    .bind(user.id, user.email, user.displayName || user.email, now, now)
    .run();
}

export async function getUserProfile(user: ChatGPTUser): Promise<UserModelPayload> {
  await ensureUserRecord(user);
  const row = await getD1Binding()
    .prepare(
      `SELECT state_text, structured_state_json, survey_json, category_profiles_json, completion, updated_at
       FROM user_profiles WHERE user_id = ? LIMIT 1`,
    )
    .bind(user.id)
    .first<{
      state_text: string;
      structured_state_json: string | null;
      survey_json: string;
      category_profiles_json: string;
      completion: number;
      updated_at: number;
    }>();

  if (!row) {
    return {
      stateText: "",
      structuredState: null,
      survey: {},
      categoryProfiles: {},
      completion: 0,
    };
  }

  return {
    stateText: row.state_text || "",
    structuredState: parseJson(row.structured_state_json, null),
    survey: parseJson(row.survey_json, {}),
    categoryProfiles: parseJson(row.category_profiles_json, {}),
    completion: clampInt(row.completion, 0, 100),
    updatedAt: Number(row.updated_at || 0),
  };
}

export async function saveUserProfile(user: ChatGPTUser, profile: UserModelPayload) {
  await ensureUserRecord(user);
  const now = Date.now();
  const clean = sanitizeProfile(profile);
  await getD1Binding()
    .prepare(
      `INSERT INTO user_profiles
        (user_id, state_text, structured_state_json, survey_json, category_profiles_json, completion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         state_text = excluded.state_text,
         structured_state_json = excluded.structured_state_json,
         survey_json = excluded.survey_json,
         category_profiles_json = excluded.category_profiles_json,
         completion = excluded.completion,
         updated_at = excluded.updated_at`,
    )
    .bind(
      user.id,
      clean.stateText,
      clean.structuredState ? JSON.stringify(clean.structuredState) : null,
      JSON.stringify(clean.survey),
      JSON.stringify(clean.categoryProfiles),
      clean.completion,
      now,
      now,
    )
    .run();
  return { ...clean, updatedAt: now };
}

export async function getSubscriptionTier(user: ChatGPTUser): Promise<SubscriptionTier> {
  await ensureUserRecord(user);
  const row = await getD1Binding()
    .prepare(`SELECT tier, status, current_period_end FROM subscriptions WHERE user_id = ? LIMIT 1`)
    .bind(user.id)
    .first<{ tier: string; status: string; current_period_end: number | null }>();

  if (!row || row.status !== "active") return "essential";
  if (row.current_period_end && row.current_period_end < Date.now()) return "essential";
  return isTier(row.tier) ? row.tier : "essential";
}

export async function setSubscriptionTierForPreview(user: ChatGPTUser, tier: SubscriptionTier) {
  await ensureUserRecord(user);
  const now = Date.now();
  await getD1Binding()
    .prepare(
      `INSERT INTO subscriptions (user_id, tier, status, provider, created_at, updated_at)
       VALUES (?, ?, 'active', 'preview', ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET tier = excluded.tier, status = 'active', provider = 'preview', updated_at = excluded.updated_at`,
    )
    .bind(user.id, tier, now, now)
    .run();
}

export async function createPendingDecision(
  user: ChatGPTUser,
  draft: DecisionDraft,
  answers: DecisionAnswers,
) {
  await ensureUserRecord(user);
  const db = getD1Binding();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO decisions
        (id, user_id, input_type, input_label, input_json, answers_json, status, category_id, subcategory_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    )
    .bind(
      id,
      user.id,
      draft.type,
      decisionLabel(draft),
      JSON.stringify(stripLargeImage(draft)),
      JSON.stringify(answers),
      draft.categoryId ?? null,
      draft.subcategoryId ?? null,
      now,
      now,
    )
    .run();
  return id;
}

export async function completeDecision(user: ChatGPTUser, id: string, result: DecisionResult) {
  const now = Date.now();
  await getD1Binding()
    .prepare(
      `UPDATE decisions
       SET result_json = ?, verdict = ?, status = 'completed', recheck_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .bind(JSON.stringify(result), result.verdict, result.recheckAt, now, id, user.id)
    .run();
}

export async function failDecision(user: ChatGPTUser, id: string) {
  await getD1Binding()
    .prepare(`UPDATE decisions SET status = 'failed', updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(Date.now(), id, user.id)
    .run();
}

export async function listDecisionHistory(user: ChatGPTUser, limit = 20): Promise<DecisionHistoryItem[]> {
  await ensureUserRecord(user);
  const result = await getD1Binding()
    .prepare(
      `SELECT id, input_type, input_label, category_id, subcategory_id, verdict, status, result_json, created_at
       FROM decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(user.id, Math.min(100, Math.max(1, limit)))
    .all<{
      id: string;
      input_type: DecisionHistoryItem["inputType"];
      input_label: string;
      category_id: string | null;
      subcategory_id: string | null;
      verdict: DecisionHistoryItem["verdict"];
      status: DecisionHistoryItem["status"];
      result_json: string | null;
      created_at: number;
    }>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    createdAt: Number(row.created_at),
    inputType: row.input_type,
    inputLabel: row.input_label,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    verdict: row.verdict && ["BUY", "WAIT", "SKIP"].includes(row.verdict) ? row.verdict : null,
    status: row.status,
    result: parseJson<DecisionResult | null>(row.result_json, null),
  }));
}

export async function getReportData(
  user: ChatGPTUser,
  period: "weekly" | "monthly",
): Promise<ReportData> {
  const tier = await getSubscriptionTier(user);
  const days = period === "weekly" ? 7 : 30;
  const from = Date.now() - (days * DAY);
  const history = await listDecisionsSince(user, from);
  const completed = history.filter((item) => item.status === "completed");
  const counts = {
    BUY: completed.filter((item) => item.verdict === "BUY").length,
    WAIT: completed.filter((item) => item.verdict === "WAIT").length,
    SKIP: completed.filter((item) => item.verdict === "SKIP").length,
  };

  const categories = new Map<string, number>();
  for (const item of history) {
    const label = item.subcategoryId || item.categoryId || inputCategoryLabel(item.inputType);
    categories.set(label, (categories.get(label) ?? 0) + 1);
  }
  const maxCategory = Math.max(1, ...categories.values());
  const categoryBars = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, value: Math.round((count / maxCategory) * 100), note: String(count) }));

  const patterns: string[] = [];
  if (counts.WAIT > counts.BUY && counts.WAIT > 0) patterns.push("최근에는 즉시 구매보다 대기 판단이 더 많았습니다.");
  if (counts.BUY > counts.WAIT && counts.BUY > 0) patterns.push("최근에는 구매 적기가 확인된 판단이 대기보다 많았습니다.");
  if (counts.SKIP > 0) patterns.push(`${counts.SKIP}건은 현재 구매 필요성이 낮아 지출을 피했습니다.`);
  if (completed.length >= 3) {
    const dominant = (["BUY", "WAIT", "SKIP"] as const).sort((a, b) => counts[b] - counts[a])[0];
    patterns.push(`가장 자주 나온 결론은 ${dominant}였습니다. 다음 리포트에서 변화 여부를 비교할 수 있습니다.`);
  }
  if (!patterns.length) patterns.push("판단 기록이 쌓이면 반복되는 구매 패턴을 여기서 보여줍니다.");

  const recheck = history
    .filter((item) => item.verdict === "WAIT" && item.result?.recheckAt)
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.inputLabel,
      note: item.result?.waitFor || item.result?.summary || "다시 확인할 시점이 설정되어 있습니다.",
      verdict: item.verdict,
      recheckAt: item.result?.recheckAt ?? null,
    }));

  return {
    tier,
    locked: tier === "essential",
    period,
    hasData: history.length > 0,
    rangeLabel: period === "weekly" ? "최근 7일" : "최근 30일",
    metrics: period === "weekly"
      ? [
          { label: "총 판단", value: String(history.length), note: "최근 7일" },
          { label: "BUY", value: String(counts.BUY), note: "구매" },
          { label: "WAIT", value: String(counts.WAIT), note: "대기" },
          { label: "SKIP", value: String(counts.SKIP), note: "보류" },
        ]
      : [
          { label: "총 판단", value: String(history.length), note: "최근 30일" },
          { label: "완료 판단", value: String(completed.length), note: "AI 판단 완료" },
          { label: "대기", value: String(counts.WAIT), note: "재확인 후보" },
          { label: "불필요 지출 방지", value: String(counts.SKIP), note: "SKIP" },
        ],
    categoryBars,
    patterns,
    recheck,
    historyCount: history.length,
  };
}

async function listDecisionsSince(user: ChatGPTUser, from: number): Promise<DecisionHistoryItem[]> {
  await ensureUserRecord(user);
  const result = await getD1Binding()
    .prepare(
      `SELECT id, input_type, input_label, category_id, subcategory_id, verdict, status, result_json, created_at
       FROM decisions WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 200`,
    )
    .bind(user.id, from)
    .all<any>();

  return (result.results ?? []).map((row: any) => ({
    id: String(row.id),
    createdAt: Number(row.created_at),
    inputType: row.input_type,
    inputLabel: String(row.input_label),
    categoryId: row.category_id ?? null,
    subcategoryId: row.subcategory_id ?? null,
    verdict: ["BUY", "WAIT", "SKIP"].includes(row.verdict) ? row.verdict : null,
    status: row.status,
    result: parseJson<DecisionResult | null>(row.result_json, null),
  }));
}

function sanitizeProfile(profile: UserModelPayload): UserModelPayload {
  const survey = isRecord(profile.survey) ? profile.survey : {};
  const categoryProfiles = isRecord(profile.categoryProfiles) ? profile.categoryProfiles : {};
  return {
    stateText: typeof profile.stateText === "string" ? profile.stateText.trim().slice(0, 6000) : "",
    structuredState: profile.structuredState ?? null,
    survey,
    categoryProfiles: categoryProfiles as Record<string, Record<string, string | number>>,
    completion: clampInt(profile.completion, 0, 100),
  };
}

function stripLargeImage(draft: DecisionDraft): DecisionDraft {
  const { imageDataUrl: _imageDataUrl, ...rest } = draft;
  return rest;
}

function decisionLabel(draft: DecisionDraft) {
  if (draft.type === "photo") return draft.imageName || draft.value || "제품 사진";
  return draft.value.slice(0, 240);
}

function inputCategoryLabel(type: string) {
  if (type === "photo") return "사진 입력";
  if (type === "link") return "상품 링크";
  if (type === "name") return "제품명";
  return "카테고리";
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function clampInt(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTier(value: string): value is SubscriptionTier {
  return value === "essential" || value === "plus" || value === "premium";
}
