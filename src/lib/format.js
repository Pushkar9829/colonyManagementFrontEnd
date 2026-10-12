// API money is integer paise; UI shows rupees. Whole rupees drop the ".00" (₹4,000), paise show (₹4,000.50).
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const money = (paise = 0) => {
  const p = Math.round(paise || 0);
  return p % 100 === 0 ? inrWhole.format(p / 100) : inr.format(p / 100);
};
export const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
export const toRupees = (paise) => (paise || 0) / 100;

export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const time = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Short forms people know in capitals (AMC, GST, NOC…) stay that way.
const ACRONYMS = new Set(['amc', 'gst', 'tds', 'noc', 'dg', 'stp', 'wtp', 'ev', 'upi', 'neft', 'rtgs', 'imps', 'otp', 'sos', 'kyc', 'pan', 'ppm', 'cctv', 'hr', 'pf', 'esi', 'id', 'qr', 'rfid', 'anpr', 'ac']);
export const label = (v) =>
  v
    ? String(v)
        .replace(/_/g, ' ')
        .replace(/\b\w+/g, (w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    : '';

// "Fri, 12 Oct 2026" for a yyyy-mm-dd value (browsers show date boxes in their own order, e.g. mm/dd/yyyy).
export const longDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// Local calendar helpers
export const todayISO = () => new Date().toLocaleDateString('en-CA');
export const currentPeriod = () => todayISO().slice(0, 7);
export const dayBounds = (isoDate) => {
  const from = new Date(`${isoDate}T00:00:00`);
  return { from: from.toISOString(), to: new Date(from.getTime() + 86400000).toISOString() };
};
export const periodLabel = (p) => (p ? new Date(`${p}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '');
