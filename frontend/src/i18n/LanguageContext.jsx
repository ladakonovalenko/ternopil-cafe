import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "./translations.js";

const STORAGE_KEY = "ternopilcafes_lang";
const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "uk" || stored === "en") return stored;
  } catch {
    // localStorage може бути недоступний — падаємо на мову браузера нижче
  }
  return navigator.language?.toLowerCase().startsWith("uk") ? "uk" : "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // тихо ігноруємо — мова просто не запам'ятається між візитами
    }
  }, [lang]);

  function t(key, vars) {
    let str = translations[key]?.[lang] ?? translations[key]?.uk ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage має використовуватись всередині LanguageProvider");
  return ctx;
}
