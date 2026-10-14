import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, Car, CornerDownLeft, DoorOpen, Package, Receipt, Search, Users, Wrench, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { navFor } from '../../../app/navigation';
import { useFeatures } from '../../features/api';
import { Spinner } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { permissionChecker } from '../../../lib/platformPermissions';
import { useGlobalSearch } from '../api';

const DEBOUNCE_MS = 250;
const PAGE_LIMIT = 6;

// Result groups returned by GET /search, in the order the server sends them.
const GROUPS = {
  unit: { label: 'Units', icon: Building2 },
  person: { label: 'People', icon: Users },
  vehicle: { label: 'Vehicles', icon: Car },
  complaint: { label: 'Helpdesk tickets', icon: Wrench },
  bill: { label: 'Bills', icon: Receipt },
  visitor: { label: 'Visitors', icon: DoorOpen },
  parcel: { label: 'Parcels', icon: Package },
};

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

const FOCUSABLE = 'input, button, [href], [tabindex]:not([tabindex="-1"])';

// The Ctrl/Cmd+K palette: "go to page" from the role's navigation (no API call) plus records from /search.
export function CommandPalette({ onClose }) {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const features = useFeatures();
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const ids = useId();
  const inputId = `${ids}-input`;
  const listId = `${ids}-list`;
  const optionId = (i) => `${ids}-opt-${i}`;

  const query = text.trim();
  const debounced = useDebounced(query, DEBOUNCE_MS);
  const canSearch = Boolean(user?.society);
  const search = useGlobalSearch(debounced, { enabled: canSearch });

  const pages = useMemo(() => {
    const items = navFor(user.role, user.society && features.data ? features.isEnabled : null, permissionChecker(user));
    const seen = new Set();
    const unique = items.filter((i) => (seen.has(i.to) ? false : seen.add(i.to)));
    const needle = query.toLowerCase();
    const hits = needle ? unique.filter((i) => t(i.label).toLowerCase().includes(needle) || i.label.toLowerCase().includes(needle)) : unique;
    return hits.slice(0, PAGE_LIMIT);
  }, [user.role, user.society, features.data, features.isEnabled, query, t]);

  const sections = useMemo(() => {
    const out = [];
    if (pages.length) {
      out.push({
        type: 'page',
        label: 'Pages',
        items: pages.map((p) => ({ key: `page:${p.to}`, title: t(p.label), subtitle: p.section ? t(p.section) : '', link: p.to, icon: p.icon })),
      });
    }
    // placeholder data may still belong to an earlier query; only show records for a searchable query
    const groups = canSearch && debounced.length >= 2 ? search.data?.groups || [] : [];
    for (const g of groups) {
      const meta = GROUPS[g.type] || { label: g.type, icon: Search };
      out.push({ type: g.type, label: meta.label, items: g.items.map((i) => ({ key: `${i.type}:${i.id}`, title: i.title, subtitle: i.subtitle, link: i.link, icon: meta.icon })) });
    }
    return out;
  }, [pages, canSearch, debounced, search.data, t]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const waiting = canSearch && query.length >= 2 && (query !== debounced || search.isFetching);

  useEffect(() => setActive(0), [query, search.data]);
  useEffect(() => {
    if (active >= flat.length && flat.length) setActive(flat.length - 1);
  }, [active, flat.length]);
  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // focus the input, lock page scroll, give focus back to whatever opened the palette
  useEffect(() => {
    const opener = document.activeElement;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, []);

  const go = useCallback(
    (item) => {
      if (!item) return;
      onClose();
      navigate(item.link);
    },
    [navigate, onClose],
  );

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter' && e.target === inputRef.current) {
      e.preventDefault();
      go(flat[active]);
    } else if (e.key === 'Tab') {
      // keep keyboard focus inside the dialog
      const nodes = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  let index = -1;
  const showEmpty = !flat.length && !waiting && query.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:p-4 sm:pt-[12vh]">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        onKeyDown={onKeyDown}
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-2xl"
      >
        <h2 id={`${ids}-title`} className="sr-only">{t('Search')}</h2>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Search className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
          <label htmlFor={inputId} className="sr-only">{t('Search pages and records')}</label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={flat[active] ? optionId(active) : undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={60}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('Search pages, people, units…')}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {waiting && <Spinner className="size-4" />}
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={t('Close')}>
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <ul id={listId} role="listbox" aria-label={t('Results')}>
            {sections.map((section) => (
              <li key={section.type} role="presentation">
                <div id={`${ids}-${section.type}`} className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t(section.label)}
                </div>
                <ul role="group" aria-labelledby={`${ids}-${section.type}`}>
                  {section.items.map((it) => {
                    index += 1;
                    const i = index;
                    const Icon = it.icon || Search;
                    const selected = i === active;
                    return (
                      <li
                        key={it.key}
                        id={optionId(i)}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => !selected && setActive(i)}
                        onClick={() => go(it)}
                        className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2', selected ? 'bg-brand-50 text-brand-700' : 'text-slate-700')}
                      >
                        <Icon className={cn('size-4.5 shrink-0', selected ? 'text-brand-600' : 'text-slate-400')} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.title}</p>
                          {it.subtitle && <p className="truncate text-xs text-slate-500">{it.subtitle}</p>}
                        </div>
                        {selected && <CornerDownLeft className="size-4 shrink-0 text-brand-500" aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {showEmpty && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {query.length < 2 ? t('Type at least 2 characters to search records') : t('No results for “{q}”', { q: query })}
            </p>
          )}
          {search.isError && debounced.length >= 2 && <p className="px-3 py-2 text-sm text-red-600">{t('Search failed. Try again.')}</p>}
        </div>

        <p className="sr-only" aria-live="polite">
          {waiting ? '' : t('{n} results', { n: flat.length })}
        </p>
        <div className="hidden items-center gap-4 border-t border-slate-100 px-4 py-2 text-xs text-slate-400 sm:flex">
          <span><kbd className="font-sans">↑↓</kbd> {t('to move')}</span>
          <span><kbd className="font-sans">Enter</kbd> {t('to open')}</span>
          <span><kbd className="font-sans">Esc</kbd> {t('to close')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Top-bar button that owns the palette and the global Ctrl/Cmd+K shortcut.
export function SearchButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('Search')}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        className="flex items-center gap-2 rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:w-full sm:max-w-xs sm:border sm:border-slate-200 sm:px-3 sm:py-1.5"
      >
        <Search className="size-5 shrink-0 sm:size-4" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:inline">{t('Search…')}</span>
        <kbd className="hidden rounded border border-slate-200 px-1.5 font-sans text-[11px] text-slate-400 md:inline">{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      {open && <CommandPalette onClose={close} />}
    </>
  );
}
