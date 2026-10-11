import { useQuery } from '@tanstack/react-query';
import { api, request } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['household'] };

export const useMyHousehold = () => useQuery({ queryKey: ['household', 'me'], queryFn: () => api.get('/household/me') });
export const useUpdateHousehold = (o) => useApiMutation((b) => api.patch('/household/me', b), { ...inv, success: 'Saved', ...o });
export const useSetMyMedical = (o) =>
  useApiMutation((b) => request('PUT', '/household/me/medical', { body: b }).then((j) => j.data), { ...inv, success: 'Medical details saved', ...o });

// list = 'members' | 'pets'
export const useAddHouseholdItem = (list, o) => useApiMutation((b) => api.post(`/household/me/${list}`, b), { ...inv, success: 'Added', ...o });
export const useUpdateHouseholdItem = (list, o) => useApiMutation(({ id, ...b }) => api.patch(`/household/me/${list}/${id}`, b), { ...inv, success: 'Updated', ...o });
export const useRemoveHouseholdItem = (list) => useApiMutation((id) => api.del(`/household/me/${list}/${id}`), { ...inv, success: 'Removed' });

export const useHouseholds = (params) => useQuery({ queryKey: ['household', 'all', params], queryFn: () => api.list('/household', params), placeholderData: (p) => p });
export const useUnitHousehold = (unitId) => useQuery({ queryKey: ['household', 'unit', unitId], queryFn: () => api.get(`/household/units/${unitId}`), enabled: Boolean(unitId) });
export const useSosContext = (sosId) => useQuery({ queryKey: ['household', 'sos', sosId], queryFn: () => api.get(`/household/sos-context/${sosId}`), enabled: Boolean(sosId), retry: false });
export const useOpenSos = () => useQuery({ queryKey: ['sos', 'open-for-context'], queryFn: () => api.list('/sos', { limit: 50 }), refetchInterval: 15000 });
