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

type TranslationKey = keyof (typeof translations)['en'];

// One lookup for every provider: the chosen language, then English, then the key.
const translate = (language: Language, key: TranslationKey): string =>
  translations[language][key] ?? translations.en[key] ?? key;

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

  const t = (key: TranslationKey): string => translate(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Renders its children in English whatever language is selected. Used for the
 * sign-in screens (/login, /signup, /auth/verify): they are the first thing an
 * overseas partner sees, and there is no language switch before sign-in.
 *
 * The saved preference is left alone — an admin who chose Korean gets Korean
 * again once signed in. setLanguage still reaches the outer provider.
 */
export const EnglishOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const outer = useContext(LanguageContext);
  const value: LanguageContextType = {
    language: 'en',
    setLanguage: outer?.setLanguage ?? (() => {}),
    t: (key) => translate('en', key),
  };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
