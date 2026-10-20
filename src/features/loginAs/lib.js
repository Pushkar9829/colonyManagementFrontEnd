import { minutesLeft } from './session';

export const DURATIONS = [15, 30, 60, 120].map((m) => ({ value: String(m), label: m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? 's' : ''}` }));
export const LEVEL_LABELS = { platform: 'ColonyHub platform team', admin: 'Society admin', subadmin: 'Accountant / facility manager' };

// Society members: may the signed-in person log in as someone with `role`? (`rules` from GET /login-as/rules;
// the server checks again.)
export const canLoginAsRole = (rules, role) => Boolean(rules?.allowed && rules.canTarget?.includes(role));

// Text for the amber "viewing as" bar.
export function actingSummary(user, now = Date.now()) {
  if (!user?.actingAs) return null;
  const unit = user.unit?.label || user.memberships?.[0]?.unit?.label;
  return { who: unit ? `${user.name} (${unit})` : user.name, minutes: minutesLeft(user.actingAs.expiresAt, now), by: user.actingAs.byName };
}

export const durationText = (seconds) => {
  const m = Math.round((seconds || 0) / 60);
  return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
