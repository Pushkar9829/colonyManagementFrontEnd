import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['forum'] };

export const useForumCategories = (params) => useQuery({ queryKey: ['forum', 'categories', params], queryFn: () => api.get('/forum/categories', params), staleTime: 60000 });
export const useTopics = (params) => useQuery({ queryKey: ['forum', 'topics', params], queryFn: () => api.list('/forum/topics', params), placeholderData: (p) => p });
export const useTopic = (id, page) => useQuery({ queryKey: ['forum', 'topic', id, page], queryFn: () => api.get(`/forum/topics/${id}`, { page }), enabled: Boolean(id), placeholderData: (p) => p });
export const useForumReports = (enabled, params) => useQuery({ queryKey: ['forum', 'reports', params], queryFn: () => api.list('/forum/reports', params), enabled });
export const useMentionable = (topic, search, enabled) =>
  useQuery({ queryKey: ['forum', 'mentionable', topic, search], queryFn: () => api.get('/forum/mentionable', { topic, search }), enabled, staleTime: 30000 });

export const useCreateCategory = (o) => useApiMutation((b) => api.post('/forum/categories', b), { ...inv, success: 'Category added', ...o });
export const useUpdateCategory = () => useApiMutation(({ id, ...b }) => api.patch(`/forum/categories/${id}`, b), { ...inv, success: 'Category updated' });
export const useCreateTopic = (o) => useApiMutation((b) => api.post('/forum/topics', b), { ...inv, success: 'Topic posted', ...o });
export const useUpdateTopic = (o) => useApiMutation(({ id, ...b }) => api.patch(`/forum/topics/${id}`, b), { ...inv, success: 'Topic updated', ...o });
export const useDeleteTopic = (o) => useApiMutation((id) => api.del(`/forum/topics/${id}`), { ...inv, success: 'Topic removed', ...o });
export const useLikeTopic = () => useApiMutation((id) => api.post(`/forum/topics/${id}/like`), inv);
export const useResolveTopic = () => useApiMutation(({ id, resolved }) => api.post(`/forum/topics/${id}/resolve`, { resolved }), { ...inv, success: (t) => (t.resolved ? 'Marked as resolved' : 'Marked as open') });
export const usePinTopic = () => useApiMutation(({ id, value }) => api.post(`/forum/topics/${id}/pin`, { value }), { ...inv, success: (t) => (t.pinned ? 'Pinned' : 'Unpinned') });
export const useLockTopic = () => useApiMutation(({ id, value }) => api.post(`/forum/topics/${id}/lock`, { value }), { ...inv, success: (t) => (t.locked ? 'Topic locked' : 'Topic unlocked') });
export const useReply = (o) => useApiMutation(({ id, ...b }) => api.post(`/forum/topics/${id}/replies`, b), { ...inv, ...o });
export const useUpdateReply = (o) => useApiMutation(({ id, body }) => api.patch(`/forum/replies/${id}`, { body }), { ...inv, success: 'Reply updated', ...o });
export const useDeleteReply = () => useApiMutation((id) => api.del(`/forum/replies/${id}`), { ...inv, success: 'Reply removed' });
export const useLikeReply = () => useApiMutation((id) => api.post(`/forum/replies/${id}/like`), inv);
export const useReportPost = (o) => useApiMutation((b) => api.post('/forum/reports', b), { ...inv, success: 'Reported to the moderators', ...o });
export const useResolveReports = () => useApiMutation((b) => api.post('/forum/reports/resolve', b), { ...inv, success: (_d, v) => (v.action === 'remove' ? 'Post removed' : 'Reports dismissed') });
