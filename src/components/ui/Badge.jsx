import { cn } from '../../lib/cn';
import { label } from '../../lib/format';
import { useT } from '../../context/LanguageContext';

const tones = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
};

export function Badge({ tone = 'slate', className, children }) {
  return <span className={cn('inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-500/10', tones[tone], className)}>{children}</span>;
}

// One colour map for every status string the API returns.
const STATUS_TONES = {
  active: 'green',
  approved: 'green',
  confirmed: 'green',
  paid: 'green',
  resolved: 'green',
  closed: 'slate',
  checked_in: 'blue',
  checked_out: 'slate',
  pending: 'amber',
  partial: 'amber',
  assigned: 'blue',
  in_progress: 'blue',
  on_hold: 'amber',
  open: 'amber',
  reopened: 'red',
  unpaid: 'red',
  denied: 'red',
  rejected: 'red',
  cancelled: 'slate',
  inactive: 'slate',
  expired: 'slate',
  used: 'slate',
  acknowledged: 'blue',
  urgent: 'red',
  high: 'amber',
  medium: 'blue',
  low: 'slate',
};

export function StatusBadge({ status, className }) {
  const { t } = useT();
  return (
    <Badge tone={STATUS_TONES[status] || 'slate'} className={className}>
      {t(label(status))}
    </Badge>
  );
}
