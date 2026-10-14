import { describe, expect, it } from 'vitest';
import { can, canAny, isPlatformMember, permissionChecker } from '../../lib/platformPermissions';
import { NAV_ITEMS, navFor } from '../../app/navigation';
import { actionLabel, describeDetails } from './activityLabels';

const billing = { role: 'super_admin', platformPermissions: ['societies.view', 'plans.view', 'plans.manage', 'invoices.view', 'invoices.manage', 'billing.run'] };
const viewer = { role: 'super_admin', platformPermissions: ['societies.view', 'plans.view', 'invoices.view', 'support.view', 'audit.view', 'jobs.view'] };
const resident = { role: 'resident', platformPermissions: null };

describe('platform permissions', () => {
  it('can() is true only for permissions the member holds', () => {
    expect(can(billing, 'billing.run')).toBe(true);
    expect(can(billing, 'societies.suspend')).toBe(false);
    expect(can(viewer, 'team.manage')).toBe(false);
    expect(can(resident, 'societies.view')).toBe(false);
    expect(can(null, 'societies.view')).toBe(false);
    expect(canAny(billing, 'support.view', 'invoices.view')).toBe(true);
    expect(isPlatformMember(viewer)).toBe(true);
    expect(isPlatformMember(resident)).toBe(false);
    expect(isPlatformMember({ platformPermissions: [] })).toBe(true);
  });

  it('nav items are filtered by permission for platform members', () => {
    const paths = (u) => navFor('super_admin', null, permissionChecker(u)).map((i) => i.to);
    expect(paths(billing)).toEqual(expect.arrayContaining(['/', '/platform/societies', '/platform/plans', '/platform/invoices']));
    expect(paths(billing)).not.toContain('/platform/support');
    expect(paths(billing)).not.toContain('/platform/team');
    expect(paths(billing)).not.toContain('/platform/activity');
    expect(paths(viewer)).toEqual(expect.arrayContaining(['/platform/support', '/platform/activity']));
    expect(paths(viewer)).not.toContain('/platform/roles');
    // With every permission, every platform item shows (same as passing no checker).
    const all = NAV_ITEMS.filter((i) => i.roles.includes('super_admin')).map((i) => i.to);
    expect(navFor('super_admin', null, () => true).map((i) => i.to)).toEqual(all);
    expect(navFor('super_admin').map((i) => i.to)).toEqual(all);
  });

  it('every platform page in the menu names its permission, except the overview', () => {
    const items = NAV_ITEMS.filter((i) => i.roles.includes('super_admin') && i.to.startsWith('/platform/') && i.to !== '/platform/lucky-draws');
    expect(items.filter((i) => !i.permission).map((i) => i.to)).toEqual([]);
  });

  it('activity rows read as plain English', () => {
    expect(actionLabel('society.suspended')).toBe('Suspended a society');
    expect(actionLabel('something.new_thing')).toBe('Something new thing');
    expect(describeDetails({ action: 'team.member_role_changed', details: { name: 'Asha', from: 'Viewer', to: 'Billing' } })).toBe('Asha: Viewer → Billing');
    expect(describeDetails({ action: 'billing.run', details: { created: 2, reminded: 1, suspended: 0 } })).toBe('2 invoice(s) · 1 reminder(s) · 0 suspended');
  });
});
