import { NextRequest, NextResponse } from "next/server";
import { buysorAuthCookie, getChatGPTIdentity, safeReturnPath } from "@/app/chatgpt-auth";
import { resetLegacyUserDataOnce } from "@/lib/attendance";

export const dynamic = "force-dynamic";
const FLOW_COOKIE = "buysor-auth-flow";
const RETURN_COOKIE = "buysor-auth-return";

export async function GET(request: NextRequest) {
  if (request.cookies.get(FLOW_COOKIE)?.value !== "1") {
    return NextResponse.redirect(new URL("/login?error=flow", request.url));
  }
  const user = await getChatGPTIdentity();
  const returnTo = safeReturnPath(request.cookies.get(RETURN_COOKIE)?.value, "/my");
  if (!user) return NextResponse.redirect(new URL(`/login?error=identity&return_to=${encodeURIComponent(returnTo)}`, request.url));
  try {
    await resetLegacyUserDataOnce(user);
  } catch (error) {
    console.error("BUYSOR account initialization failed", error);
    return NextResponse.redirect(new URL(`/login?error=account&return_to=${encodeURIComponent(returnTo)}`, request.url));
  }
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(buysorAuthCookie.name, buysorAuthCookie.value, buysorAuthCookie.options);
  response.cookies.set(FLOW_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
