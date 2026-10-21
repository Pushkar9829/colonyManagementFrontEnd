import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';
import { tt } from '../../lib/i18n/toastText';

// Society side: how residents' online payments reach this society (Settings → Online payments).
const KEY = ['paymentSettings'];
const inv = { invalidate: [KEY] };

export const usePaymentSettings = () => useQuery({ queryKey: [...KEY, 'mine'], queryFn: () => api.get('/payment-settings') });
// Any member: is "Pay online" available here?
export const useOnlinePaymentStatus = (enabled = true) => useQuery({ queryKey: [...KEY, 'status'], queryFn: () => api.get('/payment-settings/status'), enabled, staleTime: 60000 });

export const useChooseMode = () => useApiMutation((mode) => api.put('/payment-settings/mode', { mode }), { ...inv, success: 'Payment mode saved' });
export const useSaveOwnKeys = (o) => useApiMutation((b) => api.put('/payment-settings/own', b), { ...inv, success: 'Razorpay keys saved', ...o });
export const useTestConnection = () =>
  useApiMutation(() => api.post('/payment-settings/own/test'), { ...inv, success: (r) => (r.own.connection?.ok ? 'Connected to your Razorpay account' : false) });
export const useEnableOnline = () => useApiMutation(() => api.post('/payment-settings/enable'), { ...inv, success: 'Online payments are on' });
export const useDisableOnline = () => useApiMutation(() => api.post('/payment-settings/disable'), { ...inv, success: 'Online payments are off' });

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

// ₹1 through the chosen account. The mock gateway completes it on the server; Razorpay opens checkout.
export const useTestPayment = () => {
  const { t } = useT();
  return useApiMutation(
    async () => {
      const res = await api.post('/payment-settings/test-payment');
      if (res.instant) return res.settings;
      await loadRazorpay();
      return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: res.order.keyId,
          order_id: res.order.orderId,
          amount: res.order.amount,
          currency: res.order.currency,
          name: t('Test payment'),
          description: res.order.description,
          handler: (r) => api.post('/payment-settings/test-payment/verify', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).then(resolve, reject),
          modal: { ondismiss: () => reject(new Error(t('Payment cancelled'))) },
        });
        rzp.open();
      });
    },
    { ...inv, success: (s) => (s.testPayment?.ok ? 'Test payment of ₹1 succeeded' : 'Test payment did not go through') },
  );
};

// Platform console: per-society controls (permission payments.manage).
export const usePlatformPaymentSettings = (societyId) =>
  useQuery({ queryKey: ['platform', 'paymentSettings', societyId], queryFn: () => api.get(`/platform/payment-settings/${societyId}`), enabled: Boolean(societyId) });
export const useUpdatePlatformPaymentSettings = (societyId, o) =>
  useApiMutation((b) => api.patch(`/platform/payment-settings/${societyId}`, b), { invalidate: [['platform', 'paymentSettings', societyId]], success: 'Payment settings saved', ...o });
export const useRefreshRoute = (societyId) =>
  useApiMutation(() => api.post(`/platform/payment-settings/${societyId}/route/refresh`), { invalidate: [['platform', 'paymentSettings', societyId]], success: (r) => tt('Linked account is {status}', { status: r.route.status }) });
