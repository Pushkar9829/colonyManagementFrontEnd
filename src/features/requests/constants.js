export const NOC_TYPES = [
  { value: 'sale', label: 'Sale / transfer of flat' },
  { value: 'passport', label: 'Passport / visa address proof' },
  { value: 'bank_loan', label: 'Bank loan (mortgage)' },
  { value: 'electricity', label: 'Electricity connection' },
  { value: 'gas', label: 'Piped gas connection' },
  { value: 'renovation', label: 'Renovation permission' },
  { value: 'other', label: 'Other NOC' },
];

export const KINDS = [
  { value: 'noc', label: 'NOC / permission' },
  { value: 'move_in', label: 'Move-in' },
  { value: 'move_out', label: 'Move-out' },
];

export const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'info_requested', label: 'Info requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Withdrawn' },
];

// t: the translate function from useT().
export const requestTitle = (r, t) => (r.kind === 'noc' ? t(NOC_TYPES.find((x) => x.value === r.nocType)?.label || 'NOC') : t(r.kind === 'move_in' ? 'Move-in on {date}' : 'Move-out on {date}', { date: r.move?.date }));

export const statusTone = (s) => ({ info_requested: 'on_hold', cancelled: 'cancelled' }[s] || s);
