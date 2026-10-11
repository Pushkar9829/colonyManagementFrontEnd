import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['chat'] };

export const useConversations = (params, options) => useQuery({ queryKey: ['chat', 'conversations', params], queryFn: () => api.list('/chat/conversations', params), placeholderData: (p) => p, ...options });
export const useConversation = (id) => useQuery({ queryKey: ['chat', 'conversation', id], queryFn: () => api.get(`/chat/conversations/${id}`), enabled: Boolean(id) });
export const useUnreadChats = (options) => useQuery({ queryKey: ['chat', 'unread'], queryFn: () => api.get('/chat/unread'), ...options });
export const useChatContacts = (search, enabled = true) => useQuery({ queryKey: ['chat', 'contacts', search], queryFn: () => api.get('/chat/contacts', { search }), enabled, staleTime: 30000 });
export const useChatBlocks = (enabled) => useQuery({ queryKey: ['chat', 'blocks'], queryFn: () => api.get('/chat/blocks'), enabled });

// Newest page first; each older page is fetched with ?before=<oldest loaded createdAt>.
export const useMessages = (id) =>
  useInfiniteQuery({
    queryKey: ['chat', 'messages', id],
    queryFn: ({ pageParam }) => api.list(`/chat/conversations/${id}/messages`, { before: pageParam, limit: 40 }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.meta?.hasMore && last.data.length ? last.data[0].createdAt : undefined),
    enabled: Boolean(id),
  });

export const useOpenDirect = (o) => useApiMutation((userId) => api.post('/chat/conversations', { userId }), { ...inv, ...o });
export const useOpenDesk = (o) => useApiMutation((b) => api.post('/chat/desk', b), { ...inv, ...o });
export const useSendMessage = (o) => useApiMutation(({ id, ...b }) => api.post(`/chat/conversations/${id}/messages`, b), { ...o });
export const useMarkChatRead = () => useApiMutation((id) => api.post(`/chat/conversations/${id}/read`), { invalidate: [['chat', 'conversations'], ['chat', 'unread']], toastErrors: false });
export const useBlockUser = (o) => useApiMutation((userId) => api.post('/chat/blocks', { userId }), { ...inv, success: 'Blocked. They can no longer message you.', ...o });
export const useUnblockUser = (o) => useApiMutation((userId) => api.del(`/chat/blocks/${userId}`), { ...inv, success: 'Unblocked', ...o });

export const sendTyping = (id) => api.post(`/chat/conversations/${id}/typing`).catch(() => {});
