import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

export const useBlocks = () => useQuery({ queryKey: ['blocks'], queryFn: () => api.get('/blocks'), staleTime: 60000 });

export const useUnits = (params, options) =>
  useQuery({ queryKey: ['units', params], queryFn: () => api.list('/units', params), placeholderData: (prev) => prev, ...options });

export const useUnit = (id) => useQuery({ queryKey: ['units', 'detail', id], queryFn: () => api.get(`/units/${id}`), enabled: Boolean(id) });

const inv = { invalidate: ['units', 'blocks'] };
export const useCreateBlock = (o) => useApiMutation((b) => api.post('/blocks', b), { ...inv, success: 'Block added', ...o });
export const useDeleteBlock = () => useApiMutation((id) => api.del(`/blocks/${id}`), { ...inv, success: 'Block deleted' });
export const useCreateUnit = (o) => useApiMutation((b) => api.post('/units', b), { ...inv, success: 'Unit added', ...o });
export const useBulkUnits = (o) => useApiMutation((b) => api.post('/units/bulk', b), { ...inv, success: (d) => (d.skipped ? tt('{inserted} units created, {skipped} already existed', { inserted: d.inserted, skipped: d.skipped }) : tt('{inserted} units created', { inserted: d.inserted })), ...o });
export const useUpdateUnit = (o) => useApiMutation(({ id, ...b }) => api.patch(`/units/${id}`, b), { ...inv, success: 'Unit updated', ...o });
export const useDeleteUnit = () => useApiMutation((id) => api.del(`/units/${id}`), { ...inv, success: 'Unit deleted' });
