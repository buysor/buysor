import { NextRequest, NextResponse } from "next/server";
import { buysorAuthCookie, buysorLocalEmailCookie, isLocalRequest, safeReturnPath } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isLocalRequest())) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const returnTo = safeReturnPath(String(form.get("return_to") || ""), "/my");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.redirect(new URL(`/login?error=email&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  }

  // Local preview intentionally does not touch D1. Attendance/credits are stored
  // in an account-scoped, HTTP-only preview cookie by /api/attendance.
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(buysorLocalEmailCookie.name, email, buysorLocalEmailCookie.options);
  response.cookies.set(buysorAuthCookie.name, buysorAuthCookie.value, buysorAuthCookie.options);
  return response;
}
