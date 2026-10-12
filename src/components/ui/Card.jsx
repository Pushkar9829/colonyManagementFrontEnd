import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4', className)}>
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
  sky: 'bg-sky-50 text-sky-600',
};

export function StatCard({ label, value, sub, icon: Icon, tone = 'brand', to }) {
  const body = (
    <Card className={cn('flex h-full items-center gap-4 p-3 sm:p-4', to && 'transition hover:border-brand-200 hover:shadow')}>
      {Icon && (
        // two cards share a phone row, so the icon makes way for the number there
        <div className={cn('hidden size-11 shrink-0 items-center justify-center rounded-lg sm:flex', tones[tone])}>
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-lg font-semibold text-slate-900 sm:text-xl">{value}</p>
        {sub && <p className="line-clamp-2 text-xs text-slate-500">{sub}</p>}
      </div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
