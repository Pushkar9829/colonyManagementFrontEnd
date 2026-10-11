import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['tenancies', 'units'] };

export const useLeases = (params, options) =>
  useQuery({ queryKey: ['tenancies', params], queryFn: () => api.list('/tenancies', params), placeholderData: (p) => p, ...options });
export const useUnitLeaseHistory = (unitId) =>
  useQuery({ queryKey: ['tenancies', 'history', unitId], queryFn: () => api.get(`/tenancies/units/${unitId}/history`), enabled: Boolean(unitId) });

export const useCreateLease = (o) => useApiMutation((b) => api.post('/tenancies', b), { ...inv, success: 'Lease recorded', ...o });
export const useUpdateLease = (o) => useApiMutation(({ id, ...b }) => api.patch(`/tenancies/${id}`, b), { ...inv, success: 'Lease updated', ...o });
export const useLeaseDocuments = (o) => useApiMutation(({ id, ...b }) => api.post(`/tenancies/${id}/documents`, b), { ...inv, success: 'Documents added', ...o });
export const useEndLease = (o) => useApiMutation(({ id, ...b }) => api.post(`/tenancies/${id}/end`, b), { ...inv, invalidate: ['tenancies', 'units', 'users'], success: 'Lease ended', ...o });

// Residents of a unit (to pick the tenant when recording a lease).
export const useUnitResidents = (unitId) =>
  useQuery({ queryKey: ['users', 'unit', unitId], queryFn: () => api.get('/users', { unit: unitId, role: 'resident', limit: 50 }), enabled: Boolean(unitId) });
export const useUnitOptions = () => useQuery({ queryKey: ['units', 'options'], queryFn: () => api.get('/units', { limit: 100 }), staleTime: 60000 });

export const POLICE_STATUS = ['not_submitted', 'submitted', 'verified', 'rejected'];
