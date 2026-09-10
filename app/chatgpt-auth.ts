import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const APP_SESSION_COOKIE = "buysor-authenticated-v3";
const LOCAL_EMAIL_COOKIE = "buysor-local-email";

export async function isLocalRequest() {
  // The local launcher sets this explicitly. vinext/Cloudflare dev mode can
  // rewrite the Host header, so Host-only detection is not reliable.
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

export async function getChatGPTIdentity(): Promise<ChatGPTUser | null> {
  if (await isLocalRequest()) {
    const cookieStore = await cookies();
    const email = cookieStore.get(LOCAL_EMAIL_COOKIE)?.value?.trim().toLowerCase();
    if (!email) return null;
    return {
      id: `local:${email}`,
      displayName: email,
      email,
      fullName: null,
    };
  }

  const requestHeaders = await headers();
  const id = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!id || !email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName = encodedFullName && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
    ? safeDecodeURIComponent(encodedFullName)
    : null;

  return {
    id,
    displayName: email,
    email,
    fullName,
  };
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(APP_SESSION_COOKIE)?.value !== "1") return null;
  return getChatGPTIdentity();
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function safeReturnPath(value: string | null | undefined, fallback = "/"): string {
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
  return pathname === SIGN_IN_PATH || pathname === SIGN_OUT_PATH || pathname === CALLBACK_PATH;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
