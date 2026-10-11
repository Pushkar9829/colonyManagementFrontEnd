import { describe, expect, test } from 'vitest';
import { fyEndDate, fyLabel, fyOf, fyStartDate, rangePresets, sourceLabel } from './lib';

describe('accounting helpers', () => {
  test('financial year runs April to March', () => {
    expect(fyOf('2026-04-01')).toBe(2026);
    expect(fyOf('2027-03-31')).toBe(2026);
    expect(fyOf('2026-03-31')).toBe(2025);
    expect(fyLabel(2026)).toBe('FY 2026-27');
    expect(fyLabel(2099)).toBe('FY 2099-00');
    expect(fyStartDate(2026)).toBe('2026-04-01');
    expect(fyEndDate(2026)).toBe('2027-03-31');
  });

  test('range presets are well formed', () => {
    for (const p of rangePresets()) {
      expect(p.from <= p.to).toBe(true);
      expect(p.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const last = rangePresets().find((p) => p.key === 'last-month');
    expect(last.from.slice(8)).toBe('01');
  });

  test('labels journal sources', () => {
    expect(sourceLabel({})).toBe('Manual');
    expect(sourceLabel({ sourceType: 'vendor_bill' })).toBe('Vendor bill');
    expect(sourceLabel({ sourceType: 'something_new' })).toBe('something_new');
  });
});
