import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['utility'] };

export const usePoints = (params) => useQuery({ queryKey: ['utility', 'points', params], queryFn: () => api.get('/utility-logs/points', params) });
export const useReadings = (params, enabled = true) => useQuery({ queryKey: ['utility', 'readings', params], queryFn: () => api.list('/utility-logs/readings', params), placeholderData: (p) => p, enabled });
export const useUtilitySummary = (params, enabled = true) => useQuery({ queryKey: ['utility', 'summary', params], queryFn: () => api.get('/utility-logs/summary', params), enabled });
export const useCreatePoint = (o) => useApiMutation((b) => api.post('/utility-logs/points', b), { ...inv, success: 'Log point added', ...o });
export const useUpdatePoint = (o) => useApiMutation(({ id, ...b }) => api.patch(`/utility-logs/points/${id}`, b), { ...inv, success: 'Saved', ...o });
export const useCreateReading = (o) => useApiMutation((b) => api.post('/utility-logs/readings', b), { ...inv, success: 'Reading saved', ...o });
