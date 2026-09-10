import type { Metadata } from "next";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getChatGPTUser, isLocalRequest, safeReturnPath } from "@/app/chatgpt-auth";
import { SiteShell } from "@/components/site-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "로그인",
  description: "BUYSOR 계정에 로그인합니다.",
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
          <h1 id="login-title">로그인</h1>
          <p>구매 기록, 출석, 크레딧은 로그인한 계정에만 저장됩니다.</p>

          {hasError ? <div className="login-error">로그인을 완료하지 못했습니다. 다시 시도해 주세요.</div> : null}

          {local ? (
            <>
              <div className="local-auth-notice">
                <strong>로컬 실행에서는 Google 인증 서버를 사용할 수 없습니다.</strong>
                <span>아래 테스트 로그인으로 계정 기능을 확인할 수 있습니다. 실제 공개 사이트에서는 Google 계정 로그인이 표시됩니다.</span>
              </div>
              <form className="local-login-form" action="/auth/local" method="post">
                <input type="hidden" name="return_to" value={returnTo} />
                <label>
                  <span>테스트 이메일</span>
                  <input name="email" type="email" placeholder="name@gmail.com" required autoComplete="email" />
                </label>
                <button type="submit">로컬 기능 테스트 로그인</button>
              </form>
            </>
          ) : (
            <>
              <a className="google-login-button" href={signInPath} target="_top">
                <span className="google-g" aria-hidden="true">G</span>
                <span>Google 계정으로 계속</span>
              </a>
              <p className="login-provider-note">보안 로그인 화면에서 Google 계정을 선택할 수 있습니다. BUYSOR는 Google 비밀번호를 저장하지 않습니다.</p>
            </>
          )}

          <div className="login-security">
            <span><ShieldCheck size={16} /> 비밀번호 저장 안 함</span>
            <span><Mail size={16} /> 로그인 이메일은 계정 식별에만 사용</span>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
