import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const ppm = { invalidate: ['ppm', 'assets'] };
const bd = { invalidate: ['breakdowns', 'assets', 'ppm'] };
const wo = { invalidate: ['workOrders', 'assets', 'breakdowns'] };
const hk = { invalidate: ['checklists'] };

export const useMaintenanceStats = () => useQuery({ queryKey: ['ppm', 'stats'], queryFn: () => api.get('/maintenance/stats') });

// PPM schedules & tasks
export const useSchedules = (params, enabled = true) => useQuery({ queryKey: ['ppm', 'schedules', params], queryFn: () => api.list('/maintenance/schedules', params), placeholderData: (p) => p, enabled });
export const useCreateSchedule = (o) => useApiMutation((b) => api.post('/maintenance/schedules', b), { ...ppm, success: (s) => `Schedule saved · ${s.tasksCreated} task(s) planned`, ...o });
export const useUpdateSchedule = (o) => useApiMutation(({ id, ...b }) => api.patch(`/maintenance/schedules/${id}`, b), { ...ppm, success: 'Schedule updated', ...o });
export const useTasks = (params, enabled = true) => useQuery({ queryKey: ['ppm', 'tasks', params], queryFn: () => api.list('/maintenance/tasks', params), placeholderData: (p) => p, enabled });
export const useTask = (id) => useQuery({ queryKey: ['ppm', 'task', id], queryFn: () => api.get(`/maintenance/tasks/${id}`), enabled: Boolean(id) });
export const useCompleteTask = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/tasks/${id}/complete`, b), { ...ppm, invalidate: ['ppm', 'assets', 'breakdowns'], success: 'Task completed', ...o });
export const useSkipTask = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/tasks/${id}/skip`, b), { ...ppm, success: 'Task skipped', ...o });
export const useAssignTask = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/tasks/${id}/assign`, b), { ...ppm, success: 'Task reassigned', ...o });
export const usePpmReport = (params, enabled = true) => useQuery({ queryKey: ['ppm', 'report', params], queryFn: () => api.get('/maintenance/reports/ppm', params), enabled });

// breakdowns
export const useBreakdowns = (params, enabled = true) => useQuery({ queryKey: ['breakdowns', params], queryFn: () => api.list('/maintenance/breakdowns', params), placeholderData: (p) => p, enabled });
export const useBreakdown = (id) => useQuery({ queryKey: ['breakdowns', 'detail', id], queryFn: () => api.get(`/maintenance/breakdowns/${id}`), enabled: Boolean(id) });
export const useCreateBreakdown = (o) => useApiMutation((b) => api.post('/maintenance/breakdowns', b), { ...bd, success: (b) => `Breakdown ${b.number} reported`, ...o });
export const useAssignBreakdown = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/breakdowns/${id}/assign`, b), { ...bd, success: 'Assigned', ...o });
export const useBreakdownStatus = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/breakdowns/${id}/status`, b), { ...bd, success: 'Updated', ...o });

// work orders
export const useWorkOrders = (params, enabled = true) => useQuery({ queryKey: ['workOrders', params], queryFn: () => api.list('/work-orders', params), placeholderData: (p) => p, enabled });
export const useWorkOrder = (id) => useQuery({ queryKey: ['workOrders', 'detail', id], queryFn: () => api.get(`/work-orders/${id}`), enabled: Boolean(id) });
export const useWorkOrderStats = (enabled = true) => useQuery({ queryKey: ['workOrders', 'stats'], queryFn: () => api.get('/work-orders/stats'), enabled });
export const useCreateWorkOrder = (o) => useApiMutation((b) => api.post('/work-orders', b), { ...wo, success: (w) => `Work order ${w.number} created`, ...o });
export const useUpdateWorkOrder = (o) => useApiMutation(({ id, ...b }) => api.patch(`/work-orders/${id}`, b), { ...wo, success: 'Saved', ...o });
export const useWorkOrderStatus = (o) => useApiMutation(({ id, ...b }) => api.post(`/work-orders/${id}/status`, b), { ...wo, success: 'Updated', ...o });

// housekeeping checklists
export const useChecklists = (enabled = true) => useQuery({ queryKey: ['checklists', 'templates'], queryFn: () => api.get('/maintenance/checklists'), enabled });
export const useCreateChecklist = (o) => useApiMutation((b) => api.post('/maintenance/checklists', b), { ...hk, success: 'Checklist created', ...o });
export const useUpdateChecklist = (o) => useApiMutation(({ id, ...b }) => api.patch(`/maintenance/checklists/${id}`, b), { ...hk, success: 'Checklist updated', ...o });
export const useRuns = (params, enabled = true) => useQuery({ queryKey: ['checklists', 'runs', params], queryFn: () => api.list('/maintenance/checklist-runs', params), placeholderData: (p) => p, enabled });
export const useCompleteRun = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/checklist-runs/${id}/complete`, b), { ...hk, success: 'Checklist submitted', ...o });
export const useVerifyRun = (o) => useApiMutation(({ id, ...b }) => api.post(`/maintenance/checklist-runs/${id}/verify`, b), { ...hk, success: (r) => (r.status === 'verified' ? 'Verified' : 'Sent back for redo'), ...o });
export const useRunReport = (params, enabled = true) => useQuery({ queryKey: ['checklists', 'report', params], queryFn: () => api.get('/maintenance/checklist-runs/report', params), enabled });
