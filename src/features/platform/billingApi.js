import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

// Platform console: price list, platform invoices and per-society subscription settings.
export const usePlans = () => useQuery({ queryKey: ['platform', 'plans'], queryFn: () => api.get('/platform/plans') });
export const useUpdatePlan = () => useApiMutation(({ plan, ...b }) => api.put(`/platform/plans/${plan}`, b), { invalidate: [['platform', 'plans']], success: (p) => `${p.plan} pricing saved` });

export const usePlatformInvoices = (params) =>
  useQuery({ queryKey: ['platform', 'invoices', params], queryFn: () => api.list('/platform/invoices', params), placeholderData: (p) => p });
export const usePlatformInvoice = (id) => useQuery({ queryKey: ['platform', 'invoices', 'detail', id], queryFn: () => api.get(`/platform/invoices/${id}`), enabled: Boolean(id) });
export const useInvoiceSummary = () => useQuery({ queryKey: ['platform', 'invoices', 'summary'], queryFn: () => api.get('/platform/invoices/summary') });
export const useMarkInvoicePaid = (o) => useApiMutation(({ id, ...b }) => api.post(`/platform/invoices/${id}/mark-paid`, b), { invalidate: ['platform'], success: (r) => (r.reactivated ? 'Paid — society reactivated' : 'Marked as paid'), ...o });
export const useVoidInvoice = (o) => useApiMutation(({ id, reason }) => api.post(`/platform/invoices/${id}/void`, { reason }), { invalidate: ['platform'], success: 'Invoice voided', ...o });
export const useRunBilling = () =>
  useApiMutation(() => api.post('/platform/billing/run'), { invalidate: ['platform'], success: (r) => `${r.created} invoice(s) created · ${r.reminded} reminder(s) · ${r.suspended} suspended` });

export const useSocietySubscription = (id) => useQuery({ queryKey: ['platform', 'subscription', id], queryFn: () => api.get(`/platform/subscriptions/${id}`), enabled: Boolean(id) });
export const useUpdateSocietySubscription = (id) =>
  useApiMutation((b) => api.patch(`/platform/subscriptions/${id}`, b), { invalidate: [['platform', 'subscription', id]], success: 'Subscription settings saved' });
