import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { fillVars } from './lib';

// Platform team: permission catalogue, roles, members and the activity log.
export const usePermissionCatalogue = () => useQuery({ queryKey: ['platform', 'permissions'], queryFn: () => api.get('/platform/permissions'), staleTime: Infinity });
export const usePlatformRoles = (enabled = true) => useQuery({ queryKey: ['platform', 'roles'], queryFn: () => api.get('/platform/roles'), enabled });

const TEAM = [['platform', 'roles'], ['platform', 'team'], ['platform', 'activity']];
export const useCreateRole = (o) => useApiMutation((b) => api.post('/platform/roles', b), { invalidate: TEAM, success: (r, _v, t = fillVars) => t('Role “{name}” created', { name: r.name }), ...o });
export const useUpdateRole = (o) => useApiMutation(({ id, ...b }) => api.patch(`/platform/roles/${id}`, b), { invalidate: TEAM, success: 'Role saved', ...o });
export const useDeleteRole = (o) => useApiMutation((id) => api.del(`/platform/roles/${id}`), { invalidate: TEAM, success: 'Role deleted', ...o });

export const usePlatformTeam = (params) =>
  useQuery({ queryKey: ['platform', 'team', params], queryFn: () => api.list('/platform/team', params), placeholderData: (p) => p });
export const useInviteMember = (o) => useApiMutation((b) => api.post('/platform/team', b), { invalidate: TEAM, success: (r) => (r.existingAccount ? 'Added to the team' : 'Invitation sent'), ...o });
export const useChangeMemberRole = (o) => useApiMutation(({ id, roleId }) => api.patch(`/platform/team/${id}`, { roleId }), { invalidate: TEAM, success: 'Role changed', ...o });
export const useSetMemberActive = (o) =>
  useApiMutation(({ id, active }) => api.post(`/platform/team/${id}/${active ? 'reactivate' : 'deactivate'}`), { invalidate: TEAM, success: (_r, v) => (v.active ? 'Access restored' : 'Access switched off'), ...o });
export const useRemoveMember = (o) => useApiMutation((id) => api.del(`/platform/team/${id}`), { invalidate: TEAM, success: 'Removed from the platform team', ...o });

export const usePlatformActivity = (params) =>
  useQuery({ queryKey: ['platform', 'activity', params], queryFn: () => api.list('/platform/activity', params), placeholderData: (p) => p });
export const useActivityActors = () => useQuery({ queryKey: ['platform', 'activity', 'actors'], queryFn: () => api.get('/platform/activity/actors') });
