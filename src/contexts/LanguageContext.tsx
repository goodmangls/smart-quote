import React, { createContext, useContext, useState } from 'react';
import { Language, translations } from '../i18n/translations';

// Language auto-detection removed — English default for global partners
// Admin can switch via language selector in header

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  // A simple translation function
  t: (key: keyof (typeof translations)['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Domains that should always initialize in English regardless of saved preference.
// Global-facing marketing/partner domains default to English for international visitors.
// Users can still manually switch via the language selector; the selection is saved,
// but each new visit re-initializes to English.
const ENGLISH_ONLY_HOSTS = ['bridgelogis.com'];

function isEnglishOnlyHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return ENGLISH_ONLY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // bridgelogis.com (and subdomains) always defaults to English on each visit.
    if (isEnglishOnlyHost()) return 'en';

    // Other domains (vercel.app, localhost, etc.) respect the user's saved preference.
    // Guarded for the build-time prerender (no localStorage under Node).
    if (typeof localStorage === 'undefined') return 'en';
    const saved = localStorage.getItem('smartQuoteLanguage') as Language | null;
    if (saved) return saved;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('smartQuoteLanguage', lang);
  };

  const t = (key: keyof (typeof translations)['en']): string => {
    const val = translations[language][key];
    if (val != null) return val;
    const fallback = translations['en'][key];
    if (fallback != null) return fallback;
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
