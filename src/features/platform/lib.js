// "1 invoice", "3 invoices", "1 society", "2 societies".
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Trial societies whose trial (plan.validUntil) ends within `days` from now, soonest first.
export function trialsEndingWithin(societies = [], days = 7, now = Date.now()) {
  const limit = now + days * 86400000;
  return societies
    .filter((s) => s.plan?.name === 'trial' && s.plan.validUntil)
    .filter((s) => {
      const t = new Date(s.plan.validUntil).getTime();
      return t >= now && t <= limit;
    })
    .sort((a, b) => new Date(a.plan.validUntil) - new Date(b.plan.validUntil));
}

// Monthly recurring revenue estimated from the price list: units × per-unit rate + flat fee, per active
// society on a paid plan (paise, before GST, ignoring yearly discounts). The API has no MRR figure yet.
export function estimatedMrr(societies = [], plans = []) {
  const price = Object.fromEntries(plans.map((p) => [p.plan, p]));
  return societies.reduce((sum, s) => {
    const p = price[s.plan?.name];
    if (!p || s.active === false) return sum;
    return sum + (s.units || 0) * (p.perUnitMonthly || 0) + (p.flatMonthly || 0);
  }, 0);
}

// What one invoice would be on each billing cycle (paise incl. 18% GST), mirroring the API's computeCharge:
// recurring cycles = (units × per-unit + flat) × months − the cycle's discount; one-time = the fixed price.
export const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time licence' },
];
const MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const withGst = (subtotal) => subtotal + Math.round((subtotal * 18) / 100);
export function cycleExamples(units, p) {
  const monthly = units * (p.perUnitMonthly || 0) + (p.flatMonthly || 0);
  const rows = ['monthly', 'quarterly', 'yearly'].map((cycle) => {
    const gross = monthly * MONTHS[cycle];
    const pct = cycle === 'quarterly' ? p.quarterlyDiscountPercent || 0 : cycle === 'yearly' ? p.yearlyDiscountPercent || 0 : 0;
    return { cycle, label: CYCLE_OPTIONS.find((c) => c.value === cycle).label, total: withGst(gross - Math.round((gross * pct) / 100)), note: pct ? `${pct}% off` : '' };
  });
  if (p.oneTimePrice > 0) rows.push({ cycle: 'one_time', label: 'One-time licence', total: withGst(p.oneTimePrice), note: p.oneTimeValidityMonths ? `${p.oneTimeValidityMonths} months` : 'lifetime' });
  return rows;
}
