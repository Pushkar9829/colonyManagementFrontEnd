import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/cn';
import { usePhone } from '../../hooks/useMediaQuery';
import { useT } from '../../context/LanguageContext';

// Filters for a list. Desktop: the fields in a responsive row. Phone: a search field (if given) stays
// visible and the other filters fold behind a "Filters (n)" button, so the list starts on the first screen.
//   <FilterBar search={<Input … />} active={2}>{other fields}</FilterBar>
// `active` = how many filters are set (shown on the button); `cols` = desktop columns (default 4).
export function FilterBar({ search, active = 0, cols = 4, className, children }) {
  const phone = usePhone();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-3 lg:grid-cols-5' }[cols] || 'sm:grid-cols-4';
  if (!phone) {
    return (
      <div className={cn('grid gap-3 border-b border-slate-100 p-4', grid, className)}>
        {search}
        {children}
      </div>
    );
  }
  return (
    <div className={cn('space-y-3 border-b border-slate-100 p-4', className)}>
      <div className="flex gap-2">
        {search && <div className="min-w-0 flex-1">{search}</div>}
        {children && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium', active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700', !search && 'w-full justify-center')}
          >
            <SlidersHorizontal className="size-4" />
            {t('Filters')}
            {active > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{active}</span>}
          </button>
        )}
      </div>
      {open && <div className="grid gap-3">{children}</div>}
    </div>
  );
}
