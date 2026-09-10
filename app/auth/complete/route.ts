import { NextRequest, NextResponse } from "next/server";
import {
  buysorAuthCookie,
  createGoogleSessionToken,
  safeReturnPath,
  type ChatGPTUser,
} from "@/app/chatgpt-auth";
import { resetLegacyUserDataOnce } from "@/lib/attendance";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "buysor-google-state";
const PKCE_COOKIE = "buysor-google-pkce";
const RETURN_COOKIE = "buysor-auth-return";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

export async function GET(request: NextRequest) {
  const returnTo = safeReturnPath(
    request.cookies.get(RETURN_COOKIE)?.value,
    "/my",
  );

  const oauthError =
    request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return failure(request, "google", returnTo);
  }

  const code =
    request.nextUrl.searchParams.get("code");

  const returnedState =
    request.nextUrl.searchParams.get("state");

  const expectedState =
    request.cookies.get(STATE_COOKIE)?.value;

  const verifier =
    request.cookies.get(PKCE_COOKIE)?.value;

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !verifier ||
    returnedState !== expectedState
  ) {
    return failure(request, "state", returnTo);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return failure(request, "config", returnTo);
  }

  const redirectUri = new URL(
    "/auth/complete",
    request.url,
  ).toString();

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "content-type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          code_verifier: verifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error(
        "Google token exchange failed:",
        tokenResponse.status,
      );

      return failure(request, "token", returnTo);
    }

    const tokens =
      (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokens.access_token) {
      return failure(request, "token", returnTo);
    }

    const userResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userResponse.ok) {
      console.error(
        "Google userinfo failed:",
        userResponse.status,
      );

      return failure(request, "identity", returnTo);
    }

    const googleUser =
      (await userResponse.json()) as GoogleUserInfo;

    if (
      !googleUser.sub ||
      !googleUser.email ||
      googleUser.email_verified !== true
    ) {
      return failure(request, "identity", returnTo);
    }

    const email = googleUser.email
      .trim()
      .toLowerCase();

    const user: ChatGPTUser = {
      id: `google:${googleUser.sub}`,
      email,
      displayName:
        googleUser.name?.trim() || email,
      fullName:
        googleUser.name?.trim() || null,
    };

    await resetLegacyUserDataOnce(user);

    const sessionToken =
      await createGoogleSessionToken(user);

    const response = NextResponse.redirect(
      new URL(returnTo, request.url),
    );

    response.cookies.set(
      buysorAuthCookie.name,
      sessionToken,
      buysorAuthCookie.options,
    );

    clearTemporaryCookies(response);

    return response;
  } catch (error) {
    console.error(
      "BUYSOR Google OAuth failed:",
      error,
    );

    return failure(request, "oauth", returnTo);
  }
}

function failure(
  request: NextRequest,
  reason: string,
  returnTo: string,
) {
  const response = NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(
        reason,
      )}&return_to=${encodeURIComponent(returnTo)}`,
      request.url,
    ),
  );

  clearTemporaryCookies(response);

  return response;
}

function clearTemporaryCookies(
  response: NextResponse,
) {
  for (const name of [
    STATE_COOKIE,
    PKCE_COOKIE,
    RETURN_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
