import { useEffect, useRef, useState } from 'react';
import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

// Language + light/dark theme, stored per device.
// placement "up" opens the list above the button (used at the bottom of the phone menu).
export function PreferencesMenu({ className, placement = "down" }) {
  const { t, lang, setLang, languages } = useT();
  const { theme, setTheme, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const ThemeIcon = resolved === 'dark' ? Moon : Sun;
  return (
    <div className={cn('relative', className)} ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label={`${t('Language')} / ${t('Theme')}`} aria-expanded={open}>
        <Languages className="size-5" />
        <span className="text-xs font-semibold">{{ en: 'EN', hi: 'हि', mr: 'म' }[lang] || lang.toUpperCase()}</span>
        <ThemeIcon className="ml-0.5 size-4" />
      </button>
      {open && (
        <div className={cn("absolute z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg", placement === "up" ? "bottom-full left-0 mb-2" : "right-0 mt-2")}>
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('Language')}</p>
          {languages.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              {l.label}
              {lang === l.code && <Check className="size-4 text-brand-600" />}
            </button>
          ))}
          <p className="border-t border-slate-100 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('Theme')}</p>
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setTheme(value)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <span className="flex items-center gap-2"><Icon className="size-4 text-slate-400" />{t(label)}</span>
              {theme === value && <Check className="size-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
