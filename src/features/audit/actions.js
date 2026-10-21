import { money } from '../../lib/format';

// The API stores audit actions as codes ("vendor_bill.created"). Committee members read sentences,
// so well-known codes get a hand-written phrase and the rest are built from "<thing>.<what happened>".
const PHRASES = {
  'journal.created': 'Added journal entry',
  'journal.opened': 'Opened journal entry',
  'journal.reversed': 'Reversed journal entry',
  'journal.opening_balances': 'Entered opening balances',
  'bill.generated': 'Generated maintenance bills',
  'bill.cancelled': 'Cancelled a bill',
  'bill.emailed': 'Emailed a bill',
  'bill.credit_applied': 'Applied credit to a bill',
  'bill.late_fees_applied': 'Added late fees',
  'billing.opening_balances_imported': 'Imported opening dues',
  'payment.recorded': 'Recorded a payment',
  'payment.bounced': 'Marked a payment as bounced',
  'vendor_bill.created': 'Added vendor bill',
  'vendor_bill.cancelled': 'Cancelled vendor bill',
  'vendor_payment.created': 'Paid a vendor',
  'vendor_payment.cancelled': 'Cancelled a vendor payment',
  'adjustment.credit_issued': 'Gave a credit',
  'adjustment.refund': 'Recorded a refund',
  'waiver.requested': 'Asked for a waiver',
  'waiver.approved': 'Approved a waiver',
  'waiver.rejected': 'Rejected a waiver',
  'budget.saved': 'Saved the budget',
  'bank.statement_imported': 'Imported a bank statement',
  'bank.statement_removed': 'Removed a bank statement',
  'bank.entry_created': 'Added an entry from the bank statement',
  'finance.settings_updated': 'Changed finance settings',
  'society.settings_updated': 'Changed society settings',
  'society.profile_updated': 'Changed the society profile',
  'society.code_regenerated': 'Made a new society join code',
  'security.settings_updated': 'Changed security settings',
  'member.added': 'Added a member',
  'member.updated': 'Changed a member',
  'member.password_reset': "Reset a member's password",
  'request.approved': 'Approved a request',
  'request.rejected': 'Rejected a request',
  'committee.term_created': 'Started a new committee',
  'committee.term_activated': 'Seated the committee',
  'committee.term_dissolved': 'Dissolved the committee',
  'committee.position_added': 'Added an office-bearer',
  'committee.position_ended': 'Ended an office-bearer’s term',
  'device.key_created': 'Added a device',
  'device.key_revoked': 'Switched off a device key',
  'device.key_updated': 'Changed a device',
  'employee.bank_viewed': "Viewed an employee's bank details",
  'household.emergency_viewed': "Viewed a home's emergency contacts",
  'fire.extinguisher_refilled': 'Marked an extinguisher refilled',
  'gate.barrier_open': 'Opened the barrier',
  'report.exported': 'Downloaded a report',
  'platform.support_session_started': 'Platform support signed in to help',
  'sos.raised': 'Raised an SOS',
  'sos.resolved': 'Resolved an SOS',
};

const VERBS = {
  created: 'Added', added: 'Added', updated: 'Changed', deleted: 'Deleted', removed: 'Removed', cancelled: 'Cancelled',
  approved: 'Approved', rejected: 'Rejected', submitted: 'Submitted', closed: 'Closed', published: 'Published',
  uploaded: 'Uploaded', reported: 'Reported', recorded: 'Recorded', imported: 'Imported', opened: 'Opened',
  issued: 'Issued', ended: 'Ended', saved: 'Saved', viewed: 'Viewed', paid: 'Paid', marked: 'Marked',
};

const words = (s) => String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Pass the `t` from useT() to translate the hand-written phrases (built ones stay English).
const same = (s) => s;
export function actionLabel(code, t = same) {
  if (!code) return '';
  if (PHRASES[code]) return t(PHRASES[code]);
  const [thing, what = ''] = code.split('.');
  if (VERBS[what]) return `${VERBS[what]} ${words(thing)}`;
  // "fire.extinguisher_added" → "Fire: extinguisher added"
  return what ? `${sentence(words(thing))}: ${words(what)}` : sentence(words(thing));
}

const MONEY_KEYS = /^(amount|total|tds|fee|deposit|price|balance|due|paid)$|Paise$|Amount$|Total$/;

const valueText = (key, v, t = same) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? t('Yes') : t('No');
  if (typeof v === 'number' && MONEY_KEYS.test(key)) return money(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${words(k)} ${valueText(k, x, t)}`).join(', ');
  return String(v);
};

// meta → [["Vendor", "Sharma Electricals"], ["Total", "₹1,200.00"]]
export function detailLines(meta, t = same) {
  if (!meta || typeof meta !== 'object') return [];
  return Object.entries(meta).map(([k, v]) => [sentence(words(k)), valueText(k, v, t)]);
}
