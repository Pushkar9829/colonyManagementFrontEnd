// Small display helpers for lucky draws.
// The text helpers take an optional `t` (from useT) so components can show them translated; without it they return English.
const en = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? `{${k}}`)) : s);

export const PHASE = {
  draft: ['slate', 'Draft'],
  upcoming: ['blue', 'Opens soon'],
  open: ['green', 'Open'],
  closed: ['amber', 'Entries closed'],
  drawn: ['brand', 'Results out'],
  cancelled: ['red', 'Cancelled'],
};

// "3 days 4 hours", "5 hours 10 min", "8 min", "less than a minute"
export function duration(ms, t = en) {
  if (ms <= 0) return t('now');
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const p = (n, w) => t(n === 1 ? `{n} ${w}` : `{n} ${w}s`, { n });
  if (d) return h ? `${p(d, 'day')} ${p(h, 'hour')}` : p(d, 'day');
  if (h) return m ? `${p(h, 'hour')} ${t('{n} min', { n: m })}` : p(h, 'hour');
  if (m) return t('{n} min', { n: m });
  return t('less than a minute');
}

// One line telling members where the draw stands, e.g. "Closes in 2 days 3 hours".
export function timingText(d, now = Date.now(), t = en) {
  const left = (at) => duration(new Date(at).getTime() - now, t);
  switch (d.phase) {
    case 'upcoming':
      return t('Entries open in {time}', { time: left(d.entryOpensAt) });
    case 'open':
      return t('Closes in {time}', { time: left(d.entryClosesAt) });
    case 'closed':
      return new Date(d.drawAt).getTime() > now ? t('Draw in {time}', { time: left(d.drawAt) }) : t('Draw happening shortly');
    case 'drawn':
      return t('Results are out');
    case 'cancelled':
      return t('Cancelled');
    default:
      return t('Not published yet');
  }
}

export const eligibilityText = (d, t = en) => {
  const who = { all_residents: 'All residents of the society', owners: 'Flat owners only', tenants: 'Tenants only' }[d.eligibility?.audience] || 'All residents';
  const parts = [t(who), t(d.eligibility?.perFlat ? 'one entry per flat' : 'each member can enter on their own')];
  if (d.eligibility?.excludeCommittee) parts.push(t('committee office-bearers cannot take part'));
  return t('{rules}. Entry is free.', { rules: parts.join(' · ') });
};

export const prizeSummary = (prizes = []) => prizes.map((p) => `${p.quantity > 1 ? `${p.quantity}× ` : ''}${p.title}`).join(', ');

// datetime-local value (local time, minutes) <-> ISO
export const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : undefined);
