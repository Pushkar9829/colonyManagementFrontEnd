import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['gates'] };

// Open gates for everyone; management may add { includeInactive: true }.
export const useGates = (params, options) =>
  useQuery({ queryKey: ['gates', 'list', params || {}], queryFn: () => api.get('/gates', params), staleTime: 60000, ...options });

export const useCreateGate = (o) => useApiMutation((b) => api.post('/gates', b), { ...inv, success: (g) => `${g.name} added`, ...o });
export const useUpdateGate = (o) => useApiMutation(({ id, ...b }) => api.patch(`/gates/${id}`, b), { ...inv, success: 'Gate saved', ...o });
export const useReorderGates = (o) => useApiMutation((ids) => api.post('/gates/reorder', { ids }), { ...inv, success: false, ...o });
export const useRemoveGate = (o) =>
  useApiMutation((id) => api.del(`/gates/${id}`), {
    ...inv,
    success: (r) => (r?.deleted === false ? `${r.gate.name} has history, so it was closed instead of deleted` : 'Gate deleted'),
    ...o,
  });

// The signed-in guard's gate (server side, so other devices and the dashboard know it).
export const useMyPost = (options) => useQuery({ queryKey: ['gates', 'my-post'], queryFn: () => api.get('/gates/my-post'), staleTime: 5 * 60000, ...options });
export const useSetPost = (o) => useApiMutation((gateId) => api.put('/gates/my-post', { gateId }), { invalidate: ['dashboard'], success: false, toastErrors: false, ...o });
