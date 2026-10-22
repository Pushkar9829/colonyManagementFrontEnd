import { label } from '../../lib/format';
import { fillVars } from './lib';

// Plain-English names for platform activity log actions (backend: modules/platformTeam/platformAudit.js).
export const ACTION_LABELS = {
  'society.updated': 'Edited a society',
  'society.suspended': 'Suspended a society',
  'society.reactivated': 'Reactivated a society',
  'society.features_changed': 'Switched modules for a society',
  'subscription.updated': 'Changed billing settings',
  'plan.price_updated': 'Changed plan pricing',
  'invoice.marked_paid': 'Marked an invoice paid',
  'invoice.voided': 'Voided an invoice',
  'billing.run': 'Ran billing',
  'support.replied': 'Replied to a ticket',
  'support.status_changed': 'Changed a ticket’s status',
  'support.assigned': 'Assigned a ticket',
  'support.session_started': 'Opened a support session',
  'privacy.deletion_approved': 'Approved an account deletion',
  'privacy.deletion_rejected': 'Declined an account deletion',
  'team.member_invited': 'Invited a team member',
  'team.member_role_changed': 'Changed a member’s role',
  'team.member_deactivated': 'Switched off a member',
  'team.member_reactivated': 'Reactivated a member',
  'team.member_removed': 'Removed a member',
  'role.created': 'Created a role',
  'role.updated': 'Edited a role',
  'role.deleted': 'Deleted a role',
  'luckydraw.cancelled': 'Cancelled a lucky draw',
  'whatsapp.settings_changed': 'Changed a society’s WhatsApp mode',
  'whatsapp.credits_added': 'Added WhatsApp credits',
  'template.enabled': 'Switched an app template on',
  'template.disabled': 'Switched an app template off',
  'template.default_set': 'Changed the default app template',
  'template.plan_rule_changed': 'Changed a plan’s app templates',
  'society.appearance_changed': 'Changed a society’s app template settings',
  'society.template_forced': 'Forced an app template on a society',
  'reseller.templates_changed': 'Changed a reseller’s app templates',
};

// Filter options: whole areas first, then each action.
export const ACTION_AREAS = [
  { value: 'society', label: 'Societies' },
  { value: 'plan', label: 'Plans' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'billing', label: 'Billing runs' },
  { value: 'subscription', label: 'Billing settings' },
  { value: 'support', label: 'Support' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'team', label: 'Team' },
  { value: 'role', label: 'Roles' },
  { value: 'luckydraw', label: 'Lucky draws' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'template', label: 'App templates' },
];

const words = (s) => s.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
// `t` (optional) translates the English names; without it they stay English.
export const actionLabel = (action, t = fillVars) => (ACTION_LABELS[action] ? t(ACTION_LABELS[action]) : words(action || ''));

const money = (paise) => `₹${(Number(paise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// One short line about what changed, from the row's details.
export function describeDetails(row, t = fillVars) {
  const d = row.details || {};
  switch (row.action) {
    case 'society.suspended':
      return d.suspendedReason ? t('Reason: {reason}', { reason: d.suspendedReason }) : '';
    case 'society.updated': {
      const parts = [];
      if (d.plan?.name) parts.push(t('Plan {name}', { name: d.plan.name }));
      if (d.plan?.unitLimit !== undefined) parts.push(t('unit limit {limit}', { limit: d.plan.unitLimit ?? t('default') }));
      if (d.plan?.validUntil) parts.push(t('until {date}', { date: String(d.plan.validUntil).slice(0, 10) }));
      if (d.platformNotes !== undefined) parts.push(t('notes edited'));
      return parts.join(' · ');
    }
    case 'whatsapp.credits_added':
      return [d.amount && t('+{n} credits', { n: d.amount }), d.note].filter(Boolean).join(' · ');
    case 'whatsapp.settings_changed':
      return [d.mode && t('Mode {mode}', { mode: d.mode.replace(/_/g, ' ') }), d.lowBalanceThreshold !== undefined && t('warn below {n}', { n: d.lowBalanceThreshold })].filter(Boolean).join(' · ');
    case 'society.features_changed':
      return Object.entries(d.overrides || {}).map(([k, v]) => t(v === null ? '{module} reset' : v ? '{module} on' : '{module} off', { module: k })).join(', ');
    case 'plan.price_updated':
      return [d.plan, d.perUnitMonthly !== undefined && t('{amount}/unit', { amount: money(d.perUnitMonthly) }), d.flatMonthly !== undefined && t('{amount} flat', { amount: money(d.flatMonthly) })].filter(Boolean).join(' · ');
    case 'invoice.marked_paid':
      return [d.number, d.method, d.reference].filter(Boolean).join(' · ');
    case 'invoice.voided':
      return [d.number, d.reason].filter(Boolean).join(' · ');
    case 'billing.run':
      return [d.created !== undefined && t('{n} invoice(s)', { n: d.created }), d.reminded !== undefined && t('{n} reminder(s)', { n: d.reminded }), d.suspended !== undefined && t('{n} suspended', { n: d.suspended })].filter(Boolean).join(' · ');
    case 'support.replied':
    case 'support.status_changed':
      return [d.number, d.status && t(label(d.status)).toLowerCase()].filter(Boolean).join(' · ');
    case 'support.assigned':
      return [d.number, d.assignedTo && t('to {name}', { name: d.assignedTo })].filter(Boolean).join(' · ');
    case 'support.session_started':
      return d.reason ? t('Reason: {reason}', { reason: d.reason }) : '';
    case 'team.member_invited':
      return [d.name, d.email, d.role].filter(Boolean).join(' · ');
    case 'team.member_role_changed':
      return `${d.name}: ${d.from || '—'} → ${d.to}`;
    case 'template.enabled':
    case 'template.disabled':
    case 'template.default_set':
      return d.key || d.template || '';
    case 'template.plan_rule_changed':
      return [d.plan, d.templates && t('{n} templates', { n: d.templates.length })].filter(Boolean).join(' · ');
    case 'society.template_forced':
      return d.forceTemplate || '';
    case 'society.appearance_changed':
    case 'reseller.templates_changed':
      return [d.allowedTemplates && (d.allowedTemplates.length ? t('{n} templates', { n: d.allowedTemplates.length }) : t('plan templates')), d.adminMayChange !== undefined && t(d.adminMayChange ? 'admin may change' : 'admin may not change'), d.brandOverridesTemplate !== undefined && t(d.brandOverridesTemplate ? 'brand colour wins' : 'template colours'), d.forceTemplate === null && t('no longer forced')].filter(Boolean).join(' · ');
    case 'role.created':
    case 'role.updated':
      return [d.name, d.permissions && t('{n} permissions', { n: d.permissions.length })].filter(Boolean).join(' · ');
    default:
      return d.name || d.note || '';
  }
}
