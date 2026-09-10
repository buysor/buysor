"use client";

import { Check, Languages, Moon, Settings2, Sun } from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";

export function PreferencesPanel() {
  const { language, setLanguage, theme, setTheme } = usePreferences();
  const ko = language === "ko";

  return (
    <section className="preferences-card" aria-labelledby="preferences-title">
      <div className="preferences-heading">
        <span className="section-kicker"><Settings2 aria-hidden="true" size={14} /> {ko ? "개인 설정" : "PREFERENCES"}</span>
        <h2 id="preferences-title">{ko ? "내 화면 설정" : "Make it yours"}</h2>
        <p>{ko ? "선택한 설정은 이 기기에 자동 저장됩니다." : "Your choices are saved on this device."}</p>
      </div>

      <div className="preference-groups">
        <fieldset className="preference-group">
          <legend>{ko ? "화면" : "Appearance"}</legend>
          <div className="segmented-setting">
            <button type="button" className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}>
              <Sun aria-hidden="true" size={18} /><span>{ko ? "화이트" : "Light"}</span>{theme === "light" ? <Check aria-hidden="true" size={16} /> : null}
            </button>
            <button type="button" className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>
              <Moon aria-hidden="true" size={18} /><span>{ko ? "블랙" : "Dark"}</span>{theme === "dark" ? <Check aria-hidden="true" size={16} /> : null}
            </button>
          </div>
        </fieldset>

        <fieldset className="preference-group">
          <legend>{ko ? "언어" : "Language"}</legend>
          <div className="segmented-setting">
            <button type="button" className={language === "ko" ? "selected" : ""} onClick={() => setLanguage("ko")} aria-pressed={language === "ko"}>
              <Languages aria-hidden="true" size={18} /><span>한국어</span>{language === "ko" ? <Check aria-hidden="true" size={16} /> : null}
            </button>
            <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>
              <Languages aria-hidden="true" size={18} /><span>English</span>{language === "en" ? <Check aria-hidden="true" size={16} /> : null}
            </button>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
