import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, upload } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../context/LanguageContext';
import { downloadFile } from './download';
import { tt } from '../../lib/i18n/toastText';

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
    success: (r) => {
      const vars = { count: r.created, period: r.period, already: r.alreadyBilled, autopay: r.autopay?.charged };
      if (r.alreadyBilled && r.autopay?.charged) return tt('{count} bills generated for {period} ({already} already billed) · {autopay} paid by autopay', vars);
      if (r.alreadyBilled) return tt('{count} bills generated for {period} ({already} already billed)', vars);
      if (r.autopay?.charged) return tt('{count} bills generated for {period} · {autopay} paid by autopay', vars);
      return tt('{count} bills generated for {period}', vars);
    },
    ...o,
  });
export const useApplyLateFees = () => useApiMutation(() => api.post('/bills/apply-late-fees'), { ...inv, success: (r) => tt('Late fee applied to {count} bills', { count: r.updated }) });
export const useCancelBill = () => useApiMutation((id) => api.post(`/bills/${id}/cancel`), { ...inv, success: 'Bill cancelled' });
export const useRecordPayment = (o) => useApiMutation((b) => api.post('/payments/offline', b), { ...inv, success: (p) => tt('Payment recorded · {receipt}', { receipt: p.receiptNumber }), ...o });
export const useRecordAdvance = (o) => useApiMutation((b) => api.post('/payments/advance', b), { ...inv, success: (p) => tt('Advance recorded · {receipt}', { receipt: p.receiptNumber }), ...o });
export const useBouncePayment = (o) => useApiMutation(({ id, ...b }) => api.post(`/payments/${id}/bounce`, b), { ...inv, success: 'Payment marked as bounced', ...o });
export const useRequestWaiver = (o) =>
  useApiMutation((b) => api.post('/bills/waivers', b), { ...inv, success: (w) => (w.status === 'approved' ? 'Waiver applied' : 'Waiver sent for approval'), ...o });
export const useDecideWaiver = () =>
  useApiMutation(({ id, decision, note }) => api.post(`/bills/waivers/${id}/${decision}`, { note }), { ...inv, success: (w) => (w.status === 'approved' ? 'Waiver approved' : w.status === 'rejected' ? 'Waiver rejected' : tt('Waiver {status}', { status: w.status })) });
export const useIssueCredit = (o) => useApiMutation((b) => api.post('/bills/credits', b), { ...inv, success: 'Credit note issued', ...o });
export const useApplyCredit = () => useApiMutation((unit) => api.post('/bills/credits/apply', { unit }), { ...inv, success: (r) => (r.applied ? 'Advance applied to open bills' : 'No open bills to apply it to') });
export const useRefund = (o) => useApiMutation((b) => api.post('/bills/refunds', b), { ...inv, success: 'Refund recorded', ...o });
export const useEmailBill = () => {
  const { t } = useT();
  return useApiMutation((id) => api.post(`/bills/${id}/email`), { success: (r) => t('Bill emailed to {to}', { to: r.to }) });
};
export const useEmailReceipt = () => {
  const { t } = useT();
  return useApiMutation((id) => api.post(`/payments/${id}/email`), { success: (r) => t('Receipt emailed to {to}', { to: r.to }) });
};
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
    { ...inv, success: (r) => (r.dryRun ? tt('{count} rows look good', { count: r.valid }) : tt('{count} opening balances imported', { count: r.imported })), ...o },
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
// `target` is a bill id, or { advance: paise } to pay ahead. `t` translates the dialog texts.
const plain = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v?.[k] ?? '');
async function payOnline(target, t = plain) {
  const order = await api.post('/payments/orders', typeof target === 'string' ? { bill: target } : target);
  if (order.provider === 'mock') {
    if (!window.confirm(t('Test payment of {amount} for {bill}. Simulate success?', { amount: `₹${(order.amount / 100).toFixed(2)}`, bill: order.billNumber }))) throw new Error(t('Payment cancelled'));
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
      name: t('Maintenance payment'),
      description: order.billNumber,
      handler: (resp) =>
        api.post('/payments/verify', { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error(t('Payment cancelled'))) },
    });
    rzp.open();
  });
}

// Autopay sign-up: the resident authorises the mandate once in the provider checkout (UPI AutoPay
// debits ₹1, kept as advance; e-NACH debits nothing and the bank confirms it in a few days).
async function setupAutopay({ maxAmount, method }, t = plain) {
  const o = await api.post('/payments/autopay/start', { maxAmount, method });
  const limit = `₹${(maxAmount / 100).toLocaleString('en-IN')}`;
  if (o.provider === 'mock') {
    if (!window.confirm(t('Test mandate up to {limit} per bill. Simulate the bank authorisation?', { limit }))) throw new Error(t('Autopay set-up cancelled'));
    const signed = await api.post('/payments/mock/sign', { orderId: o.orderId });
    return api.post('/payments/autopay/confirm', signed);
  }
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: o.keyId,
      order_id: o.orderId,
      customer_id: o.customerId,
      recurring: '1',
      name: t('Autopay mandate'),
      description: t('Maintenance bills up to {limit} each', { limit }),
      prefill: { name: o.name, email: o.email, contact: o.contact },
      handler: (resp) =>
        api.post('/payments/autopay/confirm', { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error(t('Autopay set-up cancelled'))) },
    });
    rzp.open();
  });
}

export const useSetupAutopay = (o) => {
  const { t } = useT();
  return useApiMutation((b) => setupAutopay(b, t), { invalidate: ['finance'], success: (m) => (m.status === 'active' ? 'Autopay is on' : 'Waiting for your bank to approve the mandate'), ...o });
};

export const usePayOnline = (o) => {
  const { t } = useT();
  return useApiMutation((target) => payOnline(target, t), { ...inv, success: (p) => t('Payment successful · {receipt}', { receipt: p.receiptNumber }), ...o });
};
