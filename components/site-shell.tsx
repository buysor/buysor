"use client";

import { Camera, Languages, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { AuthControl } from "@/components/auth-control";
import { usePreferences } from "@/components/preferences-provider";

type SiteShellProps = {
  children: React.ReactNode;
  compact?: boolean;
};

export function SiteShell({ children, compact = false }: SiteShellProps) {
  const { language, setLanguage, theme, setTheme } = usePreferences();
  const ko = language === "ko";

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="BUYSOR 홈">
          <span className="brand-mark">B</span>
          <span>BUYSOR</span>
        </Link>

        <nav className="main-nav" aria-label={ko ? "주요 메뉴" : "Main navigation"}>
          <Link href="/">{ko ? "구매 결정" : "Decide"}</Link>
          <Link href="/lens">Lens</Link>
          <Link href="/category">{ko ? "카테고리" : "Category"}</Link>
          <Link href="/attendance">{ko ? "출석 룰렛" : "Daily wheel"}</Link>
          <Link href="/my">{ko ? "내 바이저" : "My BUYSOR"}</Link>
          <Link href="/guide">{ko ? "설명서" : "Guide"}</Link>
        </nav>

        <div className="header-tools">
          <button type="button" className="header-tool" onClick={() => setLanguage(ko ? "en" : "ko")} aria-label={ko ? "Switch to English" : "한국어로 전환"} title={ko ? "English" : "한국어"}>
            <Languages aria-hidden="true" size={17} />
            <span>{ko ? "EN" : "한"}</span>
          </button>
          <button type="button" className="header-tool header-tool--icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? (ko ? "다크 모드" : "Dark mode") : (ko ? "라이트 모드" : "Light mode")} title={theme === "light" ? (ko ? "다크 모드" : "Dark mode") : (ko ? "라이트 모드" : "Light mode")}>
            {theme === "light" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}
          </button>
          <AuthControl />
          <Link className="header-cta" href="/lens">
            <Camera aria-hidden="true" size={17} />
            {ko ? "사진으로 시작" : "Start with a photo"}
          </Link>
        </div>
      </header>
      <div className={compact ? "page-frame page-frame--compact" : "page-frame"}>{children}</div>
    </div>
  );
}
