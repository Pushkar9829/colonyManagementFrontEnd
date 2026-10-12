import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

// tabs: [{ value, label, count? }]
// On narrow screens the strip scrolls sideways: the selected tab is kept in view and a fade at the edge
// shows that more tabs follow.
export function Tabs({ tabs, value, onChange, className }) {
  const ref = useRef(null);
  const [more, setMore] = useState({ left: false, right: false });
  const measure = () => {
    const el = ref.current;
    if (el) setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector('[aria-selected="true"]');
    if (active && el.scrollWidth > el.clientWidth) active.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    measure();
  }, [value, tabs.length]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const mask = more.left && more.right ? 'linear-gradient(to right, transparent, black 24px, black calc(100% - 32px), transparent)' : more.right ? 'linear-gradient(to right, black calc(100% - 32px), transparent)' : more.left ? 'linear-gradient(to right, transparent, black 24px)' : undefined;
  return (
    <div ref={ref} onScroll={measure} style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined} className={cn('flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 [scrollbar-width:none]', className)} role="tablist">
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
