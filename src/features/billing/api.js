import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, upload } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useToast } from '../../context/ToastContext';
import { downloadFile } from './download';

const inv = { invalidate: ['bills', 'payments', 'dashboard', 'finance'] };

export const useBills = (params) => useQuery({ queryKey: ['bills', params], queryFn: () => api.list('/bills', params), placeholderData: (p) => p });
export const useBill = (id) => useQuery({ queryKey: ['bills', 'detail', id], queryFn: () => api.get(`/bills/${id}`), enabled: Boolean(id) });
export const useBillingSummary = (period) => useQuery({ queryKey: ['bills', 'summary', period], queryFn: () => api.get('/bills/summary', { period }) });
export const useDefaulters = () => useQuery({ queryKey: ['bills', 'defaulters'], queryFn: () => api.get('/bills/defaulters') });
export const usePayments = (params) => useQuery({ queryKey: ['payments', params], queryFn: () => api.list('/payments', params), placeholderData: (p) => p });
export const useReceipt = (id) => useQuery({ queryKey: ['payments', 'receipt', id], queryFn: () => api.get(`/payments/${id}/receipt`), enabled: Boolean(id) });
export const useStatement = (params, enabled = true) =>
  useQuery({ queryKey: ['bills', 'statement', params], queryFn: () => api.get('/bills/statement', params), enabled, placeholderData: (p) => p });
export const useWaivers = (params) => useQuery({ queryKey: ['finance', 'waivers', params], queryFn: () => api.list('/bills/waivers', params), placeholderData: (p) => p });
export const useAdjustments = (params) => useQuery({ queryKey: ['finance', 'adjustments', params], queryFn: () => api.list('/bills/adjustments', params), placeholderData: (p) => p });
export const useCreditHolders = () => useQuery({ queryKey: ['finance', 'credits'], queryFn: () => api.get('/bills/credits') });
export const useMandates = (params) => useQuery({ queryKey: ['finance', 'mandates', params], queryFn: () => api.list('/payments/mandates', params), placeholderData: (p) => p });
export const useMyAutopay = () => useQuery({ queryKey: ['finance', 'autopay'], queryFn: () => api.get('/payments/autopay') });
export const useFinanceSettings = (enabled = true) => useQuery({ queryKey: ['finance', 'settings'], queryFn: () => api.get('/finance/settings'), enabled });

export const useGenerateBills = (o) =>
  useApiMutation((b) => api.post('/bills/generate', b), {
    ...inv,
    success: (r) =>
      `${r.created} bills generated for ${r.period}${r.alreadyBilled ? ` (${r.alreadyBilled} already billed)` : ''}${r.autopay?.charged ? ` · ${r.autopay.charged} paid by autopay` : ''}`,
    ...o,
  });
export const useApplyLateFees = () => useApiMutation(() => api.post('/bills/apply-late-fees'), { ...inv, success: (r) => `Late fee applied to ${r.updated} bills` });
export const useCancelBill = () => useApiMutation((id) => api.post(`/bills/${id}/cancel`), { ...inv, success: 'Bill cancelled' });
export const useRecordPayment = (o) => useApiMutation((b) => api.post('/payments/offline', b), { ...inv, success: (p) => `Payment recorded · ${p.receiptNumber}`, ...o });
export const useRecordAdvance = (o) => useApiMutation((b) => api.post('/payments/advance', b), { ...inv, success: (p) => `Advance recorded · ${p.receiptNumber}`, ...o });
export const useBouncePayment = (o) => useApiMutation(({ id, ...b }) => api.post(`/payments/${id}/bounce`, b), { ...inv, success: 'Payment marked as bounced', ...o });
export const useRequestWaiver = (o) =>
  useApiMutation((b) => api.post('/bills/waivers', b), { ...inv, success: (w) => (w.status === 'approved' ? 'Waiver applied' : 'Waiver sent for approval'), ...o });
export const useDecideWaiver = () =>
  useApiMutation(({ id, decision, note }) => api.post(`/bills/waivers/${id}/${decision}`, { note }), { ...inv, success: (w) => `Waiver ${w.status}` });
export const useIssueCredit = (o) => useApiMutation((b) => api.post('/bills/credits', b), { ...inv, success: 'Credit note issued', ...o });
export const useApplyCredit = () => useApiMutation((unit) => api.post('/bills/credits/apply', { unit }), { ...inv, success: (r) => (r.applied ? 'Advance applied to open bills' : 'No open bills to apply it to') });
export const useRefund = (o) => useApiMutation((b) => api.post('/bills/refunds', b), { ...inv, success: 'Refund recorded', ...o });
export const useEmailBill = () => useApiMutation((id) => api.post(`/bills/${id}/email`), { success: (r) => `Bill emailed to ${r.to}` });
export const useEmailReceipt = () => useApiMutation((id) => api.post(`/payments/${id}/email`), { success: (r) => `Receipt emailed to ${r.to}` });
export const useAutopayOptIn = (o) => useApiMutation((b) => api.post('/payments/autopay', b), { invalidate: ['finance'], success: 'Autopay is on', ...o });
export const useAutopayCancel = () => useApiMutation(() => api.del('/payments/autopay'), { invalidate: ['finance'], success: 'Autopay turned off' });
export const useCancelMandate = () => useApiMutation((id) => api.post(`/payments/mandates/${id}/cancel`), { invalidate: ['finance'], success: 'Mandate cancelled' });
export const useSaveFinanceSettings = () => useApiMutation((b) => api.patch('/finance/settings', b), { invalidate: ['finance'], success: 'Finance settings saved' });
export const useImportOpening = (o) =>
  useApiMutation(
    ({ file, dryRun }) => {
      const fd = new FormData();
      fd.append('file', file);
      if (dryRun) fd.append('dryRun', 'true');
      return upload('/bills/opening-balances/import', fd);
    },
    { ...inv, success: (r) => (r.dryRun ? `${r.valid} rows look good` : `${r.imported} opening balances imported`), ...o },
  );

// Download a PDF/Excel with a busy flag and error toast.
export function useDownload() {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const download = async (key, path, query, name) => {
    setBusy(key);
    try {
      await downloadFile(path, query, name);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };
  return { download, busy };
}

let razorpayScript;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  razorpayScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window'));
    document.body.appendChild(s);
  });
  return razorpayScript;
}

// Online payment: create order, open provider checkout (or the dev mock), verify the signature server-side.
// `target` is a bill id, or { advance: paise } to pay ahead.
async function payOnline(target) {
  const order = await api.post('/payments/orders', typeof target === 'string' ? { bill: target } : target);
  if (order.provider === 'mock') {
    if (!window.confirm(`Test payment of ₹${(order.amount / 100).toFixed(2)} for ${order.billNumber}. Simulate success?`)) throw new Error('Payment cancelled');
    const signed = await api.post('/payments/mock/sign', { orderId: order.orderId });
    return api.post('/payments/verify', signed);
  }
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Maintenance payment',
      description: order.billNumber,
      handler: (resp) =>
        api.post('/payments/verify', { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });
}

export const usePayOnline = (o) => useApiMutation(payOnline, { ...inv, success: (p) => `Payment successful · ${p.receiptNumber}`, ...o });
