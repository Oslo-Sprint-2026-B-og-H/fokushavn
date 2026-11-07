import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LanguageContext } from '@/contexts/LanguageContext';
import { LANGUAGES, translate, type Language, type Translate } from '@/lib/translations';

const STORAGE_KEY = 'stepwise.language';
const DEFAULT_LANGUAGE: Language = 'en';

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.find((language) => language === stored) ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable; the choice still applies for this visit.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t: Translate = useCallback((key, params) => translate(language, key, params), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageProvider;
