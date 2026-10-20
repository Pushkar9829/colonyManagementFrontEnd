// Pure helpers for ad delivery on the client. The server already filters pop-ups by "once" / "daily"; the client
// adds "at most once per visit" (a visit = this browser tab session) so moving between pages never re-opens one.

export const PLACEMENTS = [
  { value: 'banner', label: 'Top banner' },
  { value: 'popup', label: 'Pop-up' },
  { value: 'both', label: 'Banner and pop-up' },
];
export const FREQUENCIES = [
  { value: 'once', label: 'Once per person' },
  { value: 'daily', label: 'Once a day' },
  { value: 'every_visit', label: 'Every visit' },
];
export const AD_ROLES = ['admin', 'accountant', 'facility_manager', 'guard', 'resident', 'staff'];

// Only https links ever open from an ad (the server enforces this too).
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

// The first banner not closed in this visit.
export const bannerToShow = (banners = [], hidden = new Set()) => banners.find((b) => !hidden.has(String(b._id))) || null;

// seen: { [adId]: 'YYYY-MM-DD' } remembered on this device; shownThisVisit: Set of ad ids.
export function popupDue(ad, { seen = {}, shownThisVisit = new Set() } = {}, today = localDay()) {
  if (!ad) return false;
  const id = String(ad._id);
  if (shownThisVisit.has(id)) return false;
  if (ad.frequency === 'once') return !seen[id];
  if (ad.frequency === 'daily') return seen[id] !== today;
  return true; // every_visit
}

export const localDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export const prefersReducedMotion = () => {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
};

export const statusTone = { live: 'green', scheduled: 'blue', ended: 'slate', paused: 'amber' };

// datetime-local <-> ISO
export const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : undefined);

// Small per-device / per-tab stores, safe when storage is blocked.
const read = (store, key, fallback) => {
  try {
    return JSON.parse(store.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (store, key, value) => {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: frequency falls back to the server's rule */
  }
};
const SEEN_KEY = 'cms.adsSeen';
const VISIT_KEY = 'cms.adsVisit';
export const adStore = {
  seen: () => read(globalThis.localStorage, SEEN_KEY, {}),
  markSeen: (id, day = localDay()) => write(globalThis.localStorage, SEEN_KEY, { ...adStore.seen(), [String(id)]: day }),
  visit: () => new Set(read(globalThis.sessionStorage, VISIT_KEY, [])),
  markVisit: (key) => write(globalThis.sessionStorage, VISIT_KEY, [...adStore.visit(), String(key)]),
};
