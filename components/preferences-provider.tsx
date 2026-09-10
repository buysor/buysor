"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark";
export type LanguagePreference = "ko" | "en";

type Preferences = {
  theme: ThemePreference;
  language: LanguagePreference;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguagePreference) => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [language, setLanguageState] = useState<LanguagePreference>("ko");

  useEffect(() => {
    const savedTheme = localStorage.getItem("buysor-theme");
    const savedLanguage = localStorage.getItem("buysor-language");
    if (savedTheme === "dark" || savedTheme === "light") setThemeState(savedTheme);
    if (savedLanguage === "ko" || savedLanguage === "en") setLanguageState(savedLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("buysor-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("buysor-language", language);
  }, [language]);

  const value = useMemo(
    () => ({ theme, language, setTheme: setThemeState, setLanguage: setLanguageState }),
    [theme, language],
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
