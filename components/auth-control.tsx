"use client";

import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePreferences } from "@/components/preferences-provider";

type Me = { authenticated: false } | { authenticated: true; email: string };

export function AuthControl() {
  const { language } = usePreferences();
  const ko = language === "ko";
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json() as Promise<Me>)
      .then((payload) => { if (active) setMe(payload); })
      .catch(() => { if (active) setMe({ authenticated: false }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!me?.authenticated) {
    return (
      <a className="header-auth" href="/login?return_to=%2Fmy" aria-label={ko ? "로그인" : "Sign in"}>
        <LogIn size={16} /> <span>{ko ? "로그인" : "Sign in"}</span>
      </a>
    );
  }

  return (
    <div className="auth-control" ref={rootRef}>
      <button type="button" className="header-auth header-auth--signed" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <UserRound size={16} /> <span>{ko ? "계정" : "Account"}</span>
      </button>
      {open ? (
        <div className="auth-menu" role="menu">
          <div className="auth-menu-email">{me.email}</div>
          <a href="/my" role="menuitem"><UserRound size={15} /> {ko ? "내 바이저" : "My BUYSOR"}</a>
          <a href="/auth/logout" role="menuitem"><LogOut size={15} /> {ko ? "로그아웃" : "Sign out"}</a>
        </div>
      ) : null}
    </div>
  );
}
