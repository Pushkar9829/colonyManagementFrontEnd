import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const CATEGORIES = ['billing', 'technical', 'account', 'feature_request', 'data', 'training', 'other'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];

const inv = { invalidate: ['support'] };

// society side
export const useTickets = (params) => useQuery({ queryKey: ['support', 'tickets', params], queryFn: () => api.list('/support/tickets', params), placeholderData: (p) => p });
export const useTicket = (id) => useQuery({ queryKey: ['support', 'ticket', id], queryFn: () => api.get(`/support/tickets/${id}`), enabled: Boolean(id) });
export const useCreateTicket = (o) => useApiMutation((b) => api.post('/support/tickets', b), { ...inv, success: (t) => `Ticket ${t.number} sent to ColonyHub support`, ...o });
export const useReplyTicket = (id) => useApiMutation((b) => api.post(`/support/tickets/${id}/messages`, b), { ...inv, success: 'Reply sent' });
export const useCloseTicket = (id) => useApiMutation((b) => api.post(`/support/tickets/${id}/close`, b), { ...inv, success: 'Ticket closed' });
export const useReopenTicket = (id) => useApiMutation((b) => api.post(`/support/tickets/${id}/reopen`, b), { ...inv, success: 'Ticket reopened' });

// platform console
export const usePlatformTickets = (params) =>
  useQuery({ queryKey: ['support', 'platform', params], queryFn: () => api.list('/platform/support/tickets', params), placeholderData: (p) => p, refetchInterval: 60000 });
export const usePlatformTicket = (id) => useQuery({ queryKey: ['support', 'platform', 'ticket', id], queryFn: () => api.get(`/platform/support/tickets/${id}`), enabled: Boolean(id) });
export const useSupportStats = () => useQuery({ queryKey: ['support', 'platform', 'stats'], queryFn: () => api.get('/platform/support/stats'), refetchInterval: 60000 });
export const usePlatformReply = (id) => useApiMutation((b) => api.post(`/platform/support/tickets/${id}/messages`, b), { ...inv, success: 'Reply sent to the society' });
export const usePlatformStatus = (id) => useApiMutation((b) => api.post(`/platform/support/tickets/${id}/status`, b), { ...inv, success: 'Status updated' });
export const useAssignTicket = (id) => useApiMutation((b) => api.post(`/platform/support/tickets/${id}/assign`, b), { ...inv, success: 'Assigned' });
