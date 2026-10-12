import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICTIONARIES, LANGUAGES } from '../lib/i18n';

const KEY = 'cms.language';
const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });

function initialLanguage() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICTIONARIES[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  const browser = (navigator.language || 'en').slice(0, 2);
  return DICTIONARIES[browser] ? browser : 'en';
}

// English text is the key: t('Visitors') → 'आगंतुक' in Hindi, falling back to English when a phrase
// has no translation yet. `{name}` placeholders are filled from `vars`.
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = `${lang}-IN`; // Indian date and number conventions
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (text, vars) => {
      const out = (lang !== 'en' && DICTIONARIES[lang]?.[text]) || text;
      return vars ? out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : out;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useT = () => useContext(LanguageContext);
