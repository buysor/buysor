import type { Metadata } from "next";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getChatGPTUser, isLocalRequest, safeReturnPath } from "@/app/chatgpt-auth";
import { SiteShell } from "@/components/site-shell";
import { LocalizedText } from "@/components/preferences-provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your BUYSOR account with Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawReturnTo = Array.isArray(params.return_to) ? params.return_to[0] : params.return_to;
  const returnTo = safeReturnPath(rawReturnTo, "/my");
  const currentUser = await getChatGPTUser();
  if (currentUser) redirect(returnTo);

  const local = await isLocalRequest();
  const signInPath = `/auth/start?return_to=${encodeURIComponent(returnTo)}`;
  const hasError = Boolean(params.error);

  return (
    <SiteShell compact>
      <main className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-lock"><LockKeyhole size={22} /></div>
          <span className="hero-eyebrow">BUYSOR ACCOUNT</span>
          <h1 id="login-title"><LocalizedText ko="로그인" en="Sign in" /></h1>
          <p><LocalizedText ko="구매 기록, 출석, 크레딧은 로그인한 계정에만 저장됩니다." en="Decision history, attendance and credits are saved to your signed-in account." /></p>

          {hasError ? <div className="login-error"><LocalizedText ko="로그인을 완료하지 못했습니다. 다시 시도해 주세요." en="Could not complete sign-in. Please try again." /></div> : null}

          {local ? (
            <>
              <div className="local-auth-notice">
                <strong><LocalizedText ko="로컬 실행에서는 Google 인증 서버를 사용할 수 없습니다." en="Google authentication is unavailable in local preview." /></strong>
                <span><LocalizedText ko="아래 테스트 로그인으로 계정 기능을 확인할 수 있습니다. 실제 공개 사이트에서는 Google 계정 로그인이 표시됩니다." en="Use the local test login below to verify account features. The public site uses Google sign-in." /></span>
              </div>
              <form className="local-login-form" action="/auth/local" method="post">
                <input type="hidden" name="return_to" value={returnTo} />
                <label>
                  <span><LocalizedText ko="테스트 이메일" en="Test email" /></span>
                  <input name="email" type="email" placeholder="name@gmail.com" required autoComplete="email" />
                </label>
                <button type="submit"><LocalizedText ko="로컬 기능 테스트 로그인" en="Local test sign-in" /></button>
              </form>
            </>
          ) : (
            <>
              <a className="google-login-button" href={signInPath} target="_top">
                <span className="google-g" aria-hidden="true">G</span>
                <span><LocalizedText ko="Google 계정으로 계속" en="Continue with Google" /></span>
              </a>
              <p className="login-provider-note"><LocalizedText ko="보안 로그인 화면에서 Google 계정을 선택할 수 있습니다. BUYSOR는 Google 비밀번호를 저장하지 않습니다." en="Choose your Google account on the secure sign-in screen. BUYSOR does not store your Google password." /></p>
            </>
          )}

          <div className="login-security">
            <span><ShieldCheck size={16} /> <LocalizedText ko="비밀번호 저장 안 함" en="Passwords are not stored" /></span>
            <span><Mail size={16} /> <LocalizedText ko="로그인 이메일은 계정 식별에만 사용" en="Sign-in email is used only to identify your account" /></span>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}

