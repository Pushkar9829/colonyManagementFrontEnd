import { Badge } from '../../../components/ui';
import { label, time } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';

// Round statuses that StatusBadge does not colour the way patrol supervisors expect.
const ROUND_TONES = { completed: 'green', partial: 'amber', missed: 'red', in_progress: 'blue', pending: 'slate', idle: 'slate' };
const ROUND_LABELS = { idle: 'No round now', pending: 'Not started' };

export function RoundStatus({ status, className }) {
  const { t } = useT();
  return (
    <Badge tone={ROUND_TONES[status] || 'slate'} className={className}>
      {t(ROUND_LABELS[status] || label(status))}
    </Badge>
  );
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// t: optional translator from useT() (day names and "Every day" in the chosen language).
export const daysLabel = (days, t = (s) => s) => (days?.length && days.length < 7 ? [...days].sort().map((d) => t(DAYS[d])).join(', ') : t('Every day'));

// End time at or before the start time means the patrol window runs past midnight.
export const isOvernight = (r) => r.endTime <= r.startTime;

export const windowLabel = (slot) => (slot ? `${time(slot.dueAt)} – ${time(slot.windowEnd)}` : '');

// Shift a local YYYY-MM-DD by n days.
export function shiftISO(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

// Inclusive local date range -> API {from, to} instants.
export function rangeQuery(fromISO, toISO) {
  return {
    from: fromISO ? new Date(`${fromISO}T00:00:00`).toISOString() : undefined,
    to: toISO ? new Date(`${shiftISO(toISO, 1)}T00:00:00`).toISOString() : undefined,
  };
}

export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
