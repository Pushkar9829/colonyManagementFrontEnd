import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

// Every key starts with 'parking' so the realtime ['parking'] invalidation refreshes all of it.
const inv = { invalidate: ['parking'] };
const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const useParkingSummary = (opts = {}) => useQuery({ queryKey: ['parking', 'summary'], queryFn: () => api.get('/parking/summary'), ...opts });
export const useMyParking = (opts = {}) => useQuery({ queryKey: ['parking', 'my'], queryFn: () => api.get('/parking/my'), ...opts });

// ---- areas & slots ----
export const useParkingAreas = (opts = {}) => useQuery({ queryKey: ['parking', 'areas'], queryFn: () => api.get('/parking/areas'), ...opts });
export const useParkingSlots = (params, opts = {}) =>
  useQuery({ queryKey: ['parking', 'slots', clean(params)], queryFn: () => api.list('/parking/slots', clean(params)), placeholderData: (p) => p, ...opts });
// The unit's registered vehicles, for linking them to an allotted slot.
export const useUnitVehicles = (unit) =>
  useQuery({ queryKey: ['parking', 'unit-vehicles', unit], queryFn: () => api.get('/vehicles', { unit, limit: 100 }), enabled: Boolean(unit) });
export const useMyVehicles = (enabled = true) => useQuery({ queryKey: ['parking', 'my-vehicles'], queryFn: () => api.get('/vehicles', { limit: 100 }), enabled });

export const useCreateArea = (o) => useApiMutation((b) => api.post('/parking/areas', b), { ...inv, success: 'Area added', ...o });
export const useUpdateArea = (o) => useApiMutation(({ id, ...b }) => api.patch(`/parking/areas/${id}`, b), { ...inv, success: 'Area updated', ...o });
export const useDeleteArea = (o) => useApiMutation((id) => api.del(`/parking/areas/${id}`), { ...inv, success: 'Area removed', ...o });

export const useCreateSlots = (o) =>
  useApiMutation((b) => api.post('/parking/slots', b), { ...inv, success: (r) => (r.skipped
      ? tt(r.created === 1 ? '{created} slot added · {skipped} already existed' : '{created} slots added · {skipped} already existed', { created: r.created, skipped: r.skipped })
      : tt(r.created === 1 ? '{created} slot added' : '{created} slots added', { created: r.created })), ...o });
export const useUpdateSlot = (o) => useApiMutation(({ id, ...b }) => api.patch(`/parking/slots/${id}`, b), { ...inv, success: 'Slot updated', ...o });
export const useDeleteSlot = (o) => useApiMutation((id) => api.del(`/parking/slots/${id}`), { ...inv, success: 'Slot deleted', ...o });
export const useAllotSlot = (o) => useApiMutation(({ id, ...b }) => api.post(`/parking/slots/${id}/allot`, b), { ...inv, success: (s) => (s.unit?.label ? tt('Slot {number} allotted to {unit}', { number: s.number, unit: s.unit.label }) : tt('Slot {number} allotted', { number: s.number })), ...o });
export const useReleaseSlot = (o) => useApiMutation((id) => api.post(`/parking/slots/${id}/release`), { ...inv, success: (s) => tt('Slot {number} released', { number: s.number }), ...o });

// ---- visitor parking ----
export const useVisitorSessions = (params, opts = {}) =>
  useQuery({ queryKey: ['parking', 'visitor-sessions', clean(params)], queryFn: () => api.list('/parking/visitor-sessions', clean(params)), placeholderData: (p) => p, ...opts });
export const useStartVisitorParking = (o) => useApiMutation((b) => api.post('/parking/visitor-sessions', b), { ...inv, success: (s) => (s.slot?.number ? tt('{vehicle} parked in {slot}', { vehicle: s.vehicleNumber, slot: s.slot.number }) : tt('{vehicle} parked', { vehicle: s.vehicleNumber })), ...o });
export const useEndVisitorParking = (o) => useApiMutation((id) => api.post(`/parking/visitor-sessions/${id}/end`), { ...inv, success: (s) => tt('{vehicle} has left', { vehicle: s.vehicleNumber }), ...o });

// ---- violations ----
export const useViolations = (params, opts = {}) =>
  useQuery({ queryKey: ['parking', 'violations', clean(params)], queryFn: () => api.list('/parking/violations', clean(params)), placeholderData: (p) => p, ...opts });
export const useReportViolation = (o) => useApiMutation((b) => api.post('/parking/violations', b), { ...inv, success: (v) => tt('Violation {number} reported', { number: v.number }), ...o });
export const useDisputeViolation = (o) => useApiMutation(({ id, note }) => api.post(`/parking/violations/${id}/dispute`, { note }), { ...inv, success: 'Dispute sent to the management', ...o });
export const useResolveViolation = (o) =>
  useApiMutation(({ id, ...b }) => api.post(`/parking/violations/${id}/resolve`, b), { ...inv, success: (v) => (v.status === 'dismissed' ? tt('Violation {number} dismissed', { number: v.number }) : tt('Violation {number} resolved', { number: v.number })), ...o });

// ---- EV charging ----
export const useChargers = (params, opts = {}) => useQuery({ queryKey: ['parking', 'chargers', clean(params)], queryFn: () => api.get('/parking/ev/chargers', clean(params)), ...opts });
export const useChargerAvailability = (id, date) =>
  useQuery({ queryKey: ['parking', 'availability', id, date], queryFn: () => api.get(`/parking/ev/chargers/${id}/availability`, { date }), enabled: Boolean(id && date) });
export const useEvBookings = (params, opts = {}) =>
  useQuery({ queryKey: ['parking', 'ev-bookings', clean(params)], queryFn: () => api.list('/parking/ev/bookings', clean(params)), placeholderData: (p) => p, ...opts });

export const useCreateCharger = (o) => useApiMutation((b) => api.post('/parking/ev/chargers', b), { ...inv, success: 'Charger added', ...o });
export const useUpdateCharger = (o) => useApiMutation(({ id, ...b }) => api.patch(`/parking/ev/chargers/${id}`, b), { ...inv, success: 'Charger updated', ...o });
export const useBookCharger = (o) => useApiMutation((b) => api.post('/parking/ev/bookings', b), { ...inv, success: (s) => tt('Charger booked {start}–{end}', { start: s.startTime, end: s.endTime }), ...o });
export const useStartCharging = (o) => useApiMutation((id) => api.post(`/parking/ev/bookings/${id}/start`), { ...inv, success: 'Charging started', ...o });
export const useCompleteCharging = (o) => useApiMutation(({ id, kwh }) => api.post(`/parking/ev/bookings/${id}/complete`, { kwh }), { ...inv, success: 'Charging session completed', ...o });
export const useCancelEvBooking = (o) =>
  useApiMutation(({ id, noShow }) => api.post(`/parking/ev/bookings/${id}/cancel`, noShow ? { noShow: true } : {}), { ...inv, success: (s) => (s.status === 'no_show' ? 'Marked as no-show' : 'Booking cancelled'), ...o });
