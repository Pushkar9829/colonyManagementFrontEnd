import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

// First-run checklist for society admins. Keyed under 'society' so saving settings refreshes it too.
export const useSetupStatus = (enabled = true) => useQuery({ queryKey: ['society', 'setup-status'], queryFn: () => api.get('/society/setup-status'), enabled });
export const useDismissSetup = () =>
  useApiMutation(() => api.post('/society/setup-status/dismiss'), { invalidate: [['society', 'setup-status']], success: 'Setup checklist hidden' });

// Extra numbers for the role dashboards. Query keys match the owning features so their pages share the cache;
// each is optional (a module may be switched off), so callers only show the tiles that loaded.
const optional = { retry: false, staleTime: 30000 };
export const useParcelWaiting = (enabled) => useQuery({ queryKey: ['parcels', 'stats'], queryFn: () => api.get('/parcels/stats'), enabled, ...optional });
export const useCurrentPatrol = (enabled) => useQuery({ queryKey: ['patrols', 'current'], queryFn: () => api.get('/patrols/current'), enabled, ...optional });
export const useStaffToday = (day, enabled) => useQuery({ queryKey: ['attendance', 'day', day], queryFn: () => api.get('/staffhr/attendance/day', { date: day }), enabled, ...optional });
export const useWorkOrderNumbers = (enabled) => useQuery({ queryKey: ['workOrders', 'stats'], queryFn: () => api.get('/work-orders/stats'), enabled, ...optional });
export const useMaintenanceNumbers = (enabled) => useQuery({ queryKey: ['ppm', 'stats'], queryFn: () => api.get('/maintenance/stats'), enabled, ...optional });
export const useChecklistDay = (day, enabled) =>
  useQuery({ queryKey: ['checklists', 'report', { from: day, to: day }], queryFn: () => api.get('/maintenance/checklist-runs/report', { from: day, to: day }), enabled, ...optional });
