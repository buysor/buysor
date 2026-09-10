import { NextRequest, NextResponse } from "next/server";
import { buysorAuthCookie, buysorLocalEmailCookie } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(buysorAuthCookie.name, "", { ...buysorAuthCookie.options, maxAge: 0 });
  response.cookies.set(buysorLocalEmailCookie.name, "", { ...buysorLocalEmailCookie.options, maxAge: 0 });
  return response;
}
