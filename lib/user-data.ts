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
    return { stateText: "", structuredState: null, survey: {}, categoryProfiles: {}, completion: 0 };
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

export async function createPendingDecision(user: ChatGPTUser, draft: DecisionDraft, answers: DecisionAnswers) {
  await ensureUserRecord(user);
  const id = crypto.randomUUID();
  const now = Date.now();
  await getD1Binding()
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
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(toHistoryItem);
}

export async function getReportData(user: ChatGPTUser, period: "weekly" | "monthly"): Promise<ReportData> {
  const tier = await getSubscriptionTier(user);
  const days = period === "weekly" ? 7 : 30;
  const history = await listDecisionsSince(user, Date.now() - (days * DAY));
  const completed = history.filter((item) => item.status === "completed" && item.result);
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
    .map(([label, count]) => ({ label: humanizeCategory(label), value: Math.round((count / maxCategory) * 100), note: String(count) }));

  const patterns: string[] = [];
  if (counts.WAIT > counts.BUY && counts.WAIT > 0) patterns.push("즉시 구매보다 대기 판단이 더 많았습니다. 기다리는 이유가 반복되는지 확인할 가치가 있습니다.");
  if (counts.BUY > counts.WAIT && counts.BUY > 0) patterns.push("구매 적기가 확인된 판단이 대기보다 많았습니다. 실제 구매 후 만족도 피드백이 다음 판단 정확도를 높입니다.");
  if (counts.SKIP > 0) patterns.push(`${counts.SKIP}건은 지금 구매할 필요가 낮다고 판단해 불필요한 지출을 피했습니다.`);
  const uncertaintyCount = completed.reduce((sum, item) => sum + (item.result?.missingInformation.length ?? 0), 0);
  if (uncertaintyCount > 0) patterns.push(`완료된 판단에서 확인되지 않은 정보가 ${uncertaintyCount}개 남았습니다. 최신 가격·재고·출시 정보는 다음 재판단 때 다시 확인해야 합니다.`);
  if (!patterns.length) patterns.push("판단 기록이 쌓이면 BUY · WAIT · SKIP의 반복 패턴과 재확인 포인트를 자동으로 정리합니다.");

  const recheck = completed
    .filter((item) => item.verdict === "WAIT" && (item.result?.recheckAt || item.result?.waitFor))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.inputLabel,
      note: item.result?.waitFor || item.result?.summary || "다시 확인할 조건이 있습니다.",
      verdict: item.verdict,
      recheckAt: item.result?.recheckAt ?? null,
    }));

  const priorities = completed
    .filter((item): item is DecisionHistoryItem & { result: DecisionResult; verdict: "BUY" | "WAIT" | "SKIP" } => Boolean(item.result && item.verdict))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.inputLabel,
      verdict: item.verdict,
      reason: item.result.reasons[0] || item.result.summary,
      confidence: Math.round(item.result.confidence),
    }));

  const timeline = completed
    .filter((item) => item.verdict === "WAIT" && (item.result?.recheckAt || item.result?.waitFor))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.inputLabel,
      when: item.result?.recheckAt || "조건 충족 시",
      action: item.result?.waitFor || "시장·가격·필요성 다시 확인",
    }));

  const riskFlags = uniqueStrings(completed.flatMap((item) => [
    ...(item.result?.missingInformation ?? []),
    ...(item.result?.tradeoffs ?? []),
    ...(item.result?.avoid ?? []),
  ])).slice(0, 10);

  const scenarioCandidates = completed
    .filter((item) => (item.result?.alternatives.length ?? 0) >= 2)
    .slice(0, 5)
    .map((item) => ({
      decisionId: item.id,
      title: item.inputLabel,
      alternatives: item.result?.alternatives.slice(0, 5) ?? [],
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
          { label: "SKIP", value: String(counts.SKIP), note: "구매 안 함" },
        ]
      : [
          { label: "총 판단", value: String(history.length), note: "최근 30일" },
          { label: "완료 판단", value: String(completed.length), note: "AI 판단 완료" },
          { label: "WAIT", value: String(counts.WAIT), note: "재확인 후보" },
          { label: "SKIP", value: String(counts.SKIP), note: "불필요 지출 방지" },
        ],
    categoryBars,
    patterns,
    recheck,
    historyCount: history.length,
    premium: { priorities, timeline, riskFlags, scenarioCandidates },
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
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(toHistoryItem);
}

function toHistoryItem(row: Record<string, unknown>): DecisionHistoryItem {
  const verdict = typeof row.verdict === "string" && ["BUY", "WAIT", "SKIP"].includes(row.verdict)
    ? row.verdict as DecisionHistoryItem["verdict"]
    : null;
  const status = row.status === "completed" || row.status === "failed" ? row.status : "pending";
  const inputType = row.input_type === "photo" || row.input_type === "link" || row.input_type === "name" ? row.input_type : "category";
  return {
    id: String(row.id ?? ""),
    createdAt: Number(row.created_at ?? 0),
    inputType,
    inputLabel: String(row.input_label ?? "제품"),
    categoryId: typeof row.category_id === "string" ? row.category_id : null,
    subcategoryId: typeof row.subcategory_id === "string" ? row.subcategory_id : null,
    verdict,
    status,
    result: parseJson<DecisionResult | null>(typeof row.result_json === "string" ? row.result_json : null, null),
  };
}

function priorityScore(item: DecisionHistoryItem) {
  if (!item.result || !item.verdict) return 0;
  const verdictWeight = item.verdict === "BUY" ? 300 : item.verdict === "WAIT" ? 180 : 60;
  return verdictWeight + item.result.confidence + Math.min(30, item.result.reasons.length * 5);
}

function sanitizeProfile(profile: UserModelPayload): UserModelPayload {
  const survey = isRecord(profile.survey) ? profile.survey : {};
  const categoryProfiles = isRecord(profile.categoryProfiles) ? profile.categoryProfiles : {};
  return {
    stateText: typeof profile.stateText === "string" ? profile.stateText.trim().slice(0, 6000) : "",
    structuredState: profile.structuredState ?? null,
    survey: survey as Record<string, string | number>,
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

function humanizeCategory(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
  }
  return output;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
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
