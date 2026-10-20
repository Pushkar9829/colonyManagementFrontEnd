import { useQuery } from '@tanstack/react-query';
import { api, request } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const useTodayBirthdays = () => useQuery({ queryKey: ['celebrations', 'today'], queryFn: () => api.get('/celebrations/today'), staleTime: 30 * 60000 });
export const useUpcomingCelebrations = (days = 30) => useQuery({ queryKey: ['celebrations', 'upcoming', days], queryFn: () => api.get('/celebrations/upcoming', { days }) });
export const useCelebrationSettings = () => useQuery({ queryKey: ['celebrations', 'settings'], queryFn: () => api.get('/celebrations/settings') });
export const useSaveCelebrationSettings = (o) =>
  useApiMutation((b) => request('PUT', '/celebrations/settings', { body: b }).then((j) => j.data), { invalidate: ['celebrations'], success: 'Celebration settings saved', ...o });
export const usePreviewWish = () => useApiMutation((b) => api.post('/celebrations/preview', b), { success: false });
