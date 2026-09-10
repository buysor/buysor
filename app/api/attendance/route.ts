import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser, isLocalRequest } from "@/app/chatgpt-auth";
import { checkIn, getAttendanceSummary } from "@/lib/attendance";
import {
  encodeLocalAttendanceState,
  localAttendanceCookie,
  localAttendanceSummary,
  localCheckIn,
  readLocalAttendanceState,
} from "@/lib/local-attendance";

export const dynamic = "force-dynamic";

function unavailable(error: unknown) {
  console.error("Attendance request failed", error);
  return Response.json(
    { error: "출석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    if (await isLocalRequest()) {
      const state = readLocalAttendanceState(request, user);
      const response = NextResponse.json(localAttendanceSummary(state));
      // Always rewrite a valid v2 state so old/corrupt preview cookies are cleaned up.
      response.cookies.set(localAttendanceCookie.name, encodeLocalAttendanceState(state), localAttendanceCookie.options);
      return response;
    }
    return Response.json(await getAttendanceSummary(user));
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    if (await isLocalRequest()) {
      const current = readLocalAttendanceState(request, user);
      const { state, summary } = localCheckIn(current);
      const response = NextResponse.json(summary);
      response.cookies.set(localAttendanceCookie.name, encodeLocalAttendanceState(state), localAttendanceCookie.options);
      return response;
    }
    return Response.json(await checkIn(user));
  } catch (error) {
    return unavailable(error);
  }
}
