import { getD1Binding } from "@/db";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

const BONUS_MONTHLY_CAP = 30;
const KST_TIME_ZONE = "Asia/Seoul";
const MILESTONES = [3, 7, 14, 21, 30] as const;
const RESET_REFERENCE_VERSION = "launch-clean-slate-v1";

type AttendanceRow = {
  attendance_date: string;
  daily_reward: number;
  milestone_reward: number;
};

export type AttendanceSummary = {
  today: string;
  checkedToday: boolean;
  streak: number;
  bonusCredits: number;
  monthlyCap: number;
  latestReward: number;
  creditedReward: number;
  wheelReward: number;
  bonusReward: number;
  nextMilestone: number | null;
  week: Array<{
    date: string;
    weekday: string;
    day: number;
    checked: boolean;
    isToday: boolean;
  }>;
};

export function kstDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(date: string, days: number) {
  const current = new Date(`${date}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function monthEnd(date: string) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function calculateStreak(dates: string[], today: string) {
  const checked = new Set(dates);
  let cursor = checked.has(today) ? today : shiftDate(today, -1);
  if (!checked.has(cursor)) return 0;

  let streak = 0;
  while (checked.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** Uniform random integer in [0, maxExclusive) without modulo bias. */
function secureIntBelow(maxExclusive: number) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive safe integer");
  }
  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

/** 1C 50%, 2C 25%, 3C 15%, 4C 9%, 5C 0.9%, 10C 0.1%. No losing result. */
function dailyReward() {
  const roll = secureIntBelow(1000);
  if (roll < 500) return 1;
  if (roll < 750) return 2;
  if (roll < 900) return 3;
  if (roll < 990) return 4;
  if (roll < 999) return 5;
  return 10;
}

/** 30-day jackpot: 1C 70%, 3C 20%, 5C 9%, 10C 1%. */
function jackpotReward() {
  const roll = secureIntBelow(100);
  if (roll < 70) return 1;
  if (roll < 90) return 3;
  if (roll < 99) return 5;
  return 10;
}

/**
 * Streak reward policy.
 * 7/14-day rewards include one additional daily-wheel draw.
 * 30-day reward includes the jackpot draw.
 */
function milestoneReward(streak: number) {
  if (streak === 3) return 1;
  if (streak === 7) return 2 + dailyReward();
  if (streak === 14) return 3 + dailyReward();
  if (streak === 21) return 4;
  if (streak === 30) return 5 + jackpotReward();
  return 0;
}

async function ensureUser(user: ChatGPTUser) {
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
    .bind(user.id, user.email, user.email, now, now)
    .run();
}

/**
 * One-time per-user clean slate for launch.
 * It clears attendance and every existing credit entry once, then leaves a
 * zero-value marker so future logins never reset real usage again.
 */
export async function resetLegacyUserDataOnce(user: ChatGPTUser) {
  const db = getD1Binding();
  const existingUser = await db
    .prepare(`SELECT id FROM users WHERE id = ? LIMIT 1`)
    .bind(user.id)
    .first<{ id: string }>();

  await ensureUser(user);
  const referenceKey = `system:${RESET_REFERENCE_VERSION}:${user.id}`;
  const marker = await db
    .prepare(`SELECT id FROM credit_ledger WHERE reference_key = ? LIMIT 1`)
    .bind(referenceKey)
    .first<{ id: number }>();
  if (marker) return;

  const now = Date.now();
  const today = kstDate();

  if (existingUser) {
    // Existing account: requested launch clean slate. This runs exactly once.
    await db.batch([
      db.prepare(`DELETE FROM attendance WHERE user_id = ?`).bind(user.id),
      db.prepare(`DELETE FROM credit_ledger WHERE user_id = ?`).bind(user.id),
      db
        .prepare(
          `INSERT INTO credit_ledger
            (user_id, amount, source, reference_key, expires_on, created_at)
           VALUES (?, 0, 'system_reset', ?, '9999-12-31', ?)`,
        )
        .bind(user.id, referenceKey, now),
    ]);
    return;
  }

  // Genuine new account: keep the established +8C signup policy.
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO credit_ledger
          (user_id, amount, source, reference_key, expires_on, created_at)
         VALUES (?, 8, 'signup', ?, ?, ?)`,
      )
      .bind(user.id, `signup:${user.id}`, monthEnd(today), now),
    db
      .prepare(
        `INSERT OR IGNORE INTO credit_ledger
          (user_id, amount, source, reference_key, expires_on, created_at)
         VALUES (?, 0, 'system_reset', ?, '9999-12-31', ?)`,
      )
      .bind(user.id, referenceKey, now),
  ]);
}

