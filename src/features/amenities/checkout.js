import { api } from '../../api/client';
import { money } from '../../lib/format';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window'));
    document.body.appendChild(s);
  });
}

// Opens the provider checkout for an amenity order (from /bookings/:id/pay or /amenity-passes/:id/pay)
// and settles it on the server. The dev mock signs through /payments/mock/sign instead.
export async function checkout(order, description) {
  if (order.provider === 'mock') {
    const lines = (order.breakdown || []).map((c) => `${c.label || c.kind}: ${money(c.amount)}`).join('\n');
    if (!window.confirm(`Test payment of ${money(order.amount)}\n${lines}\n\nSimulate a successful payment?`)) throw new Error('Payment cancelled');
    const signed = await api.post('/payments/mock/sign', { orderId: order.orderId });
    return api.post('/amenities/payments/verify', signed);
  }
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'ColonyHub',
      description,
      handler: (resp) =>
        api.post('/amenities/payments/verify', { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });
}
