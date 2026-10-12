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
