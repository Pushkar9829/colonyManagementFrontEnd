import { useQuery } from '@tanstack/react-query';
import { api, request, upload } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const put = (path, body) => request('PUT', path, { body }).then((j) => j.data);

// Delivery. Keyed by membership so switching homes / roles fetches that context's ads.
export const useActiveAds = (key, options) => useQuery({ queryKey: ['ads', 'active', key], queryFn: () => api.get('/ads/active'), staleTime: 5 * 60000, retry: false, ...options });
// Counters never block the UI.
export const sendAdEvent = (id, type, placement) => api.post(`/ads/${id}/${type}`, { placement }).catch(() => {});

// Management: scope is 'society' (admin / facility manager) or 'platform' (ads.manage).
const inv = { invalidate: ['ads'] };
export const useAds = (scope, params) => useQuery({ queryKey: ['ads', scope, 'list', params], queryFn: () => api.list(`/ads/${scope}`, params) });
export const useAdStats = (scope, id) => useQuery({ queryKey: ['ads', scope, 'stats', id], queryFn: () => api.get(`/ads/${scope}/${id}/stats`), enabled: Boolean(id) });
export const useSaveAd = (scope, o) =>
  useApiMutation(({ id, ...body }) => (id ? api.patch(`/ads/${scope}/${id}`, body) : api.post(`/ads/${scope}`, body)), { ...inv, success: (_d, v) => (v.id ? 'Ad saved' : 'Ad created'), ...o });
export const useDeleteAd = (scope, o) => useApiMutation((id) => api.del(`/ads/${scope}/${id}`), { ...inv, success: 'Ad deleted', ...o });
export const uploadAdMedia = (scope, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return upload(`/ads/${scope}/media`, fd);
};

export const useSocietyAdSettings = () => useQuery({ queryKey: ['ads', 'society', 'settings'], queryFn: () => api.get('/ads/society/settings') });
export const usePlatformAdSocieties = (params, options) => useQuery({ queryKey: ['ads', 'platform', 'societies', params], queryFn: () => api.list('/ads/platform/societies', params), ...options });
export const useSetSocietyAds = (o) =>
  useApiMutation(({ id, allowSocietyAds }) => put(`/ads/platform/societies/${id}/settings`, { allowSocietyAds }), {
    ...inv,
    success: (d) => (d.allowSocietyAds ? 'Society ads allowed' : 'Society ads switched off'),
    ...o,
  });
