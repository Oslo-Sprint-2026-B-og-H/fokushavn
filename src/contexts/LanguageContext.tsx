import { createContext } from 'react';
import type { Language, Translate } from '@/lib/translations';

export type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
