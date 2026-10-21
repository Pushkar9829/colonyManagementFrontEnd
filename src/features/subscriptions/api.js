import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';
import { tt } from '../../lib/i18n/toastText';

const inv = { invalidate: ['subscription'] };

export const useSubscription = () => useQuery({ queryKey: ['subscription', 'me'], queryFn: () => api.get('/subscription') });
export const useSubscriptionInvoices = (params) =>
  useQuery({ queryKey: ['subscription', 'invoices', params], queryFn: () => api.list('/subscription/invoices', params), placeholderData: (p) => p });
export const useSubscriptionInvoice = (id) => useQuery({ queryKey: ['subscription', 'invoice', id], queryFn: () => api.get(`/subscription/invoices/${id}`), enabled: Boolean(id) });
export const useUpdateSubscription = (o) => useApiMutation((b) => api.patch('/subscription', b), { ...inv, success: 'Billing details saved', ...o });
// White-label licence key: sets the plan, prepays the term and links the society to the provider's brand.
export const useApplyLicence = (o) =>
  useApiMutation((key) => api.post('/licence/apply', { key }), { invalidate: ['subscription', 'branding', 'features'], success: (r) => tt(r.lifetime ? 'Licence applied: {plan} plan for life' : 'Licence applied: {plan} plan', { plan: r.plan }), ...o });

let razorpayScript;
function loadRazorpay(t) {
  if (window.Razorpay) return Promise.resolve();
  razorpayScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error(t('Could not load the payment window')));
    document.body.appendChild(s);
  });
  return razorpayScript;
}

// Same provider flow as maintenance payments: order -> checkout (or dev mock) -> server-side verify.
// `routes` decides whether we pay inside the society session or through a pay link.
// `t` from useT() translates the texts shown here.
async function checkout(order, { mockSign, verify, t }) {
  if (order.provider === 'mock') {
    if (!window.confirm(t('Test payment of {amount} for {invoice}. Simulate success?', { amount: `₹${(order.amount / 100).toFixed(2)}`, invoice: order.invoiceNumber }))) throw new Error(t('Payment cancelled'));
    return verify(await mockSign(order.orderId));
  }
  await loadRazorpay(t);
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: t('ColonyHub subscription'),
      description: order.invoiceNumber,
      handler: (resp) => verify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error(t('Payment cancelled'))) },
    });
    rzp.open();
  });
}

const paidMessage = (r) => (r.reactivated ? 'Payment received — your society is active again' : 'Payment received, thank you');

export const usePayInvoice = () => {
  const { t } = useT();
  return useApiMutation(
    async (invoiceId) =>
      checkout(await api.post(`/subscription/invoices/${invoiceId}/order`), {
        t,
        mockSign: (orderId) => api.post('/subscription/mock/sign', { orderId }),
        verify: (body) => api.post('/subscription/verify', body),
      }),
    { ...inv, success: paidMessage },
  );
};

// Pay link (works while the society is suspended).
export const usePayLink = (token) => useQuery({ queryKey: ['subscription', 'pay', token], queryFn: () => api.get(`/subscription/pay/${token}`), enabled: Boolean(token), retry: false });
export const usePayByLink = (token) => {
  const { t } = useT();
  return useApiMutation(
    async () =>
      checkout(await api.post(`/subscription/pay/${token}/order`, {}, { auth: false }), {
        t,
        mockSign: (orderId) => api.post(`/subscription/pay/${token}/mock-sign`, { orderId }, { auth: false }),
        verify: (body) => api.post(`/subscription/pay/${token}/verify`, body, { auth: false }),
      }),
    { ...inv, success: paidMessage },
  );
};
