import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const usePlatformStats = () => useQuery({ queryKey: ['platform', 'stats'], queryFn: () => api.get('/platform/stats') });
export const usePlatformSocieties = (params) =>
  useQuery({ queryKey: ['platform', 'societies', params], queryFn: () => api.list('/platform/societies', params), placeholderData: (p) => p });
export const usePlatformSociety = (id) => useQuery({ queryKey: ['platform', 'society', id], queryFn: () => api.get(`/platform/societies/${id}`), enabled: Boolean(id) });
export const usePlatformJobs = (enabled = true) => useQuery({ queryKey: ['platform', 'jobs'], queryFn: () => api.get('/platform/jobs'), refetchInterval: 60000, enabled });export const useUpdatePlatformSociety = (o) =>
  useApiMutation(({ id, ...b }) => api.patch(`/platform/societies/${id}`, b), { invalidate: ['platform'], success: 'Society updated', ...o });

export const PLANS = [
  { value: 'trial', label: 'Trial · everything on until the end date' },
  { value: 'free', label: 'Free · 50 units' },
  { value: 'basic', label: 'Basic · 200 units' },
  { value: 'standard', label: 'Standard · 1000 units' },
  { value: 'premium', label: 'Premium · unlimited' },
];
