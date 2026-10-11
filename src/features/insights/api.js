import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const useHealth = (period) => useQuery({ queryKey: ['insights', 'health', period], queryFn: () => api.get('/insights/health', { period }) });
export const useDefaulterRisk = (params) => useQuery({ queryKey: ['insights', 'risk', params], queryFn: () => api.get('/insights/defaulter-risk', params), placeholderData: (p) => p });
export const useUnitRisk = (unitId) => useQuery({ queryKey: ['insights', 'risk', 'unit', unitId], queryFn: () => api.get(`/insights/defaulter-risk/${unitId}`), enabled: Boolean(unitId) });
export const useNoticeTemplates = () => useQuery({ queryKey: ['insights', 'templates'], queryFn: () => api.get('/insights/notice-templates'), staleTime: Infinity });
export const useRenderTemplate = () => useApiMutation(({ key, values }) => api.post(`/insights/notice-templates/${key}`, { values }), { success: false });
// Other screens (e.g. the complaint form) can call this to pre-select a category.
export const useSuggestCategory = () => useApiMutation((body) => api.post('/insights/complaint-category', body), { success: false, toastErrors: false });
