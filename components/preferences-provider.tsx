"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getPageTitle } from "@/lib/ui-locale";
import { isMarket, MARKETS, validTimeZone, type Market } from "@/lib/market";

export type ThemePreference = "light" | "dark";
export type LanguagePreference = "ko" | "en";

type Preferences = {
  theme: ThemePreference;
  language: LanguagePreference;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguagePreference) => void;
  market: Market;
  currency: typeof MARKETS[Market]['currency'];
  timeZone: string;
  ready: boolean;
  setMarket: (market: Market) => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [language, setLanguageState] = useState<LanguagePreference>("en");
  const [market, setMarket] = useState<Market>('US');
  const [timeZone, setTimeZone] = useState('UTC');
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
    const savedTheme = localStorage.getItem("buysor-theme");
    const savedLanguage = localStorage.getItem("buysor-language");
    if (savedTheme === "dark" || savedTheme === "light") setThemeState(savedTheme);
    if (savedLanguage === "ko" || savedLanguage === "en") setLanguageState(savedLanguage);
    const savedMarket = localStorage.getItem('buysor-market');
    if (isMarket(savedMarket)) setMarket(savedMarket);
    } catch { /* A blocked storage policy still allows this session to work. */ }
    setTimeZone(validTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.preferencesReady = "true";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem("buysor-theme", theme); } catch {}
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.title = getPageTitle(pathname, language);
    try { localStorage.setItem("buysor-language", language); } catch {}
  }, [language, pathname, ready]);

  useEffect(() => { if (ready) { try { localStorage.setItem('buysor-market', market); } catch {} } }, [market, ready]);

  const value = useMemo(
    () => ({ theme, language, market, currency: MARKETS[market].currency, timeZone, ready, setMarket, setTheme: setThemeState, setLanguage: setLanguageState }),
    [theme, language, market, timeZone, ready],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}

export function LocalizedText({ ko, en }: { ko: string; en: string }) {
  const { language } = usePreferences();
  return <>{language === "ko" ? ko : en}</>;
}
