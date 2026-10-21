import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

const inv = { invalidate: ['requests'] };
const on = (id, path = '') => `/requests/${id}${path}`;

export const useRequests = (params) => useQuery({ queryKey: ['requests', 'list', params], queryFn: () => api.list('/requests', params), placeholderData: (p) => p });
export const useRequest = (id) => useQuery({ queryKey: ['requests', 'detail', id], queryFn: () => api.get(on(id)), enabled: Boolean(id) });
export const useMoves = (date, enabled = true) => useQuery({ queryKey: ['requests', 'moves', date], queryFn: () => api.get('/requests/moves', { date }), enabled, refetchInterval: 60000 });

export const useCreateRequest = (o) => useApiMutation((b) => api.post('/requests', b), { ...inv, success: (r) => tt('Request {n} submitted', { n: r.number }), ...o });
export const useRequestComment = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/comments'), b), { ...inv, success: false, ...o });
export const useRespondRequest = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/respond'), b), { ...inv, success: 'Sent to the committee', ...o });
export const useCancelRequest = () => useApiMutation((id) => api.post(on(id, '/cancel')), { ...inv, success: 'Request withdrawn' });
export const useRequestInfo = () => useApiMutation(({ id, note }) => api.post(on(id, '/request-info'), { note }), { ...inv, success: 'Asked the resident for more information' });
export const useApproveRequest = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/approve'), b), { ...inv, success: 'Approved — letter issued', toastErrors: false, ...o });
export const useRejectRequest = () => useApiMutation(({ id, reason }) => api.post(on(id, '/reject'), { reason }), { ...inv, success: 'Request rejected' });
