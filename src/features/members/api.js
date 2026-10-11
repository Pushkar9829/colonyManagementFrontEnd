import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['users', 'units', 'dashboard'] };

export const useMembers = (params) => useQuery({ queryKey: ['users', params], queryFn: () => api.list('/users', params), placeholderData: (p) => p });
export const useCreateMember = (o) => useApiMutation((b) => api.post('/users', b), { ...inv, success: 'Member added', ...o });
export const useUpdateMember = (o) => useApiMutation(({ id, ...b }) => api.patch(`/users/${id}`, b), { ...inv, success: 'Member updated', ...o });
export const useApproveMember = () => useApiMutation((id) => api.post(`/users/${id}/approve`), { ...inv, success: 'Request approved' });
export const useRejectMember = () => useApiMutation((id) => api.post(`/users/${id}/reject`), { ...inv, success: 'Request rejected' });
export const useResetPassword = () => useApiMutation(({ id, password }) => api.post(`/users/${id}/reset-password`, { password }), { success: 'Password reset' });
