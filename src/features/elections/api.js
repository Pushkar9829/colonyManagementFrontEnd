import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

const inv = { invalidate: ['elections', 'notices'] };
const on = (id, path = '') => `/elections/${id}${path}`;

export const useElections = (params) => useQuery({ queryKey: ['elections', 'list', params], queryFn: () => api.list('/elections', params), placeholderData: (p) => p });
export const useElection = (id) => useQuery({ queryKey: ['elections', 'detail', id], queryFn: () => api.get(on(id)), enabled: Boolean(id) });
export const useNominations = (id) => useQuery({ queryKey: ['elections', 'nominations', id], queryFn: () => api.get(on(id, '/nominations')), enabled: Boolean(id) });
export const useCandidates = (id, enabled) => useQuery({ queryKey: ['elections', 'candidates', id], queryFn: () => api.get(on(id, '/candidates')), enabled: Boolean(id) && enabled });
export const useResults = (id, enabled) => useQuery({ queryKey: ['elections', 'results', id], queryFn: () => api.get(on(id, '/results')), enabled: Boolean(id) && enabled });
export const useTurnout = (id, enabled) => useQuery({ queryKey: ['elections', 'turnout', id], queryFn: () => api.get(on(id, '/turnout')), enabled: Boolean(id) && enabled });

export const useCreateElection = (o) => useApiMutation((b) => api.post('/elections', b), { ...inv, success: 'Election created', ...o });
export const useTransition = () => useApiMutation(({ id, action, note }) => api.post(on(id, `/transition/${action}`), { note }), { ...inv, success: 'Election updated' });
export const usePublish = () => useApiMutation((id) => api.post(on(id, '/publish')), { ...inv, success: 'Results published as a notice' });
export const useResolveTie = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/resolve-tie'), b), { ...inv, success: 'Tie resolved', ...o });
export const useNominate = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/nominations'), b), { ...inv, success: (n) => (n.status === 'accepted' ? 'Nomination filed' : 'Nomination sent to the candidate for acceptance'), ...o });
export const useRespondNomination = () => useApiMutation(({ id, nid, accept }) => api.post(on(id, `/nominations/${nid}/respond`), { accept }), { ...inv, success: 'Response recorded' });
export const useWithdrawNomination = () => useApiMutation(({ id, nid }) => api.post(on(id, `/nominations/${nid}/withdraw`)), { ...inv, success: 'Nomination withdrawn' });
export const useScrutiny = () => useApiMutation(({ id, nid, ...b }) => api.post(on(id, `/nominations/${nid}/scrutiny`), b), { ...inv, success: (n) => (n.status === 'approved' ? 'Nomination approved' : n.status === 'rejected' ? 'Nomination rejected' : tt('Nomination {status}', { status: n.status })) });
export const useVoteCode = () => useApiMutation((id) => api.post(on(id, '/vote-code')), { success: false });
export const useCastVote = (o) => useApiMutation(({ id, ...b }) => api.post(on(id, '/vote'), b), { ...inv, success: 'Your vote has been cast', ...o });
export const verifyTracker = (id, tracker) => api.get(on(id, '/verify'), { tracker });
