import { label } from '../../lib/format';

export const VENDOR_CATEGORIES = ['security', 'housekeeping', 'maintenance', 'electrical', 'plumbing', 'utilities', 'amc', 'gardening', 'supplies', 'professional', 'other']
  .map((v) => ({ value: v, label: v === 'amc' ? 'AMC' : label(v) }));
export const TDS_SECTIONS = [
  { value: '194C', label: '194C · Contractors' },
  { value: '194J', label: '194J · Professional / technical fees' },
  { value: '194I', label: '194I · Rent' },
  { value: '194H', label: '194H · Commission' },
  { value: '194Q', label: '194Q · Purchase of goods' },
  { value: 'other', label: 'Other' },
];
export const PAYMENT_METHODS = [
  { value: 'bank', label: 'Bank transfer (NEFT/RTGS/IMPS)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
];
export const PR_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'converted'].map((v) => ({ value: v, label: label(v) }));
export const BILL_STATUSES = ['unpaid', 'partial', 'paid', 'cancelled'].map((v) => ({ value: v, label: label(v) }));
