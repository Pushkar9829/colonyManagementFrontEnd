import { useQuery } from '@tanstack/react-query';
import { api, request } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const put = (path, body) => request('PUT', path, { body }).then((j) => j.data);

export const useMyPersonalDetails = () => useQuery({ queryKey: ['people', 'me'], queryFn: () => api.get('/people/me') });
export const useSaveMyPersonalDetails = (o) => useApiMutation((b) => put('/people/me', b), { invalidate: ['people', 'directory'], success: 'Personal details saved', ...o });

// Society admin
export const useUnitPeople = (unitId) => useQuery({ queryKey: ['people', 'unit', unitId], queryFn: () => api.get(`/people/units/${unitId}`), enabled: Boolean(unitId) });
export const useSaveUserPersonalDetails = (o) =>
  useApiMutation(({ userId, ...b }) => put(`/people/users/${userId}`, b), { invalidate: ['people', 'celebrations'], success: 'Details saved', ...o });
export const useSaveFamilyPersonalDetails = (o) =>
  useApiMutation(({ unitId, memberId, ...b }) => put(`/people/units/${unitId}/family/${memberId}`, b), { invalidate: ['people', 'household', 'celebrations'], success: 'Details saved', ...o });
