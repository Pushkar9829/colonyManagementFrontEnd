import { describe, expect, it } from 'vitest';
import { dayBounds, label, money, periodLabel, toPaise, toRupees } from './format';
import { hasRole, isFinance, isManager } from './roles';
import { navFor } from '../app/navigation';

describe('format', () => {
  it('formats paise as Indian rupees', () => {
    expect(money(370000)).toBe('₹3,700');
    expect(money(14480000)).toBe('₹1,44,800'); // lakh grouping
    expect(money(370050)).toBe('₹3,700.50');
    expect(money(undefined)).toBe('₹0');
  });

  it('converts rupees and paise without float drift', () => {
    expect(toPaise('19.99')).toBe(1999);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toRupees(1999)).toBe(19.99);
  });

  it('humanises enum values', () => {
    expect(label('in_progress')).toBe('In Progress');
    expect(label('amc')).toBe('AMC');
    expect(label('')).toBe('');
  });

  it('builds local day bounds 24h apart', () => {
    const { from, to } = dayBounds('2026-10-11');
    expect(new Date(to) - new Date(from)).toBe(86400000);
  });

  it('labels billing periods', () => {
    expect(periodLabel('2026-10')).toMatch(/October 2026/);
  });
});

describe('roles', () => {
  const user = (role) => ({ role, society: { _id: 's' } });

  it('admin passes every role check, others only their own', () => {
    expect(hasRole(user('admin'), 'guard')).toBe(true);
    expect(hasRole(user('resident'), 'guard')).toBe(false);
    expect(hasRole(user('guard'), 'guard')).toBe(true);
    expect(hasRole(null, 'guard')).toBe(false);
    expect(isManager(user('facility_manager'))).toBe(true);
    expect(isFinance(user('resident'))).toBe(false);
  });

  it('navigation shows each role only what it may use', () => {
    const paths = (role) => navFor(role).map((i) => i.to);
    expect(paths('resident')).toContain('/billing');
    expect(paths('resident')).not.toContain('/units');
    expect(paths('guard')).toContain('/gate');
    expect(paths('guard')).not.toContain('/billing');
    expect(paths('admin')).toEqual(expect.arrayContaining(['/units', '/members', '/settings', '/audit']));
    // the platform owner only ever sees platform pages
    expect(paths('super_admin')).toEqual(expect.arrayContaining(['/', '/platform/societies']));
    expect(paths('super_admin').every((p) => p === '/' || p.startsWith('/platform'))).toBe(true);
    expect(paths('resident').some((p) => p.startsWith('/platform'))).toBe(false);
  });
});

describe('translations', () => {
  it('every sidebar label and section has Hindi and Marathi text', async () => {
    const { DICTIONARIES } = await import('./i18n');
    const { NAV_ITEMS, SECTIONS, ROLE_SECTIONS } = await import('../app/navigation');
    const roleLabels = NAV_ITEMS.flatMap((i) => Object.values(i.labels || {}));
    const keys = [...new Set([...NAV_ITEMS.map((i) => i.label), ...roleLabels, ...SECTIONS, ...ROLE_SECTIONS])];
    for (const lang of ['hi', 'mr']) {
      const missing = keys.filter((k) => !DICTIONARIES[lang][k]);
      expect(missing, `${lang} missing`).toEqual([]);
    }
  });
});
