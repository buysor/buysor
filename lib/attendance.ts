import { dateInZone, validTimeZone } from "./market";
import { getD1Binding } from "@/db";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

const BONUS_MONTHLY_CAP = 0;
const KST_TIME_ZONE = "Asia/Seoul";
const MILESTONES: readonly number[] = [];

type AttendanceRow = {
  attendance_date: string;
  created_at: number;
  daily_reward: number;
  milestone_reward: number;
};

export type AttendanceSummary = {
  today: string;
  timeZone: string;
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

async function ensureUser(user: ChatGPTUser) {
  const db = getD1Binding();
  await db.prepare(`CREATE TABLE IF NOT EXISTS attendance_visits (user_id TEXT NOT NULL, visited_date TEXT NOT NULL, time_zone TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(user_id,visited_date,time_zone))`).run();
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

/** Compatibility name only: ensure identity; never delete balances or grant rewards. */
export async function resetLegacyUserDataOnce(user: ChatGPTUser) { await ensureUser(user); }

async function readRows(userId: string, today: string) {
  const db = getD1Binding();
  const result = await db
    .prepare(
      `SELECT attendance_date, daily_reward, milestone_reward, created_at
       FROM attendance
       WHERE user_id = ? AND attendance_date >= ?
       ORDER BY attendance_date DESC`,
    )
    .bind(userId, shiftDate(today, -45))
    .all<AttendanceRow>();
  const visits = await db.prepare(`SELECT visited_date attendance_date,created_at,0 daily_reward,0 milestone_reward FROM attendance_visits WHERE user_id=? AND created_at>=?`).bind(userId,Date.parse(`${shiftDate(today,-46)}T00:00:00Z`)).all<AttendanceRow>();
  return [...(result.results ?? []), ...(visits.results ?? [])];
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

function toSummary(rows: AttendanceRow[], bonusCredits: number, creditedToday: number, today: string, timeZone: string): AttendanceSummary {
  const dates = rows.map((row) => row.attendance_date);
  const streak = calculateStreak(dates, today);
  const checkedToday = dates.includes(today);
  const todayRow = rows.find((row) => row.attendance_date === today);
  const checked = new Set(dates);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    timeZone,
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

export async function getAttendanceSummary(user: ChatGPTUser, requestedZone = "UTC") {
  const timeZone = validTimeZone(requestedZone);
  const today = dateInZone(new Date(), timeZone);
  await ensureUser(user);
  const [rows, bonusCredits, creditedToday] = await Promise.all([
    readRows(user.id, today),
    readBonusCredits(user.id, today),
    readTodayCredited(user.id, today),
  ]);
  const localized = rows.map(row => ({ ...row, attendance_date: row.created_at ? dateInZone(new Date(row.created_at), timeZone) : row.attendance_date }));
  return toSummary(localized, bonusCredits, creditedToday, today, timeZone);
}

export async function checkIn(user: ChatGPTUser, requestedZone = "UTC") {
  const timeZone = validTimeZone(requestedZone);
  const db = getD1Binding(); const today = dateInZone(new Date(), timeZone); await ensureUser(user);
  if ((await getAttendanceSummary(user, timeZone)).checkedToday) return getAttendanceSummary(user, timeZone);
  await db.prepare(`INSERT OR IGNORE INTO attendance_visits
    (user_id,visited_date,time_zone,created_at) VALUES(?,?,?,?)`)
    .bind(user.id,today,timeZone,Date.now()).run();
  return getAttendanceSummary(user, timeZone);
}

