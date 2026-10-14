// Small display helpers for lucky draws.

export const PHASE = {
  draft: ['slate', 'Draft'],
  upcoming: ['blue', 'Opens soon'],
  open: ['green', 'Open'],
  closed: ['amber', 'Entries closed'],
  drawn: ['brand', 'Results out'],
  cancelled: ['red', 'Cancelled'],
};

// "3 days 4 hours", "5 hours 10 min", "8 min", "less than a minute"
export function duration(ms) {
  if (ms <= 0) return 'now';
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const p = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (d) return h ? `${p(d, 'day')} ${p(h, 'hour')}` : p(d, 'day');
  if (h) return m ? `${p(h, 'hour')} ${m} min` : p(h, 'hour');
  if (m) return `${m} min`;
  return 'less than a minute';
}

// One line telling members where the draw stands, e.g. "Closes in 2 days 3 hours".
export function timingText(d, now = Date.now()) {
  const left = (t) => duration(new Date(t).getTime() - now);
  switch (d.phase) {
    case 'upcoming':
      return `Entries open in ${left(d.entryOpensAt)}`;
    case 'open':
      return `Closes in ${left(d.entryClosesAt)}`;
    case 'closed':
      return new Date(d.drawAt).getTime() > now ? `Draw in ${left(d.drawAt)}` : 'Draw happening shortly';
    case 'drawn':
      return 'Results are out';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Not published yet';
  }
}

export const eligibilityText = (d) => {
  const who = { all_residents: 'All residents of the society', owners: 'Flat owners only', tenants: 'Tenants only' }[d.eligibility?.audience] || 'All residents';
  const parts = [who, d.eligibility?.perFlat ? 'one entry per flat' : 'each member can enter on their own'];
  if (d.eligibility?.excludeCommittee) parts.push('committee office-bearers cannot take part');
  return `${parts.join(' · ')}. Entry is free.`;
};

export const prizeSummary = (prizes = []) => prizes.map((p) => `${p.quantity > 1 ? `${p.quantity}× ` : ''}${p.title}`).join(', ');

// datetime-local value (local time, minutes) <-> ISO
export const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : undefined);
