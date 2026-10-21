import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { checkout } from './checkout';
import { tt } from '../../lib/i18n/toastText';

const inv = ['bookings', 'amenities', 'dashboard'];

export const useAmenities = () => useQuery({ queryKey: ['amenities'], queryFn: () => api.get('/amenities') });
export const useAvailability = (id, date) =>
  useQuery({ queryKey: ['amenities', 'availability', id, date], queryFn: () => api.get(`/amenities/${id}/availability`, { date }), enabled: Boolean(id && date) });
export const useBookings = (params) => useQuery({ queryKey: ['bookings', params], queryFn: () => api.list('/bookings', params), placeholderData: (p) => p });

export const useCreateAmenity = (o) => useApiMutation((b) => api.post('/amenities', b), { invalidate: ['amenities'], success: 'Amenity added', ...o });
export const useUpdateAmenity = (o) => useApiMutation(({ id, ...b }) => api.patch(`/amenities/${id}`, b), { invalidate: ['amenities'], success: 'Amenity updated', ...o });
export const useAddAmenityPhotos = (o) => useApiMutation(({ id, files }) => api.post(`/amenities/${id}/photos`, { files }), { invalidate: ['amenities'], success: 'Photos added', ...o });
export const useRemoveAmenityPhoto = () => useApiMutation(({ id, photoId }) => api.del(`/amenities/${id}/photos/${photoId}`), { invalidate: ['amenities'], success: 'Photo removed' });

const bookedMessage = (b) => {
  if (b.status === 'pending') return 'Request sent for approval';
  if (b.status === 'payment_pending') return false; // the payment step follows
  return 'Booking confirmed';
};
export const useBook = (o) => useApiMutation((b) => api.post('/bookings', b), { invalidate: inv, success: bookedMessage, ...o });

// Creates the gateway order for a booking (fee + deposit) and runs the checkout.
export const usePayBooking = (o) =>
  useApiMutation(
    async (booking) => {
      const order = await api.post(`/bookings/${booking._id}/pay`);
      return checkout(order, `${booking.amenity?.name || 'Amenity'} booking`);
    },
    { invalidate: inv, success: 'Payment received — booking confirmed', ...o },
  );
export const useCancellationQuote = (id) =>
  useQuery({ queryKey: ['bookings', 'quote', id], queryFn: () => api.get(`/bookings/${id}/cancellation-quote`), enabled: Boolean(id), staleTime: 0 });
export const useCancelBooking = (o) =>
  useApiMutation(({ id, reason }) => api.post(`/bookings/${id}/cancel`, { reason }), {
    invalidate: inv,
    success: (b) => (b.refund && b.refund.feeRefunded + b.refund.depositRefunded > 0 ? 'Booking cancelled — refund initiated' : 'Booking cancelled'),
    ...o,
  });
export const useDecideBooking = () =>
  useApiMutation(({ id, ...b }) => api.post(`/bookings/${id}/decide`, b), { invalidate: inv, success: (b) => ({ confirmed: 'Booking confirmed', rejected: 'Booking rejected', payment_pending: 'Booking payment pending' }[b.status] || tt('Booking {status}', { status: b.status.replace('_', ' ') })) });
export const useMarkBookingPaid = (o) => useApiMutation(({ id, ...b }) => api.post(`/bookings/${id}/mark-paid`, b), { invalidate: inv, success: 'Payment recorded', ...o });
export const useRefundDeposit = (o) => useApiMutation(({ id, ...b }) => api.post(`/bookings/${id}/refund-deposit`, b), { invalidate: inv, success: 'Deposit refund recorded', ...o });
export const useMarkAttendance = () => useApiMutation(({ id, attended }) => api.post(`/bookings/${id}/attendance`, { attended }), { invalidate: inv, success: 'Marked' });

// ---------- passes ----------
export const usePassPlans = (amenity) => useQuery({ queryKey: ['amenities', 'plans', amenity || 'all'], queryFn: () => api.get('/amenities/pass-plans', { amenity }) });
export const useCreatePlan = (o) => useApiMutation(({ amenity, ...b }) => api.post(`/amenities/${amenity}/pass-plans`, b), { invalidate: ['amenities'], success: 'Plan added', ...o });
export const useUpdatePlan = (o) => useApiMutation(({ id, ...b }) => api.patch(`/amenities/pass-plans/${id}`, b), { invalidate: ['amenities'], success: 'Plan updated', ...o });
export const usePasses = (params) => useQuery({ queryKey: ['amenityPasses', params], queryFn: () => api.list('/amenity-passes', params), placeholderData: (p) => p });
export const useBuyPass = (o) =>
  useApiMutation(
    async (body) => {
      const pass = await api.post('/amenity-passes', body);
      if (pass.status !== 'payment_pending' || pass.paymentStatus !== 'pending') return pass;
      const order = await api.post(`/amenity-passes/${pass._id}/pay`);
      return (await checkout(order, `${pass.amenity?.name} pass`)).pass;
    },
    { invalidate: ['amenityPasses'], success: (p) => (p.status === 'active' ? 'Pass is active' : 'Pass reserved — pay at the office to activate'), ...o },
  );
export const usePayPass = () =>
  useApiMutation(
    async (pass) => {
      const order = await api.post(`/amenity-passes/${pass._id}/pay`);
      return checkout(order, `${pass.amenity?.name} pass`);
    },
    { invalidate: ['amenityPasses'], success: 'Pass is active' },
  );
export const useMarkPassPaid = () => useApiMutation(({ id, ...b }) => api.post(`/amenity-passes/${id}/mark-paid`, b), { invalidate: ['amenityPasses'], success: 'Payment recorded' });
export const useCancelPass = () => useApiMutation(({ id, ...b }) => api.post(`/amenity-passes/${id}/cancel`, b), { invalidate: ['amenityPasses'], success: 'Pass cancelled' });
export const useCheckPass = (o) => useApiMutation((b) => api.post('/amenity-passes/check', b), { success: false, ...o });

// ---------- reports ----------
export const useUsageReport = (params) => useQuery({ queryKey: ['amenities', 'report', params], queryFn: () => api.get('/amenities/reports/usage', params), placeholderData: (p) => p });
