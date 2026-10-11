import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['committee', 'governance'] };

// { canManage, isAdmin, positions } — admins and sitting office-bearers manage governance.
export const useGovernance = () => useQuery({ queryKey: ['governance', 'me'], queryFn: () => api.get('/committee/me'), staleTime: 60000 });
export const useCurrentCommittee = () => useQuery({ queryKey: ['committee', 'current'], queryFn: () => api.get('/committee/current') });
export const useCommitteeTerms = () => useQuery({ queryKey: ['committee', 'terms'], queryFn: () => api.get('/committee/terms') });

// Active members for pickers (admin-only endpoint).
export const useMemberOptions = (enabled, params = {}) =>
  useQuery({
    queryKey: ['users', 'options', params],
    queryFn: () => api.get('/users', { status: 'active', limit: 100, ...params }),
    enabled,
    staleTime: 60000,
  });

export const useCreateTerm = (o) => useApiMutation((b) => api.post('/committee/terms', b), { ...inv, success: 'Committee term created', ...o });
export const useUpdateTerm = (o) => useApiMutation(({ id, ...b }) => api.patch(`/committee/terms/${id}`, b), { ...inv, success: 'Saved', ...o });
export const useActivateTerm = () => useApiMutation((id) => api.post(`/committee/terms/${id}/activate`), { ...inv, success: 'Committee seated' });
export const useDissolveTerm = () => useApiMutation((id) => api.post(`/committee/terms/${id}/dissolve`), { ...inv, success: 'Committee dissolved' });
export const useAddPosition = (o) => useApiMutation(({ id, ...b }) => api.post(`/committee/terms/${id}/positions`, b), { ...inv, success: 'Position added', ...o });
export const useUpdatePosition = () => useApiMutation(({ id, positionId, ...b }) => api.patch(`/committee/terms/${id}/positions/${positionId}`, b), { ...inv, success: 'Saved' });
export const useEndPosition = () => useApiMutation(({ id, positionId, ...b }) => api.post(`/committee/terms/${id}/positions/${positionId}/end`, b), { ...inv, success: 'Position ended' });
export const useRemovePosition = () => useApiMutation(({ id, positionId }) => api.del(`/committee/terms/${id}/positions/${positionId}`), { ...inv, success: 'Removed' });
