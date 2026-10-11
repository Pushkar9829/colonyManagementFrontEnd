import { cn } from '../../lib/cn';

// tabs: [{ value, label, count? }]
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {t.label}
          {t.count > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
