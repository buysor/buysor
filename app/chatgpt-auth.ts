import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type SessionPayload = ChatGPTUser & {
  exp: number;
};

const APP_SESSION_COOKIE = "buysor-authenticated-v3";
const LOCAL_EMAIL_COOKIE = "buysor-local-email";

const SIGN_IN_PATH = "/auth/start";
const SIGN_OUT_PATH = "/auth/logout";
const CALLBACK_PATH = "/auth/complete";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function isLocalRequest() {
  if (process.env.BUYSOR_LOCAL_PREVIEW === "1") return true;

  const requestHeaders = await headers();
  const host = (
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    ""
  ).toLowerCase();

  return (
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "localhost" ||
    host.startsWith("localhost:")
  );
}

export async function createGoogleSessionToken(
  user: ChatGPTUser,
): Promise<string> {
  const secret = getSessionSecret();

  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  };

  const encodedPayload = base64UrlEncode(
    encoder.encode(JSON.stringify(payload)),
  );

  const key = await importHmacKey(secret);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function getChatGPTIdentity(): Promise<ChatGPTUser | null> {
  const cookieStore = await cookies();

  if (await isLocalRequest()) {
    const email = cookieStore
      .get(LOCAL_EMAIL_COOKIE)
      ?.value?.trim()
      .toLowerCase();

    if (!email) return null;

    return {
      id: `local:${email}`,
      displayName: email,
      email,
      fullName: null,
    };
  }

  const token = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  return getChatGPTIdentity();
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();

  if (user) return user;

  redirect(
    `/login?return_to=${encodeURIComponent(
      safeRelativeReturnPath(returnTo),
    )}`,
  );
}

export function chatGPTSignInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(
    safeRelativeReturnPath(returnTo),
  )}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(
    safeRelativeReturnPath(returnTo),
  )}`;
}

export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  return safeRelativeReturnPath(value);
}

export const buysorAuthCookie = {
  name: APP_SESSION_COOKIE,
  value: "1",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export const buysorLocalEmailCookie = {
  name: LOCAL_EMAIL_COOKIE,
  options: {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
};

async function verifySessionToken(
  token: string,
): Promise<ChatGPTUser | null> {
  try {
    const [payloadPart, signaturePart, extra] = token.split(".");

    if (!payloadPart || !signaturePart || extra) return null;

    const key = await importHmacKey(getSessionSecret());

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signaturePart),
      encoder.encode(payloadPart),
    );

    if (!valid) return null;

    const payload = JSON.parse(
      decoder.decode(base64UrlDecode(payloadPart)),
    ) as SessionPayload;

    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email.toLowerCase(),
      displayName: payload.displayName,
      fullName:
        typeof payload.fullName === "string"
          ? payload.fullName
          : null,
    };
  } catch {
    return null;
  }
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET must be configured and at least 32 characters.",
    );
  }

  return secret;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
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

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);
  const result = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    result[i] = binary.charCodeAt(i);
  }

  return result;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;

  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }

  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH ||
    pathname === "/signin-with-chatgpt" ||
    pathname === "/signout-with-chatgpt" ||
    pathname === "/callback"
  );
}
