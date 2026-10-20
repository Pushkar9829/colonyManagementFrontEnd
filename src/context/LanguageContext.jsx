import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, LANGUAGE_CODES, loadDictionary } from '../lib/i18n';

const KEY = 'cms.language';
const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : text);
const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: fill });

function initialLanguage() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGUAGE_CODES.includes(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const browser = (navigator.language || 'en').slice(0, 2);
  return LANGUAGE_CODES.includes(browser) ? browser : 'en';
}

// English text is the key: t('Visitors') → 'आगंतुक' in Hindi, falling back to English when a phrase
// has no translation yet. `{name}` placeholders are filled from `vars`.
// Loaded dictionaries, kept for the session so switching back is instant.
const loaded = {};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);
  const [dict, setDict] = useState(() => loaded[lang] || null);

  // Fetch the chosen language's chunk; English text shows until it arrives (a moment on first load).
  useEffect(() => {
    if (lang === 'en') {
      setDict(null);
      return undefined;
    }
    if (loaded[lang]) {
      setDict(loaded[lang]);
      return undefined;
    }
    let alive = true;
    loadDictionary(lang)
      .then((d) => {
        loaded[lang] = d;
        if (alive) setDict(d);
      })
      .catch(() => {
        /* offline or failed chunk: stay in English */
      });
    return () => {
      alive = false;
    };
  }, [lang]);

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
      return fill((dict && dict[text]) || text, vars);
    },
    [dict],
  );

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useT = () => useContext(LanguageContext);

// Translates a value only when it is a plain string (shared components use it for label/title props).
export const tr = (t, v) => (typeof v === 'string' ? t(v) : v);
