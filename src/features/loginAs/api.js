import { useQuery } from '@tanstack/react-query';
import { api, request } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const put = (path, body) => request('PUT', path, { body }).then((j) => j.data);

// Society side
export const useLoginAsRules = (options) => useQuery({ queryKey: ['loginAs', 'rules'], queryFn: () => api.get('/login-as/rules'), staleTime: 5 * 60000, ...options });
export const useSocietyLoginAsSessions = (params) => useQuery({ queryKey: ['loginAs', 'sessions', params], queryFn: () => api.list('/login-as/sessions', params) });
export const useMyLoginAsActivity = () => useQuery({ queryKey: ['loginAs', 'me'], queryFn: () => api.get('/login-as/me/activity') });
// While acting: is the session still open? (401 once it has ended on the server.)
export const useActingCheck = (enabled) =>
  useQuery({ queryKey: ['loginAs', 'current'], queryFn: () => api.get('/login-as/current'), enabled, refetchInterval: 60000, retry: false });

// Platform console
const inv = { invalidate: ['loginAs'] };
export const usePlatformLoginAsPolicy = (options) => useQuery({ queryKey: ['loginAs', 'platform', 'policy'], queryFn: () => api.get('/login-as/platform/policy'), ...options });
export const useSetPlatformLoginAsPolicy = (o) => useApiMutation((b) => put('/login-as/platform/policy', b), { ...inv, success: 'Saved', ...o });
export const useSocietyLoginAsPolicy = (id, options) =>
  useQuery({ queryKey: ['loginAs', 'platform', 'society', id], queryFn: () => api.get(`/login-as/platform/societies/${id}/policy`), enabled: Boolean(id), ...options });
export const useSetSocietyLoginAsPolicy = (o) => useApiMutation(({ id, ...b }) => put(`/login-as/platform/societies/${id}/policy`, b), { ...inv, success: 'Saved', ...o });
export const usePlatformLoginAsSessions = (params, options) => useQuery({ queryKey: ['loginAs', 'platform', 'sessions', params], queryFn: () => api.list('/login-as/platform/sessions', params), ...options });
export const usePlatformSocietyMembers = (id, params, options) =>
  useQuery({ queryKey: ['loginAs', 'platform', 'members', id, params], queryFn: () => api.list(`/login-as/platform/societies/${id}/members`, params), enabled: Boolean(id), ...options });
