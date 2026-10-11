import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['lostFound'] };

export const useLostFound = (params) => useQuery({ queryKey: ['lostFound', 'list', params], queryFn: () => api.list('/lost-found', params), placeholderData: (p) => p });
export const useLostFoundItem = (id) => useQuery({ queryKey: ['lostFound', 'item', id], queryFn: () => api.get(`/lost-found/${id}`), enabled: Boolean(id) });

export const useCreateItem = (o) => useApiMutation((b) => api.post('/lost-found', b), { ...inv, success: 'Posted', ...o });
export const useDeleteItem = (o) => useApiMutation((id) => api.del(`/lost-found/${id}`), { ...inv, success: 'Post deleted', ...o });
export const useItemStatus = () => useApiMutation(({ id, status }) => api.post(`/lost-found/${id}/status`, { status }), { ...inv, success: (i) => (i.status === 'open' ? 'Reopened' : 'Post closed') });
export const useClaim = (o) => useApiMutation(({ id, message }) => api.post(`/lost-found/${id}/claims`, { message }), { ...inv, success: 'Sent to the poster', ...o });
export const useWithdrawClaim = () => useApiMutation((id) => api.del(`/lost-found/${id}/claims/mine`), { ...inv, success: 'Claim withdrawn' });
export const useDecideClaim = () =>
  useApiMutation(({ id, claimId, accept }) => api.post(`/lost-found/${id}/claims/${claimId}/${accept ? 'accept' : 'reject'}`), { ...inv, success: (_i, v) => (v.accept ? 'Marked as returned' : 'Claim declined') });
