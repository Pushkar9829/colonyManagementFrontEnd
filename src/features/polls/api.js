import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const usePolls = (params) => useQuery({ queryKey: ['polls', params], queryFn: () => api.list('/polls', params), placeholderData: (p) => p });
export const usePollVoters = (id) => useQuery({ queryKey: ['polls', 'voters', id], queryFn: () => api.get(`/polls/${id}/voters`), enabled: Boolean(id) });
export const useCreatePoll = (o) => useApiMutation((b) => api.post('/polls', b), { invalidate: ['polls'], success: 'Poll published', ...o });
export const useVote = () => useApiMutation(({ id, optionIndex }) => api.post(`/polls/${id}/vote`, { optionIndex }), { invalidate: ['polls', 'dashboard'], success: 'Vote recorded' });
export const useClosePoll = () => useApiMutation((id) => api.post(`/polls/${id}/close`), { invalidate: ['polls'], success: 'Poll closed' });
