import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['inventory'] };

export const useItems = (params, enabled = true) => useQuery({ queryKey: ['inventory', 'items', params], queryFn: () => api.list('/inventory/items', params), placeholderData: (p) => p, enabled });
export const useMovements = (params, enabled = true) => useQuery({ queryKey: ['inventory', 'movements', params], queryFn: () => api.list('/inventory/movements', params), placeholderData: (p) => p, enabled });
export const useValuation = (enabled = true) => useQuery({ queryKey: ['inventory', 'valuation'], queryFn: () => api.get('/inventory/valuation'), enabled });
export const useCreateItem = (o) => useApiMutation((b) => api.post('/inventory/items', b), { ...inv, success: 'Item added', ...o });
export const useUpdateItem = (o) => useApiMutation(({ id, ...b }) => api.patch(`/inventory/items/${id}`, b), { ...inv, success: 'Item updated', ...o });
export const useStockIn = (o) => useApiMutation(({ id, ...b }) => api.post(`/inventory/items/${id}/in`, b), { ...inv, success: 'Stock received', ...o });
export const useStockOut = (o) => useApiMutation(({ id, ...b }) => api.post(`/inventory/items/${id}/out`, b), { ...inv, success: (r) => (r.lowStockAlert ? 'Issued · item is now at reorder level' : 'Stock issued'), ...o });
export const useAdjustStock = (o) => useApiMutation(({ id, ...b }) => api.post(`/inventory/items/${id}/adjust`, b), { ...inv, success: 'Stock corrected', ...o });
