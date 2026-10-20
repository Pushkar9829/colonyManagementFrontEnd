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
];

const words = (s) => s.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const actionLabel = (action) => ACTION_LABELS[action] || words(action || '');

const money = (paise) => `₹${(Number(paise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// One short line about what changed, from the row's details.
export function describeDetails(row) {
  const d = row.details || {};
  switch (row.action) {
    case 'society.suspended':
      return d.suspendedReason ? `Reason: ${d.suspendedReason}` : '';
    case 'society.updated': {
      const parts = [];
      if (d.plan?.name) parts.push(`Plan ${d.plan.name}`);
      if (d.plan?.unitLimit !== undefined) parts.push(`unit limit ${d.plan.unitLimit ?? 'default'}`);
      if (d.plan?.validUntil) parts.push(`until ${String(d.plan.validUntil).slice(0, 10)}`);
      if (d.platformNotes !== undefined) parts.push('notes edited');
      return parts.join(' · ');
    }
    case 'whatsapp.credits_added':
      return [d.amount && `+${d.amount} credits`, d.note].filter(Boolean).join(' · ');
    case 'whatsapp.settings_changed':
      return [d.mode && `Mode ${d.mode.replace(/_/g, ' ')}`, d.lowBalanceThreshold !== undefined && `warn below ${d.lowBalanceThreshold}`].filter(Boolean).join(' · ');
    case 'society.features_changed':
      return Object.entries(d.overrides || {}).map(([k, v]) => `${k} ${v === null ? 'reset' : v ? 'on' : 'off'}`).join(', ');
    case 'plan.price_updated':
      return [d.plan, d.perUnitMonthly !== undefined && `${money(d.perUnitMonthly)}/unit`, d.flatMonthly !== undefined && `${money(d.flatMonthly)} flat`].filter(Boolean).join(' · ');
    case 'invoice.marked_paid':
      return [d.number, d.method, d.reference].filter(Boolean).join(' · ');
    case 'invoice.voided':
      return [d.number, d.reason].filter(Boolean).join(' · ');
    case 'billing.run':
      return [d.created !== undefined && `${d.created} invoice(s)`, d.reminded !== undefined && `${d.reminded} reminder(s)`, d.suspended !== undefined && `${d.suspended} suspended`].filter(Boolean).join(' · ');
    case 'support.replied':
    case 'support.status_changed':
      return [d.number, d.status && d.status.replace(/_/g, ' ')].filter(Boolean).join(' · ');
    case 'support.assigned':
      return [d.number, d.assignedTo && `to ${d.assignedTo}`].filter(Boolean).join(' · ');
    case 'support.session_started':
      return d.reason ? `Reason: ${d.reason}` : '';
    case 'team.member_invited':
      return [d.name, d.email, d.role].filter(Boolean).join(' · ');
    case 'team.member_role_changed':
      return `${d.name}: ${d.from || '—'} → ${d.to}`;
    case 'role.created':
    case 'role.updated':
      return [d.name, d.permissions && `${d.permissions.length} permissions`].filter(Boolean).join(' · ');
    default:
      return d.name || d.note || '';
  }
}
