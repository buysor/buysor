import { NextRequest, NextResponse } from "next/server";
import { chatGPTSignInPath, isLocalRequest, safeReturnPath } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

const FLOW_COOKIE = "buysor-auth-flow";
const RETURN_COOKIE = "buysor-auth-return";
const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

export async function GET(request: NextRequest) {
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("return_to"), "/my");
  if (await isLocalRequest()) {
    return NextResponse.redirect(new URL(`/login?error=local&return_to=${encodeURIComponent(returnTo)}`, request.url));
  }
  const response = NextResponse.redirect(new URL(chatGPTSignInPath("/auth/complete"), request.url));
  response.cookies.set(FLOW_COOKIE, "1", cookieBase);
  response.cookies.set(RETURN_COOKIE, returnTo, cookieBase);
  return response;
}
