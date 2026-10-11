import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const SNAG_CATEGORIES = ['civil', 'plumbing', 'electrical', 'carpentry', 'painting', 'flooring', 'windows_doors', 'fixtures', 'waterproofing', 'other'];
export const HANDOVER_CATEGORIES = ['documents', 'funds', 'assets', 'other'];

const inv = { invalidate: ['builder'] };
// FEATURE_DISABLED (402) is an expected answer, not something to retry.
const noRetry = { retry: (n, err) => err?.status !== 402 && n < 2 };

export const usePossessions = (params) => useQuery({ queryKey: ['builder', 'possessions', params], queryFn: () => api.list('/builder/possessions', params), placeholderData: (p) => p, ...noRetry });
export const useSchedulePossession = (o) => useApiMutation((b) => api.post('/builder/possessions', b), { ...inv, success: 'Possession scheduled', ...o });
export const useUpdatePossession = () => useApiMutation(({ id, ...b }) => api.patch(`/builder/possessions/${id}`, b), { ...inv, success: false });
export const useCompletePossession = (o) => useApiMutation(({ id, ...b }) => api.post(`/builder/possessions/${id}/complete`, b), { ...inv, success: 'Possession completed', ...o });
export const useCancelPossession = (o) => useApiMutation(({ id, reason }) => api.post(`/builder/possessions/${id}/cancel`, { reason }), { ...inv, success: 'Appointment cancelled', ...o });

export const useSnags = (params) => useQuery({ queryKey: ['builder', 'snags', params], queryFn: () => api.list('/builder/snags', params), placeholderData: (p) => p, ...noRetry });
export const useSnagSummary = () => useQuery({ queryKey: ['builder', 'snags', 'summary'], queryFn: () => api.get('/builder/snags/summary'), ...noRetry });
export const useSnag = (id) => useQuery({ queryKey: ['builder', 'snag', id], queryFn: () => api.get(`/builder/snags/${id}`), enabled: Boolean(id) });
export const useCreateSnag = (o) => useApiMutation((b) => api.post('/builder/snags', b), { ...inv, success: (s) => `Snag ${s.number} recorded`, ...o });
export const useUpdateSnag = (id) => useApiMutation((b) => api.patch(`/builder/snags/${id}`, b), { ...inv, success: 'Snag updated' });
export const useSignOffSnag = (id) => useApiMutation((b) => api.post(`/builder/snags/${id}/sign-off`, b), { ...inv, success: 'Signed off' });
export const useReopenSnag = (id) => useApiMutation((b) => api.post(`/builder/snags/${id}/reopen`, b), { ...inv, success: 'Snag reopened' });

export const useProgress = (params) => useQuery({ queryKey: ['builder', 'progress', params], queryFn: () => api.list('/builder/progress', params), placeholderData: (p) => p, ...noRetry });
export const usePostProgress = (o) => useApiMutation((b) => api.post('/builder/progress', b), { ...inv, success: 'Update posted for buyers', ...o });
export const useDeleteProgress = () => useApiMutation((id) => api.del(`/builder/progress/${id}`), { ...inv, success: 'Update removed' });

export const useHandover = (enabled = true) => useQuery({ queryKey: ['builder', 'handover'], queryFn: () => api.get('/builder/handover'), enabled, ...noRetry });
export const useAddHandoverItem = (o) => useApiMutation((b) => api.post('/builder/handover/items', b), { ...inv, success: 'Item added', ...o });
export const useUpdateHandoverItem = () => useApiMutation(({ id, ...b }) => api.patch(`/builder/handover/items/${id}`, b), { ...inv, success: false });
export const useRemoveHandoverItem = () => useApiMutation((id) => api.del(`/builder/handover/items/${id}`), { ...inv, success: 'Item removed' });
export const useSignHandover = () => useApiMutation((b) => api.post('/builder/handover/sign', b), { ...inv, success: 'Signed' });
