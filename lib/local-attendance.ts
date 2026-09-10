import type { NextRequest } from "next/server";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import type { AttendanceSummary } from "@/lib/attendance";
import { kstDate } from "@/lib/attendance";

const BONUS_MONTHLY_CAP = 30;
const MILESTONES = [3, 7, 14, 21, 30] as const;
const COOKIE_NAME = "buysor-local-attendance-v4";
const MAX_LOCAL_DAYS = 35;

export const localAttendanceCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  },
};

// Compact tuple keeps the local preview cookie safely below browser cookie limits.
// [KST date, wheel reward, milestone reward, actually credited reward]
type LocalAttendanceRow = [string, number, number, number];

type LocalAttendanceState = {
  v: 2;
  u: string;
  r: LocalAttendanceRow[];
};

function emptyState(userId: string): LocalAttendanceState {
  return { v: 2, u: userId, r: [] };
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeLocalAttendanceState(state: LocalAttendanceState) {
  return toBase64Url(JSON.stringify(state));
}

function isValidRow(value: unknown): value is LocalAttendanceRow {
  if (!Array.isArray(value) || value.length !== 4) return false;
  const [date, daily, milestone, credited] = value;
  return typeof date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(daily)
    && Number.isFinite(milestone)
    && Number.isFinite(credited)
    && daily >= 0
    && milestone >= 0
    && credited >= 0;
}

function decodeLocalAttendanceState(value: string | undefined, userId: string): LocalAttendanceState {
  if (!value) return emptyState(userId);
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as Partial<LocalAttendanceState>;
    if (parsed.v !== 2 || parsed.u !== userId || !Array.isArray(parsed.r)) {
      return emptyState(userId);
    }
    return {
      v: 2,
      u: userId,
      r: parsed.r.filter(isValidRow).slice(-MAX_LOCAL_DAYS),
    };
  } catch {
    return emptyState(userId);
  }
}

export function readLocalAttendanceState(request: NextRequest, user: ChatGPTUser) {
  return decodeLocalAttendanceState(request.cookies.get(COOKIE_NAME)?.value, user.id);
}

function shiftDate(date: string, days: number) {
  const current = new Date(`${date}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
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

function milestoneReward(streak: number) {
  if (streak === 3) return 1;
  if (streak === 7) return 2 + dailyReward();
  if (streak === 14) return 3 + dailyReward();
  if (streak === 21) return 4;
  if (streak === 30) return 5 + jackpotReward();
  return 0;
}

function currentMonthCredits(rows: LocalAttendanceRow[], today: string) {
  const month = today.slice(0, 7);
  return rows
    .filter(([date]) => date.startsWith(month))
    .reduce((sum, [, , , credited]) => sum + Math.max(0, credited), 0);
}

export function localAttendanceSummary(state: LocalAttendanceState): AttendanceSummary {
  const today = kstDate();
  const rows = state.r
    .filter(([date]) => date >= shiftDate(today, -MAX_LOCAL_DAYS))
    .sort((a, b) => b[0].localeCompare(a[0]));
  const dates = rows.map(([date]) => date);
  const streak = calculateStreak(dates, today);
  const todayRow = rows.find(([date]) => date === today);
  const checkedToday = Boolean(todayRow);
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

  const bonusCredits = currentMonthCredits(rows, today);
  const wheelReward = todayRow?.[1] ?? 0;
  const bonusReward = todayRow?.[2] ?? 0;
  const creditedReward = todayRow?.[3] ?? 0;

  return {
    today,
    checkedToday,
    streak,
    bonusCredits,
    monthlyCap: BONUS_MONTHLY_CAP,
    latestReward: creditedReward,
    creditedReward,
    wheelReward,
    bonusReward,
    nextMilestone: MILESTONES.find((milestone) => milestone > streak) ?? null,
    week,
  };
}

export function localCheckIn(state: LocalAttendanceState) {
  const today = kstDate();
  if (state.r.some(([date]) => date === today)) {
    return { state, summary: localAttendanceSummary(state) };
  }

  const streak = calculateStreak([today, ...state.r.map(([date]) => date)], today);
  const wheelReward = dailyReward();
  const bonusReward = milestoneReward(streak);
  const currentBonus = currentMonthCredits(state.r, today);
  const remaining = Math.max(0, BONUS_MONTHLY_CAP - currentBonus);
  const creditedReward = Math.min(remaining, wheelReward + bonusReward);

  const nextState: LocalAttendanceState = {
    v: 2,
    u: state.u,
    r: [
      ...state.r.filter(([date]) => date !== today).slice(-(MAX_LOCAL_DAYS - 1)),
      [today, wheelReward, bonusReward, creditedReward],
    ],
  };

  return { state: nextState, summary: localAttendanceSummary(nextState) };
}
