import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

const keep = (p) => p;
// Vendor documents also move ledger balances, so accounting queries refresh with them.
const money = { invalidate: ['vendorBills', 'vendorPayments', 'vendors', 'accounting', 'purchaseRequests'] };

export const useExpenseSettings = () => useQuery({ queryKey: ['expenseSettings'], queryFn: () => api.get('/expenses/settings') });
export const useUpdateExpenseSettings = (o) => useApiMutation((b) => api.patch('/expenses/settings', b), { invalidate: ['expenseSettings'], success: 'Settings saved', ...o });

export const useVendors = (params) => useQuery({ queryKey: ['vendors', params], queryFn: () => api.list('/expenses/vendors', params), placeholderData: keep });
export const useVendor = (id) => useQuery({ queryKey: ['vendors', 'detail', id], queryFn: () => api.get(`/expenses/vendors/${id}`), enabled: Boolean(id) });
export const useVendorStatement = (id, params, enabled = true) =>
  useQuery({ queryKey: ['vendors', 'statement', id, params], queryFn: () => api.get(`/expenses/vendors/${id}/statement`, params), enabled: Boolean(id) && enabled });
export const useCreateVendor = (o) => useApiMutation((b) => api.post('/expenses/vendors', b), { invalidate: ['vendors'], success: (v) => tt('{name} added', { name: v.name }), ...o });
export const useUpdateVendor = (o) => useApiMutation(({ id, ...b }) => api.patch(`/expenses/vendors/${id}`, b), { invalidate: ['vendors'], success: 'Vendor updated', ...o });

const prInv = { invalidate: ['purchaseRequests'] };
export const usePurchaseRequests = (params) => useQuery({ queryKey: ['purchaseRequests', params], queryFn: () => api.list('/expenses/purchase-requests', params), placeholderData: keep });
export const usePurchaseRequest = (id) => useQuery({ queryKey: ['purchaseRequests', 'detail', id], queryFn: () => api.get(`/expenses/purchase-requests/${id}`), enabled: Boolean(id) });
export const useCreatePurchaseRequest = (o) =>
  useApiMutation((b) => api.post('/expenses/purchase-requests', b), { ...prInv, success: (p) => (p.status === 'approved' ? tt('{number} auto-approved', { number: p.number }) : p.status === 'pending' ? tt('{number} sent for approval', { number: p.number }) : tt('{number} saved as draft', { number: p.number })), ...o });
export const useUpdatePurchaseRequest = (o) => useApiMutation(({ id, ...b }) => api.patch(`/expenses/purchase-requests/${id}`, b), { ...prInv, success: 'Request updated', ...o });
export const useSubmitPurchaseRequest = (o) =>
  useApiMutation((id) => api.post(`/expenses/purchase-requests/${id}/submit`), { ...prInv, success: (p) => (p.status === 'approved' ? 'Auto-approved' : 'Sent for approval'), ...o });
export const useDecidePurchaseRequest = (o) =>
  useApiMutation(({ id, decision, note }) => api.post(`/expenses/purchase-requests/${id}/${decision}`, { note: note || undefined }), { ...prInv, success: (p) => (p.status === 'approved' ? tt('{number} approved', { number: p.number }) : p.status === 'rejected' ? tt('{number} rejected', { number: p.number }) : `${p.number} ${p.status}`), ...o });
export const useDeletePurchaseRequest = (o) => useApiMutation((id) => api.del(`/expenses/purchase-requests/${id}`), { ...prInv, success: 'Draft deleted', ...o });

export const useVendorBills = (params) => useQuery({ queryKey: ['vendorBills', params], queryFn: () => api.list('/expenses/bills', params), placeholderData: keep });
export const useVendorBill = (id) => useQuery({ queryKey: ['vendorBills', 'detail', id], queryFn: () => api.get(`/expenses/bills/${id}`), enabled: Boolean(id) });
export const useCreateVendorBill = (o) => useApiMutation((b) => api.post('/expenses/bills', b), { ...money, success: (b) => tt('Bill {number} recorded', { number: b.number }), ...o });
export const useCancelVendorBill = (o) => useApiMutation(({ id, reason }) => api.post(`/expenses/bills/${id}/cancel`, { reason }), { ...money, success: 'Bill cancelled', ...o });

export const useVendorPayments = (params) => useQuery({ queryKey: ['vendorPayments', params], queryFn: () => api.list('/expenses/payments', params), placeholderData: keep });
export const useVendorPayment = (id) => useQuery({ queryKey: ['vendorPayments', 'detail', id], queryFn: () => api.get(`/expenses/payments/${id}`), enabled: Boolean(id) });
export const useCreateVendorPayment = (o) => useApiMutation((b) => api.post('/expenses/payments', b), { ...money, success: (p) => tt('Payment {number} recorded', { number: p.number }), ...o });
export const useCancelVendorPayment = (o) => useApiMutation(({ id, reason }) => api.post(`/expenses/payments/${id}/cancel`, { reason }), { ...money, success: 'Payment cancelled', ...o });

export const useRecurring = () => useQuery({ queryKey: ['recurringExpenses'], queryFn: () => api.get('/expenses/recurring') });
export const useCreateRecurring = (o) => useApiMutation((b) => api.post('/expenses/recurring', b), { invalidate: ['recurringExpenses'], success: 'Recurring expense saved', ...o });
export const useUpdateRecurring = (o) => useApiMutation(({ id, ...b }) => api.patch(`/expenses/recurring/${id}`, b), { invalidate: ['recurringExpenses'], success: 'Updated', ...o });
export const useRunRecurring = (o) => useApiMutation((id) => api.post(`/expenses/recurring/${id}/run`), { invalidate: ['recurringExpenses', ...money.invalidate], success: (b) => tt('Bill {number} created', { number: b.number }), ...o });

export const useAgeing = (params) => useQuery({ queryKey: ['vendorBills', 'ageing', params], queryFn: () => api.get('/expenses/reports/ageing', params) });
export const useExpenseReport = (params) => useQuery({ queryKey: ['vendorBills', 'expense-report', params], queryFn: () => api.get('/expenses/reports/expenses', params), placeholderData: keep });
