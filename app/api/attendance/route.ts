import { getChatGPTUser } from '@/app/chatgpt-auth';
import { checkIn, getAttendanceSummary } from '@/lib/attendance';
import { assertSameOrigin, json, errorResponse } from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET() {try {const user=await getChatGPTUser();return user?json(await getAttendanceSummary(user)):json({error:'로그인이 필요합니다.'},401);} catch(e){return errorResponse(e);}}
export async function POST(request:Request) {try {assertSameOrigin(request);const user=await getChatGPTUser();return user?json(await checkIn(user)):json({error:'로그인이 필요합니다.'},401);} catch(e){return errorResponse(e);}}
