"use client";

import {
  BookOpenText,
  Camera,
  CalendarRange,
  ChartNoAxesCombined,
  Coins,
  CreditCard,
  Flame,
  Headphones,
  Languages,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthControl } from "@/components/auth-control";
import { usePreferences } from "@/components/preferences-provider";
import styles from "./site-shell.module.css";

type SiteShellProps = {
  children: React.ReactNode;
  compact?: boolean;
};

export function SiteShell({ children, compact = false }: SiteShellProps) {
  const { language, setLanguage, theme, setTheme } = usePreferences();
  const ko = language === "ko";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className={`site-shell ${styles.shell}`}>
      <header className={`site-header ${styles.header}`}>
        <Link className="brand" href="/" aria-label="BUYSOR 홈">
          <span className="brand-mark">B</span>
          <span>BUYSOR</span>
        </Link>

        <nav className={`main-nav ${styles.nav}`} aria-label={ko ? "빠른 메뉴" : "Quick navigation"}>
          <Link href="/">{ko ? "구매 결정" : "Decide"}</Link>
          <Link href="/lens">Lens</Link>
          <Link href="/category">{ko ? "카테고리" : "Category"}</Link>
          <Link href="/credits">{ko ? "크레딧" : "Credits"}</Link>
          <Link href="/pricing">{ko ? "월 결제" : "Plans"}</Link>
        </nav>

        <div className={`header-tools ${styles.tools}`}>
          <AuthControl />
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.menuButton}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
              <span>{ko ? "메뉴" : "Menu"}</span>
            </button>

            {menuOpen ? (
              <div className={styles.menuPanel} role="menu">
                <div className={styles.menuHeader}>
                  <strong>{ko ? "전체 메뉴" : "All menu"}</strong>
                  <span>{ko ? "필요한 기능만 여기서 찾으세요." : "Find every BUYSOR feature here."}</span>
                </div>

                <div className={styles.menuGroup}>
                  <span>{ko ? "나를 위한 바이저" : "Personal BUYSOR"}</span>
                  <Link href="/profile" role="menuitem" onClick={() => setMenuOpen(false)}><UserRound size={17} /><div><strong>{ko ? "내 프로필" : "My profile"}</strong><small>{ko ? "현재 상태 · 정밀 구매 프로필" : "Current state · detailed profile"}</small></div></Link>
                  <Link href="/reports/weekly" role="menuitem" onClick={() => setMenuOpen(false)}><CalendarRange size={17} /><div><strong>{ko ? "주간 리포트" : "Weekly report"}</strong><small>{ko ? "이번 주 판단과 다시 볼 결정" : "This week's decisions"}</small></div></Link>
                  <Link href="/reports/monthly" role="menuitem" onClick={() => setMenuOpen(false)}><ChartNoAxesCombined size={17} /><div><strong>{ko ? "월간 리포트" : "Monthly report"}</strong><small>{ko ? "성향 변화 · 장기 구매 전략" : "Trends · long-term strategy"}</small></div></Link>
                  <Link href="/my" role="menuitem" onClick={() => setMenuOpen(false)}><UserRound size={17} /><div><strong>{ko ? "내 바이저" : "My BUYSOR"}</strong><small>{ko ? "기록과 개인 설정 관리" : "History and settings"}</small></div></Link>
                </div>

                <div className={styles.menuGroup}>
                  <span>{ko ? "결제" : "Billing"}</span>
                  <Link href="/credits" role="menuitem" onClick={() => setMenuOpen(false)}><Coins size={17} /><div><strong>{ko ? "크레딧" : "Credits"}</strong><small>{ko ? "잔액 · 충전 · 사용 기준" : "Balance · top up · usage"}</small></div></Link>
                  <Link href="/pricing" role="menuitem" onClick={() => setMenuOpen(false)}><CreditCard size={17} /><div><strong>{ko ? "월 결제" : "Membership"}</strong><small>{ko ? "플랜과 월 크레딧 보기" : "Plans and monthly credits"}</small></div></Link>
                </div>

                <div className={styles.menuGroup}>
                  <span>{ko ? "도구" : "Tools"}</span>
                  <Link href="/attendance" role="menuitem" onClick={() => setMenuOpen(false)}><Flame size={17} /><div><strong>{ko ? "출석 룰렛" : "Daily wheel"}</strong><small>{ko ? "출석 · 보너스 크레딧" : "Attendance · bonus credits"}</small></div></Link>
                  <Link href="/guide" role="menuitem" onClick={() => setMenuOpen(false)}><BookOpenText size={17} /><div><strong>{ko ? "설명서" : "Guide"}</strong><small>{ko ? "BUYSOR 사용 방법" : "How to use BUYSOR"}</small></div></Link>
                  <Link href="/support" role="menuitem" onClick={() => setMenuOpen(false)}><Headphones size={17} /><div><strong>{ko ? "고객지원" : "Support"}</strong><small>{ko ? "상담봇 · 계정 · 오류 문의" : "Chat · account · errors"}</small></div></Link>
                </div>

                <div className={styles.menuSettings}>
                  <button type="button" onClick={() => setLanguage(ko ? "en" : "ko")}><Languages size={16} /> {ko ? "English" : "한국어"}</button>
                  <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                    {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                    {theme === "light" ? (ko ? "다크 모드" : "Dark mode") : (ko ? "라이트 모드" : "Light mode")}
                  </button>
                </div>

                <Link className={styles.menuLensCta} href="/lens" onClick={() => setMenuOpen(false)}><Camera size={17} /> {ko ? "사진으로 구매 결정 시작" : "Start with a photo"}</Link>
              </div>
            ) : null}
          </div>

          <Link className={`header-cta ${styles.desktopCta}`} href="/lens"><Camera aria-hidden="true" size={17} />{ko ? "사진으로 시작" : "Start with a photo"}</Link>
        </div>
      </header>
      <div className={compact ? "page-frame page-frame--compact" : "page-frame"}>{children}</div>
    </div>
  );
}
