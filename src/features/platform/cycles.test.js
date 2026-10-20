import { describe, expect, it } from 'vitest';
import { cycleExamples } from './lib';

describe('cycle examples', () => {
  it('apply each cycle’s discount and GST, and list one-time only when priced', () => {
    const rows = cycleExamples(10, { perUnitMonthly: 1000, flatMonthly: 50000, quarterlyDiscountPercent: 5, yearlyDiscountPercent: 10 });
    expect(rows.map((r) => r.cycle)).toEqual(['monthly', 'quarterly', 'yearly']);
    expect(rows[0].total).toBe(70800);
    expect(rows[1].total).toBe(171000 + 30780);
    const life = cycleExamples(10, { perUnitMonthly: 0, oneTimePrice: 100000 });
    expect(life.at(-1)).toMatchObject({ cycle: 'one_time', total: 118000, note: 'lifetime' });
  });
});
