import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'cms.theme';
const ThemeContext = createContext({ theme: 'system', setTheme: () => {}, resolved: 'light' });

// null when the person never picked a theme (then a dark-first app template may start dark).
const readSaved = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

// 'light' | 'dark' | 'system'. Applies the `dark` class on <html>; colours are remapped in index.css.
export function ThemeProvider({ children }) {
  const [saved, setSaved] = useState(readSaved);
  const theme = saved || 'system';
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  // lib/template.js announces the applied template; Night Sky and other dark-first templates start dark.
  const [darkFirst, setDarkFirst] = useState(() => document.documentElement.getAttribute('data-dark-first') === 'true');

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const onTemplate = (e) => setDarkFirst(Boolean(e.detail?.darkFirst));
    root.addEventListener('cms:template', onTemplate);
    return () => root.removeEventListener('cms:template', onTemplate);
  }, []);

  const resolved = theme === 'system' ? (systemDark || (!saved && darkFirst) ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    const brand = getComputedStyle(root).getPropertyValue('--tpl-brand-600').trim() || '#4f46e5';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0f172a' : brand);
  }, [resolved]);

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme(next) {
        setSaved(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* ignore */
        }
      },
    }),
    [theme, resolved],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
