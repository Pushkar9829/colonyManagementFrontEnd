import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['complaints', 'dashboard'] };

export const useComplaints = (params) => useQuery({ queryKey: ['complaints', params], queryFn: () => api.list('/complaints', params), placeholderData: (p) => p });
export const useComplaint = (id) => useQuery({ queryKey: ['complaints', 'detail', id], queryFn: () => api.get(`/complaints/${id}`), enabled: Boolean(id) });
export const useComplaintStats = (enabled) => useQuery({ queryKey: ['complaints', 'stats'], queryFn: () => api.get('/complaints/stats'), enabled });
export const useAssignees = (enabled) =>
  useQuery({
    queryKey: ['users', 'assignees'],
    queryFn: async () => {
      const [staff, fm] = await Promise.all([api.get('/users', { role: 'staff', status: 'active', limit: 100 }), api.get('/users', { role: 'facility_manager', status: 'active', limit: 100 })]);
      return [...staff, ...fm];
    },
    enabled,
    staleTime: 60000,
  });

export const useCreateComplaint = (o) => useApiMutation((b) => api.post('/complaints', b), { ...inv, success: (c) => `Complaint ${c.ticketNumber} raised`, ...o });
export const useAssignComplaint = () => useApiMutation(({ id, assignedTo }) => api.post(`/complaints/${id}/assign`, { assignedTo }), { ...inv, success: 'Assigned' });
export const useComplaintStatus = () => useApiMutation(({ id, ...b }) => api.post(`/complaints/${id}/status`, b), { ...inv, success: 'Status updated' });
export const useComplaintComment = (o) => useApiMutation(({ id, ...b }) => api.post(`/complaints/${id}/comments`, b), { ...inv, ...o });
export const useReopenComplaint = () => useApiMutation(({ id, note }) => api.post(`/complaints/${id}/reopen`, { note }), { ...inv, success: 'Complaint reopened' });
export const useRateComplaint = () => useApiMutation(({ id, ...b }) => api.post(`/complaints/${id}/rate`, b), { ...inv, success: 'Thanks for the feedback' });

// ---------- categories, escalation matrix, reports ----------
export const useCategories = (includeInactive = false) =>
  useQuery({ queryKey: ['complaints', 'categories', includeInactive], queryFn: () => api.get('/complaints/categories', { includeInactive: includeInactive || undefined }), staleTime: 60000 });
export const useCreateCategory = (o) => useApiMutation((b) => api.post('/complaints/categories', b), { invalidate: ['complaints'], success: 'Category added', ...o });
export const useUpdateCategory = (o) => useApiMutation(({ key, ...b }) => api.patch(`/complaints/categories/${key}`, b), { invalidate: ['complaints'], success: 'Category updated', ...o });
export const useEscalationRules = () => useQuery({ queryKey: ['complaints', 'escalation-rules'], queryFn: () => api.get('/complaints/escalation-rules') });
export const useCreateRule = (o) => useApiMutation((b) => api.post('/complaints/escalation-rules', b), { invalidate: ['complaints'], success: 'Escalation rule saved', ...o });
export const useUpdateRule = (o) => useApiMutation(({ id, ...b }) => api.patch(`/complaints/escalation-rules/${id}`, b), { invalidate: ['complaints'], success: 'Escalation rule saved', ...o });
export const useDeleteRule = () => useApiMutation((id) => api.del(`/complaints/escalation-rules/${id}`), { invalidate: ['complaints'], success: 'Rule removed' });
export const useStaffPerformance = (params) =>
  useQuery({ queryKey: ['complaints', 'performance', params], queryFn: () => api.get('/complaints/reports/staff-performance', params), placeholderData: (p) => p });
export const useEscalationUsers = (enabled) =>
  useQuery({
    queryKey: ['users', 'escalation'],
    queryFn: async () => {
      const lists = await Promise.all(['admin', 'facility_manager', 'staff', 'accountant'].map((role) => api.get('/users', { role, status: 'active', limit: 100 })));
      return lists.flat();
    },
    enabled,
    staleTime: 60000,
  });
