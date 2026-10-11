import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['meetings'] };
const on = (id, path = '') => `/meetings/${id}${path}`;

export const useMeetings = (params) => useQuery({ queryKey: ['meetings', 'list', params], queryFn: () => api.list('/meetings', params), placeholderData: (p) => p });
export const useMeeting = (id) => useQuery({ queryKey: ['meetings', 'detail', id], queryFn: () => api.get(on(id)), enabled: Boolean(id) });
export const useInvitees = (id, enabled) => useQuery({ queryKey: ['meetings', 'invitees', id], queryFn: () => api.get(on(id, '/invitees')), enabled: Boolean(id) && enabled });
export const useActionItems = (params) => useQuery({ queryKey: ['meetings', 'action-items', params], queryFn: () => api.get('/meetings/action-items', params) });

export const useCreateMeeting = (o) => useApiMutation((b) => api.post('/meetings', b), { ...inv, success: 'Meeting created', ...o });
export const useUpdateMeeting = (o) => useApiMutation(({ id, ...b }) => api.patch(on(id), b), { ...inv, success: 'Saved', ...o });
export const useSendNotice = () => useApiMutation((id) => api.post(on(id, '/notice')), { ...inv, success: (m) => `Notice sent to ${m.notice.recipients} member(s)` });
export const useCancelMeeting = () => useApiMutation(({ id, reason }) => api.post(on(id, '/cancel'), { reason }), { ...inv, success: 'Meeting cancelled' });
export const useAddAgendaItem = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/agenda'), b), { ...inv, success: 'Agenda item added', ...o });
export const useUpdateAgendaItem = (o) => useApiMutation(({ id, itemId, ...b }) => api.patch(on(id, `/agenda/${itemId}`), b), { ...inv, success: 'Saved', ...o });
export const useRemoveAgendaItem = () => useApiMutation(({ id, itemId }) => api.del(on(id, `/agenda/${itemId}`)), { ...inv, success: 'Removed' });
export const useUpdateMinutes = (o) => useApiMutation(({ id, summary }) => api.patch(on(id, '/minutes'), { summary }), { ...inv, success: 'Saved', ...o });
export const useApproveMinutes = () => useApiMutation((id) => api.post(on(id, '/minutes/approve')), { ...inv, success: 'Minutes approved' });
export const useMarkAttendance = () => useApiMutation(({ id, entries }) => api.post(on(id, '/attendance'), { entries }), { ...inv, success: false });
export const useRemoveAttendance = () => useApiMutation(({ id, membershipId }) => api.del(on(id, `/attendance/${membershipId}`)), { ...inv, success: false });
export const useAddResolution = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/resolutions'), b), { ...inv, success: 'Resolution recorded', ...o });
export const useRemoveResolution = () => useApiMutation(({ id, resolutionId }) => api.del(on(id, `/resolutions/${resolutionId}`)), { ...inv, success: 'Removed' });
export const useAddActionItem = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/action-items'), b), { ...inv, success: 'Action item added', ...o });
export const useUpdateActionItem = () => useApiMutation(({ id, actionId, ...b }) => api.patch(on(id, `/action-items/${actionId}`), b), { ...inv, success: 'Updated' });
export const useRemoveActionItem = () => useApiMutation(({ id, actionId }) => api.del(on(id, `/action-items/${actionId}`)), { ...inv, success: 'Removed' });
export const useAddAttachments = (o) => useApiMutation(({ id, uploads }) => api.post(on(id, '/attachments'), { uploads }), { ...inv, success: 'Attached', ...o });
export const useRemoveAttachment = () => useApiMutation(({ id, attachmentId }) => api.del(on(id, `/attachments/${attachmentId}`)), { ...inv, success: 'Removed' });
