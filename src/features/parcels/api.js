import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

// Every parcels key starts with 'parcels' so the server's realtime invalidation refreshes them all.
const inv = { invalidate: ['parcels', 'dashboard', 'notifications'] };

export const COURIERS = ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Swiggy', 'Zomato', 'Zepto', 'Blinkit', 'BigBasket', 'Delhivery', 'BlueDart', 'DTDC', 'India Post', 'Other'];
export const COLLECTOR_TYPES = [
  { value: 'resident', label: 'Resident' },
  { value: 'family', label: 'Family member' },
  { value: 'daily_help', label: 'Daily help' },
  { value: 'other', label: 'Someone else' },
];
export const OPEN_STATUSES = ['received', 'notified'];

export const useParcels = (params, options) =>
  useQuery({ queryKey: ['parcels', 'list', params], queryFn: () => api.list('/parcels', params), placeholderData: (p) => p, ...options });
export const useParcelStats = (options) => useQuery({ queryKey: ['parcels', 'stats'], queryFn: () => api.get('/parcels/stats'), ...options });

export const useLogParcel = (o) =>
  useApiMutation((b) => api.post('/parcels', b), {
    ...inv,
    success: (p) => (p.leftAtGate ? `${p.number} logged · left at gate as the household asked` : p.status === 'notified' ? `${p.number} logged · household notified` : `${p.number} logged`),
    ...o,
  });
export const useCollectParcel = (o) => useApiMutation(({ id, ...b }) => api.post(`/parcels/${id}/collect`, b), { ...inv, success: (p) => `${p.number} handed over`, ...o });
export const useReturnParcel = (o) => useApiMutation(({ id, reason }) => api.post(`/parcels/${id}/return`, { reason }), { ...inv, success: 'Marked as returned', ...o });
export const useRemindParcel = () => useApiMutation((id) => api.post(`/parcels/${id}/remind`), { invalidate: ['parcels'], success: 'Reminder sent to the household' });

// ---- household delivery preferences ----
export const usePreferences = (options) => useQuery({ queryKey: ['parcels', 'preferences'], queryFn: () => api.get('/parcels/preferences'), ...options });
export const usePreferenceCheck = (unit, company) =>
  useQuery({
    queryKey: ['parcels', 'preference-check', unit, company],
    queryFn: () => api.get('/parcels/preferences/check', { unit, company }),
    enabled: Boolean(unit && company && company.length >= 2),
    staleTime: 30000,
  });
export const useCreatePreference = (o) => useApiMutation((b) => api.post('/parcels/preferences', b), { invalidate: ['parcels'], success: 'Preference saved', ...o });
export const useRemovePreference = () => useApiMutation((id) => api.del(`/parcels/preferences/${id}`), { invalidate: ['parcels'], success: 'Preference removed' });

// ageHours from the API → "3h", "2d 4h"
export function formatAge(hours) {
  const h = Math.max(0, Number(hours) || 0);
  if (h < 1) return '<1h';
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${d}d ${rest}h` : `${d}d`;
}
