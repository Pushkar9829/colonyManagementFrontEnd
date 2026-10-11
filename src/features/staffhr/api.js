import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { put } from '../assets/shared';

const emp = { invalidate: ['staffhr'] };
const att = { invalidate: ['attendance'] };
const lv = { invalidate: ['leave', 'attendance'] };
const pay = { invalidate: ['payroll'] };

// settings, employees, shifts
export const useHrSettings = (enabled = true) => useQuery({ queryKey: ['staffhr', 'settings'], queryFn: () => api.get('/staffhr/settings'), enabled });
export const useUpdateHrSettings = (o) => useApiMutation((b) => api.patch('/staffhr/settings', b), { ...emp, success: 'Settings saved', ...o });
export const useEmployees = (params, enabled = true) => useQuery({ queryKey: ['staffhr', 'employees', params], queryFn: () => api.list('/staffhr/employees', params), placeholderData: (p) => p, enabled });
export const useEmployee = (id) => useQuery({ queryKey: ['staffhr', 'employee', id], queryFn: () => api.get(`/staffhr/employees/${id}`), enabled: Boolean(id) });
export const useCandidates = (enabled) => useQuery({ queryKey: ['staffhr', 'candidates'], queryFn: () => api.get('/staffhr/employees/candidates'), enabled });
export const useCreateEmployee = (o) => useApiMutation((b) => api.post('/staffhr/employees', b), { ...emp, success: (e) => `Employee ${e.employeeCode} added`, ...o });
export const useUpdateEmployee = (o) => useApiMutation(({ id, ...b }) => api.patch(`/staffhr/employees/${id}`, b), { ...emp, success: 'Employee updated', ...o });
export const useShifts = (enabled = true) => useQuery({ queryKey: ['staffhr', 'shifts'], queryFn: () => api.get('/staffhr/shifts'), enabled, staleTime: 60000 });
export const useCreateShift = (o) => useApiMutation((b) => api.post('/staffhr/shifts', b), { ...emp, success: 'Shift added', ...o });
export const useUpdateShift = (o) => useApiMutation(({ id, ...b }) => api.patch(`/staffhr/shifts/${id}`, b), { ...emp, success: 'Shift saved', ...o });
export const useRoster = (weekStart, enabled = true) => useQuery({ queryKey: ['staffhr', 'roster', weekStart], queryFn: () => api.get('/staffhr/roster', { weekStart }), enabled });
export const useSaveRoster = (o) => useApiMutation((b) => put('/staffhr/roster', b), { ...emp, success: 'Roster published', ...o });

// attendance
export const useMyToday = () => useQuery({ queryKey: ['attendance', 'today'], queryFn: () => api.get('/staffhr/attendance/today') });
export const useMyAttendance = (period) => useQuery({ queryKey: ['attendance', 'me', period], queryFn: () => api.get('/staffhr/attendance/me', { period }) });
export const useCheckIn = (o) => useApiMutation((b) => api.post('/staffhr/attendance/check-in', b), { ...att, success: (r) => (r.status === 'late' ? `Checked in · ${r.lateMinutes} min late` : 'Checked in'), ...o });
export const useCheckOut = (o) => useApiMutation((b) => api.post('/staffhr/attendance/check-out', b), { ...att, success: 'Checked out', ...o });
export const useDaySheet = (dateStr) => useQuery({ queryKey: ['attendance', 'day', dateStr], queryFn: () => api.get('/staffhr/attendance/day', { date: dateStr }) });
export const useRegister = (period, enabled = true) => useQuery({ queryKey: ['attendance', 'register', period], queryFn: () => api.get('/staffhr/attendance/register', { period }), enabled });
export const useMarkAttendance = (o) => useApiMutation((b) => api.post('/staffhr/attendance/mark', b), { ...att, success: 'Attendance saved', ...o });

// leave
export const useLeaves = (params) => useQuery({ queryKey: ['leave', 'list', params], queryFn: () => api.list('/staffhr/leaves', params), placeholderData: (p) => p });
export const useLeaveCalendar = (period) => useQuery({ queryKey: ['leave', 'calendar', period], queryFn: () => api.get('/staffhr/leaves/calendar', { period }) });
export const useLeaveBalances = (params, enabled = true) => useQuery({ queryKey: ['leave', 'balances', params], queryFn: () => api.get('/staffhr/leaves/balances', params), enabled });
export const useApplyLeave = (o) => useApiMutation((b) => api.post('/staffhr/leaves', b), { ...lv, success: (l) => (l.status === 'approved' ? 'Leave recorded' : 'Leave request sent'), ...o });
export const useDecideLeave = (o) => useApiMutation(({ id, ...b }) => api.post(`/staffhr/leaves/${id}/decide`, b), { ...lv, success: (l) => `Leave ${l.status}`, ...o });
export const useCancelLeave = (o) => useApiMutation((id) => api.post(`/staffhr/leaves/${id}/cancel`), { ...lv, success: 'Leave cancelled', ...o });
export const useSetLeaveBalance = (o) => useApiMutation((b) => put('/staffhr/leaves/balances', b), { ...lv, success: 'Allocation saved', ...o });

// payroll
export const useRuns = (params) => useQuery({ queryKey: ['payroll', 'runs', params], queryFn: () => api.list('/staffhr/payroll-runs', params), placeholderData: (p) => p });
export const useRun = (id) => useQuery({ queryKey: ['payroll', 'run', id], queryFn: () => api.get(`/staffhr/payroll-runs/${id}`), enabled: Boolean(id) });
export const useCreateRun = (o) => useApiMutation((b) => api.post('/staffhr/payroll-runs', b), { ...pay, success: (r) => `Draft payroll for ${r.period} ready`, ...o });
export const useRecomputeRun = (o) => useApiMutation((id) => api.post(`/staffhr/payroll-runs/${id}/recompute`), { ...pay, success: 'Recalculated from latest attendance', ...o });
export const useApproveRun = (o) => useApiMutation((id) => api.post(`/staffhr/payroll-runs/${id}/approve`), { ...pay, success: 'Payroll approved', ...o });
export const usePayRun = (o) => useApiMutation(({ id, ...b }) => api.post(`/staffhr/payroll-runs/${id}/pay`, b), { ...pay, success: 'Marked as paid', ...o });
export const useDiscardRun = (o) => useApiMutation((id) => api.del(`/staffhr/payroll-runs/${id}`), { ...pay, success: 'Draft discarded', ...o });
export const usePayslips = (params, enabled = true) => useQuery({ queryKey: ['payroll', 'payslips', params], queryFn: () => api.list('/staffhr/payslips', params), placeholderData: (p) => p, enabled });
export const useAdjustPayslip = (o) => useApiMutation(({ id, ...b }) => api.patch(`/staffhr/payslips/${id}/adjustments`, b), { ...pay, success: 'Payslip updated', ...o });
export const usePayPayslip = (o) => useApiMutation(({ id, ...b }) => api.post(`/staffhr/payslips/${id}/pay`, b), { ...pay, success: 'Marked as paid', ...o });
export const useAdvances = (params, enabled = true) => useQuery({ queryKey: ['payroll', 'advances', params], queryFn: () => api.get('/staffhr/advances', params), enabled });
export const useCreateAdvance = (o) => useApiMutation((b) => api.post('/staffhr/advances', b), { ...pay, success: 'Advance recorded', ...o });
