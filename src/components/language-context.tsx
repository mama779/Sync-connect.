"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '@/lib/translations';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  useEffect(() => {
    // 1. Check local storage
    const savedLang = localStorage.getItem('app-language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
      setLanguageState(savedLang);
    } else {
      // 2. Detect from browser locale
      const browserLang = navigator.language.split('-')[0] as Language;
      if (browserLang === 'en' || browserLang === 'es') {
        setLanguageState(browserLang);
      } else {
        // 3. Fallback to Spanish as requested
        setLanguageState('es');
      }
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
