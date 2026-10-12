import { describe, expect, it } from 'vitest';
import { estimatedMrr, plural, trialsEndingWithin } from './lib';

describe('platform helpers', () => {
  it('pluralises counts', () => {
    expect(plural(1, 'invoice')).toBe('1 invoice');
    expect(plural(2, 'invoice')).toBe('2 invoices');
    expect(plural(0, 'society', 'societies')).toBe('0 societies');
  });
  it('finds trials ending soon', () => {
    const now = Date.parse('2026-10-12T00:00:00Z');
    const day = 86400000;
    const list = [
      { name: 'A', plan: { name: 'trial', validUntil: new Date(now + 3 * day).toISOString() } },
      { name: 'B', plan: { name: 'trial', validUntil: new Date(now + 10 * day).toISOString() } },
      { name: 'C', plan: { name: 'basic', validUntil: new Date(now + 1 * day).toISOString() } },
      { name: 'D', plan: { name: 'trial', validUntil: new Date(now - day).toISOString() } },
    ];
    expect(trialsEndingWithin(list, 7, now).map((s) => s.name)).toEqual(['A']);
  });
  it('estimates MRR from plan prices', () => {
    const plans = [{ plan: 'basic', perUnitMonthly: 1000, flatMonthly: 50000 }];
    const societies = [{ plan: { name: 'basic' }, units: 100, active: true }, { plan: { name: 'free' }, units: 40, active: true }];
    expect(estimatedMrr(societies, plans)).toBe(150000);
  });
});
