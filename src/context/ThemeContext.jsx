import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'cms.theme';
const ThemeContext = createContext({ theme: 'system', setTheme: () => {}, resolved: 'light' });

const readSaved = () => {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
};

// 'light' | 'dark' | 'system'. Applies the `dark` class on <html>; colours are remapped in index.css.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readSaved);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#4f46e5');
  }, [resolved]);

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme(next) {
        setThemeState(next);
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
