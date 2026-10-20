import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';

const inv = { invalidate: ['events', 'dashboard'] };

export const useEvents = (params) => useQuery({ queryKey: ['events', 'list', params], queryFn: () => api.list('/events', params), placeholderData: (p) => p });
export const useEvent = (id) => useQuery({ queryKey: ['events', 'detail', id], queryFn: () => api.get(`/events/${id}`), enabled: Boolean(id) });
export const useEventRsvps = (id, params, enabled) => useQuery({ queryKey: ['events', 'rsvps', id, params], queryFn: () => api.list(`/events/${id}/rsvps`, params), enabled, placeholderData: (p) => p });
export const useMyTicket = (id, enabled) => useQuery({ queryKey: ['events', 'ticket', id], queryFn: () => api.get(`/events/${id}/ticket`), enabled });

export const useCreateEvent = (o) => useApiMutation((b) => api.post('/events', b), { ...inv, success: 'Event published', ...o });
export const useUpdateEvent = (o) => useApiMutation(({ id, ...b }) => api.patch(`/events/${id}`, b), { ...inv, success: 'Event updated', ...o });
export const useCancelEvent = (o) => useApiMutation(({ id, reason }) => api.post(`/events/${id}/cancel`, { reason }), { ...inv, success: 'Event cancelled', ...o });
export const useRsvp = (o) =>
  useApiMutation(({ id, ...b }) => api.post(`/events/${id}/rsvp`, b), {
    ...inv,
    success: (r) => ({ confirmed: "You're going!", waitlisted: 'Added to the waitlist', maybe: 'Marked as maybe', declined: 'RSVP updated' }[r.state] || 'RSVP saved'),
    ...o,
  });
export const useCancelRsvp = () => useApiMutation((id) => api.del(`/events/${id}/rsvp`), { ...inv, success: 'RSVP cancelled' });
export const useCheckIn = (o) => {
  const { t } = useT();
  return useApiMutation(({ id, ...b }) => api.post(`/events/${id}/check-in`, b), { ...inv, success: (r) => (r.user?.name ? t('Checked in {name}', { name: r.user.name }) : t('Checked in')), toastErrors: false, ...o });
};
export const useUndoCheckIn = () => useApiMutation(({ id, rsvpId }) => api.del(`/events/${id}/check-in/${rsvpId}`), { ...inv, success: 'Check-in undone' });
export const useCollect = () => {
  const { t } = useT();
  return useApiMutation(({ id, rsvpId, method }) => api.post(`/events/${id}/rsvps/${rsvpId}/collect`, { method }), { ...inv, success: (d) => t('Payment recorded · {receipt}', { receipt: d.ticket.receiptNumber }) });
};
export const useAddPhotos = (o) => useApiMutation(({ id, photos }) => api.post(`/events/${id}/photos`, { photos }), { ...inv, success: 'Photos added', ...o });
export const useRemovePhoto = () => useApiMutation(({ id, photoId }) => api.del(`/events/${id}/photos/${photoId}`), { ...inv, success: 'Photo removed' });

// Online ticket: create order -> provider checkout (or the dev mock) -> verify on the server.
async function payOnline(eventId, t) {
  const order = await api.post(`/events/${eventId}/pay`);
  if (order.provider === 'mock') {
    if (!window.confirm(t('Test payment of ₹{amount} for {title}. Simulate success?', { amount: (order.amount / 100).toFixed(2), title: order.title }))) throw new Error(t('Payment cancelled'));
    const signed = await api.post('/events/payments/mock/sign', { orderId: order.orderId });
    return api.post('/events/payments/verify', signed);
  }
  if (!window.Razorpay) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error(t('Could not load the payment window')));
      document.body.appendChild(s);
    });
  }
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: t('Event ticket'),
      description: order.title,
      handler: (resp) =>
        api.post('/events/payments/verify', { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error(t('Payment cancelled'))) },
    });
    rzp.open();
  });
}
export const usePayTicket = () => {
  const { t } = useT();
  return useApiMutation((eventId) => payOnline(eventId, t), { ...inv, success: (d) => t('Paid · {receipt}', { receipt: d.ticket.receiptNumber }) });
};
