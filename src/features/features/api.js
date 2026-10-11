import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useApiMutation } from '../../hooks/useApiMutation';

// Which switchable modules the open society can use. Other features can hide UI with:
//   const { isEnabled } = useFeatures(); if (!isEnabled('parking')) ...
export function useFeatures() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['features', user?.membershipId], queryFn: () => api.get('/features'), enabled: Boolean(user?.society), staleTime: 5 * 60 * 1000 });
  const enabled = new Set(q.data?.enabled || []);
  return { ...q, isEnabled: (key) => enabled.has(key) };
}

// platform console
export const useFeatureCatalogue = () => useQuery({ queryKey: ['platform', 'features', 'catalogue'], queryFn: () => api.get('/platform/features/catalogue'), staleTime: Infinity });
export const useSocietyFeatures = (id) => useQuery({ queryKey: ['platform', 'features', id], queryFn: () => api.get(`/platform/societies/${id}/features`), enabled: Boolean(id) });
export const useSetSocietyFeatures = (id) => useApiMutation((b) => api.put(`/platform/societies/${id}/features`, b), { invalidate: [['platform', 'features', id]], success: 'Features updated' });
