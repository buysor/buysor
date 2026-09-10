import { NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "buysor-google-state";
const PKCE_COOKIE = "buysor-google-pkce";
const RETURN_COOKIE = "buysor-auth-return";

const TEMP_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/login?error=config", request.url),
    );
  }

  const returnTo = safeReturnPath(
    request.nextUrl.searchParams.get("return_to"),
    "/my",
  );

  const state = randomBase64Url(32);
  const verifier = randomBase64Url(64);
  const challenge = await sha256Base64Url(verifier);

  const redirectUri = new URL(
    "/auth/complete",
    request.url,
  ).toString();

  const authorizationUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set(
    "scope",
    "openid email profile",
  );
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set(
    "code_challenge",
    challenge,
  );
  authorizationUrl.searchParams.set(
    "code_challenge_method",
    "S256",
  );
  authorizationUrl.searchParams.set(
    "prompt",
    "select_account",
  );

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(
    STATE_COOKIE,
    state,
    TEMP_COOKIE_OPTIONS,
  );

  response.cookies.set(
    PKCE_COOKIE,
    verifier,
    TEMP_COOKIE_OPTIONS,
  );

  response.cookies.set(
    RETURN_COOKIE,
    returnTo,
    TEMP_COOKIE_OPTIONS,
  );

  return response;
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(
  value: string,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
