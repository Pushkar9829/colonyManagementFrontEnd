import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const useReportCatalogue = () => useQuery({ queryKey: ['reports', 'catalogue'], queryFn: () => api.get('/reports'), staleTime: Infinity });

const inv = { invalidate: [['reports', 'schedules']] };
export const useSchedules = () => useQuery({ queryKey: ['reports', 'schedules'], queryFn: () => api.get('/reports/schedules') });
export const useSchedulePreview = (frequency) => useQuery({ queryKey: ['reports', 'schedules', 'preview', frequency], queryFn: () => api.get('/reports/schedules/preview', { frequency }) });
export const useCreateSchedule = (o) => useApiMutation((b) => api.post('/reports/schedules', b), { ...inv, success: 'Summary email scheduled', ...o });
export const useUpdateSchedule = () => useApiMutation(({ id, ...b }) => api.patch(`/reports/schedules/${id}`, b), { ...inv, success: 'Schedule saved' });
export const useDeleteSchedule = () => useApiMutation((id) => api.del(`/reports/schedules/${id}`), { ...inv, success: 'Schedule removed' });
export const useSendScheduleNow = () => useApiMutation((id) => api.post(`/reports/schedules/${id}/send`), { ...inv, success: (r) => `Sent to ${r.sentTo.join(', ')}` });
