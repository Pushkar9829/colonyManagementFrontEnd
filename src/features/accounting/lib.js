import { todayISO } from '../../lib/format';

export const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Funds & equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
];
export const TYPE_LABEL = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.value, t.label]));

export const SOURCE_LABELS = {
  bill: 'Maintenance bill',
  bill_late_fee: 'Late fee',
  payment: 'Receipt',
  adjustment: 'Adjustment',
  amenity_payment: 'Amenity payment',
  amenity_refund: 'Amenity refund',
  payslip: 'Salary',
  vendor_bill: 'Vendor bill',
  vendor_payment: 'Vendor payment',
  opening_balance: 'Opening balances',
  bank_line: 'Bank statement',
  reversal: 'Reversal',
};
export const sourceLabel = (e) => (e.sourceType ? SOURCE_LABELS[e.sourceType] || e.sourceType : 'Manual');

// Indian financial year: April–March. fyStart 2026 = FY 2026-27.
export const fyOf = (iso = todayISO()) => {
  const [y, m] = iso.split('-').map(Number);
  return m >= 4 ? y : y - 1;
};
export const fyLabel = (fy) => `FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
export const fyStartDate = (fy) => `${fy}-04-01`;
export const fyEndDate = (fy) => `${fy + 1}-03-31`;

export function rangePresets() {
  const today = todayISO();
  const fy = fyOf(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const prevEnd = new Date(Date.UTC(Number(prev.slice(0, 4)), Number(prev.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return [
    { key: 'fy', label: 'This FY', from: fyStartDate(fy), to: today },
    { key: 'month', label: 'This month', from: monthStart, to: today },
    { key: 'last-month', label: 'Last month', from: `${prev}-01`, to: prevEnd },
    { key: 'last-fy', label: 'Last FY', from: fyStartDate(fy - 1), to: fyEndDate(fy - 1) },
  ];
}

export const defaultRange = () => rangePresets()[0];

// Positive/negative paise to a number input value in rupees and back.
export const rupeesInput = (paise) => (paise ? String(paise / 100) : '');
