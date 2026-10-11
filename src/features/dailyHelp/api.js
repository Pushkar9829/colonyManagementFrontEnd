import { useQuery } from '@tanstack/react-query';
import { api, request } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const put = (path, body) => request('PUT', path, { body }).then((j) => j.data);

export const useDailyHelp = (params, options) =>
  useQuery({ queryKey: ['dailyHelp', params], queryFn: () => api.list('/daily-help', params), placeholderData: (p) => p, ...options });

export const useHelpAttendance = (id) =>
  useQuery({ queryKey: ['dailyHelp', 'attendance', id], queryFn: () => api.list(`/daily-help/${id}/attendance`, { limit: 30 }), enabled: Boolean(id) });
export const useHelpReviews = (id) =>
  useQuery({ queryKey: ['dailyHelp', 'reviews', id], queryFn: () => api.list(`/daily-help/${id}/reviews`, { limit: 50 }), enabled: Boolean(id) });
export const useHelpLeaves = (id) =>
  useQuery({ queryKey: ['dailyHelp', 'leaves', id], queryFn: () => api.list(`/daily-help/${id}/leaves`, { limit: 30 }), enabled: Boolean(id) });

export const useCreateHelp = (o) => useApiMutation((b) => api.post('/daily-help', b), { invalidate: ['dailyHelp'], success: 'Helper added', ...o });
export const useUpdateHelp = () => useApiMutation(({ id, ...b }) => api.patch(`/daily-help/${id}`, b), { invalidate: ['dailyHelp'], success: 'Helper updated' });
export const useRemoveHelpFromUnit = () => useApiMutation((id) => api.del(`/daily-help/${id}/my-unit`), { invalidate: ['dailyHelp'], success: 'Removed from your home' });
export const useGateScan = (o) =>
  useApiMutation((passcode) => api.post('/daily-help/gate-scan', { passcode }), {
    invalidate: ['dailyHelp', 'dashboard'],
    success: (r) => `${r.help.name} ${r.direction === 'in' ? 'entered' : 'left'}`,
    ...o,
  });

export const useRateHelp = (o) => useApiMutation(({ id, ...b }) => put(`/daily-help/${id}/reviews/mine`, b), { invalidate: ['dailyHelp'], success: 'Thanks for the review', ...o });
export const useSetEmployment = (o) => useApiMutation(({ id, ...b }) => put(`/daily-help/${id}/employment`, b), { invalidate: ['dailyHelp'], success: 'Salary details saved', ...o });
export const useSalaryPaid = () => useApiMutation((id) => api.post(`/daily-help/${id}/salary-paid`, {}), { invalidate: ['dailyHelp'], success: 'Marked as paid for this month' });
export const useAddLeave = (o) => useApiMutation(({ id, ...b }) => api.post(`/daily-help/${id}/leaves`, b), { invalidate: ['dailyHelp'], success: 'Marked', ...o });
export const useRemoveLeave = () => useApiMutation(({ id, leaveId }) => api.del(`/daily-help/${id}/leaves/${leaveId}`), { invalidate: ['dailyHelp'], success: 'Removed' });
export const useHelpDocuments = (o) => useApiMutation(({ id, ...b }) => api.post(`/daily-help/${id}/documents`, b), { invalidate: ['dailyHelp'], success: 'Documents added', ...o });
export const useHelpVerification = () => useApiMutation(({ id, ...b }) => api.post(`/daily-help/${id}/verification`, b), { invalidate: ['dailyHelp'], success: 'Verification updated' });
