import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/cn';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA');

// First visible day (a Monday) and the 6x7 grid of dates for the month containing `month`.
export function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

// Month calendar. Multi-day events show on each day they cover.
export function CalendarGrid({ month, onMonth, events = [], selected, onSelect }) {
  const days = monthGrid(month);
  const byDay = new Map();
  for (const e of events) {
    const d = new Date(e.startAt);
    d.setHours(0, 0, 0, 0);
    const end = new Date(e.endAt);
    for (let i = 0; d <= end && i < 31; i += 1) {
      const k = dayKey(d);
      byDay.set(k, [...(byDay.get(k) || []), e]);
      d.setDate(d.getDate() + 1);
    }
  }
  const today = dayKey(new Date());
  const shift = (n) => onMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={() => shift(-1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="size-5" /></button>
        <p className="font-semibold text-slate-900">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => shift(1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Next month"><ChevronRight className="size-5" /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((d) => <div key={d} className="py-2"><span className="sm:hidden">{d[0]}</span><span className="hidden sm:inline">{d}</span></div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const k = dayKey(d);
          const list = byDay.get(k) || [];
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button key={k} type="button" onClick={() => onSelect(k)}
              className={cn('flex min-h-14 flex-col items-stretch border-b border-r border-slate-100 p-1 text-left sm:min-h-24 sm:p-1.5', !inMonth && 'bg-slate-50/60', selected === k && 'bg-brand-50 ring-1 ring-inset ring-brand-300')}>
              <span className={cn('mb-0.5 inline-flex size-6 items-center justify-center self-start rounded-full text-xs', k === today ? 'bg-brand-600 font-semibold text-white' : inMonth ? 'text-slate-700' : 'text-slate-300')}>{d.getDate()}</span>
              {/* phones: dots; larger screens: titles */}
              <span className="flex flex-wrap gap-0.5 sm:hidden">{list.slice(0, 3).map((e) => <span key={e._id} className={cn('size-1.5 rounded-full', e.status === 'cancelled' ? 'bg-slate-300' : 'bg-brand-500')} />)}</span>
              <span className="hidden space-y-0.5 sm:block">
                {list.slice(0, 2).map((e) => (
                  <span key={e._id} className={cn('block truncate rounded px-1 py-0.5 text-[11px]', e.status === 'cancelled' ? 'bg-slate-100 text-slate-400 line-through' : 'bg-brand-100 text-brand-800')}>{e.title}</span>
                ))}
                {list.length > 2 && <span className="block px-1 text-[10px] text-slate-400">+{list.length - 2} more</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { dayKey };