async function readRows(userId: string, today: string) {
  const db = getD1Binding();
  const result = await db
    .prepare(
      `SELECT attendance_date, daily_reward, milestone_reward
       FROM attendance
       WHERE user_id = ? AND attendance_date >= ?
       ORDER BY attendance_date DESC`,
    )
    .bind(userId, shiftDate(today, -45))
    .all<AttendanceRow>();
  return result.results ?? [];
}

async function readBonusCredits(userId: string, today: string) {
  const row = await getD1Binding()
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM credit_ledger
       WHERE user_id = ?
         AND source != 'system_reset'
         AND amount > 0
         AND expires_on >= ?
         AND created_at >= ?`,
    )
    .bind(userId, today, Date.parse(`${monthStart(today)}T00:00:00Z`))
    .first<{ total: number }>();
  return Number(row?.total ?? 0);
}

async function readTodayCredited(userId: string, today: string) {
  const row = await getD1Binding()
    .prepare(
      `SELECT amount
       FROM credit_ledger
       WHERE user_id = ? AND reference_key = ?
       LIMIT 1`,
    )
    .bind(userId, `attendance:${userId}:${today}`)
    .first<{ amount: number }>();
  return Number(row?.amount ?? 0);
}

function toSummary(rows: AttendanceRow[], bonusCredits: number, creditedToday: number, today: string): AttendanceSummary {
  const dates = rows.map((row) => row.attendance_date);
  const streak = calculateStreak(dates, today);
  const checkedToday = dates.includes(today);
  const todayRow = rows.find((row) => row.attendance_date === today);
  const checked = new Set(dates);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(today, index - 6);
    return {
      date,
      weekday: weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()],
      day: Number(date.slice(-2)),
      checked: checked.has(date),
      isToday: date === today,
    };
  });

  const wheelReward = todayRow ? Number(todayRow.daily_reward) : 0;
  const bonusReward = todayRow ? Number(todayRow.milestone_reward) : 0;

  return {
    today,
    checkedToday,
    streak,
    bonusCredits,
    monthlyCap: BONUS_MONTHLY_CAP,
    latestReward: creditedToday,
    creditedReward: creditedToday,
    wheelReward,
    bonusReward,
    nextMilestone: MILESTONES.find((milestone) => milestone > streak) ?? null,
    week,
  };
}

export async function getAttendanceSummary(user: ChatGPTUser) {
  const today = kstDate();
  await ensureUser(user);
  const [rows, bonusCredits, creditedToday] = await Promise.all([
    readRows(user.id, today),
    readBonusCredits(user.id, today),
    readTodayCredited(user.id, today),
  ]);
  return toSummary(rows, bonusCredits, creditedToday, today);
}

export async function checkIn(user: ChatGPTUser) {
  const db = getD1Binding();
  const today = kstDate();
  await ensureUser(user);

  const existing = await db
    .prepare(
      `SELECT attendance_date, daily_reward, milestone_reward
       FROM attendance WHERE user_id = ? AND attendance_date = ?`,
    )
    .bind(user.id, today)
    .first<AttendanceRow>();
  if (existing) return getAttendanceSummary(user);

  const [rows, currentBonus] = await Promise.all([
    readRows(user.id, today),
    readBonusCredits(user.id, today),
  ]);
  const projectedDates = [today, ...rows.map((row) => row.attendance_date)];
  const streak = calculateStreak(projectedDates, today);
  const base = dailyReward();
  const milestone = milestoneReward(streak);
  const remaining = Math.max(0, BONUS_MONTHLY_CAP - currentBonus);
  const now = Date.now();

  // Concurrency safety: the ledger entry reads the winning attendance row.
  // If two POSTs race, only one attendance row and one ledger entry can exist.
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO attendance
          (user_id, attendance_date, daily_reward, milestone_reward, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(user.id, today, base, milestone, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO credit_ledger
          (user_id, amount, source, reference_key, expires_on, created_at)
         SELECT user_id,
                CASE
                  WHEN (daily_reward + milestone_reward) > ? THEN ?
                  ELSE (daily_reward + milestone_reward)
                END,
                'attendance',
                ?,
                ?,
                ?
         FROM attendance
         WHERE user_id = ?
           AND attendance_date = ?
           AND ? > 0
           AND (daily_reward + milestone_reward) > 0`,
      )
      .bind(
        remaining,
        remaining,
        `attendance:${user.id}:${today}`,
        monthEnd(today),
        now,
        user.id,
        today,
        remaining,
      ),
  ]);

  return getAttendanceSummary(user);
}
