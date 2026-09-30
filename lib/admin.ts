import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { PublicError } from "@/lib/request-safety";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowed = (process.env.BUYSOR_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export function assertAdminUser(user: ChatGPTUser | null) {
  if (!user) throw new PublicError(401, "SIGN_IN_REQUIRED", "로그인이 필요합니다.");
  if (!isAdminEmail(user.email)) throw new PublicError(403, "ADMIN_REQUIRED", "접근 권한이 없습니다.");
  return user;
}
