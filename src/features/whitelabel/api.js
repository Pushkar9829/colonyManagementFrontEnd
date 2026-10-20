import { useQuery } from '@tanstack/react-query';
import { api, upload } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

// ---- branding ----
export const useLoginBranding = ({ slug, host }) =>
  useQuery({ queryKey: ['branding', 'login', slug || '', host || ''], queryFn: () => api.get('/branding', { slug, host }), staleTime: 10 * 60000, retry: false });
export const useSocietyBranding = (enabled) =>
  useQuery({ queryKey: ['branding', 'society'], queryFn: () => api.get('/branding/society'), enabled, staleTime: 5 * 60000 });

// ---- platform console (whitelabel.manage) ----
const P = ['platform', 'resellers'];
export const useResellers = (params) => useQuery({ queryKey: [...P, params], queryFn: () => api.list('/platform/resellers', params), placeholderData: (p) => p });
export const useReseller = (id) => useQuery({ queryKey: [...P, 'detail', id], queryFn: () => api.get(`/platform/resellers/${id}`), enabled: Boolean(id) });
export const useResellerKeys = (id, params) => useQuery({ queryKey: [...P, 'keys', id, params], queryFn: () => api.list(`/platform/resellers/${id}/keys`, params), enabled: Boolean(id), placeholderData: (p) => p });
export const useResellerInvoices = (id) => useQuery({ queryKey: [...P, 'invoices', id], queryFn: () => api.list(`/platform/resellers/${id}/invoices`), enabled: Boolean(id) });
export const useCreateReseller = (o) => useApiMutation((b) => api.post('/platform/resellers', b), { invalidate: [P], success: 'Reseller created', ...o });
export const useUpdateReseller = (id, o) => useApiMutation((b) => api.patch(`/platform/resellers/${id}`, b), { invalidate: [P], success: 'Reseller saved', ...o });
export const useUploadLogo = (id) =>
  useApiMutation((file) => {
    const fd = new FormData();
    fd.append('file', file);
    return upload(`/platform/resellers/${id}/logo`, fd);
  }, { invalidate: [P], success: 'Logo uploaded' });
export const useAddResellerAdmin = (id, o) => useApiMutation((b) => api.post(`/platform/resellers/${id}/admins`, b), { invalidate: [P], success: 'Admin login added', ...o });
export const useRemoveResellerAdmin = (id) => useApiMutation((userId) => api.del(`/platform/resellers/${id}/admins/${userId}`), { invalidate: [P], success: 'Admin removed' });
export const useGenerateKeys = (id, o) => useApiMutation((b) => api.post(`/platform/resellers/${id}/keys`, b), { invalidate: [P], success: (r) => `${r.keys.length} keys generated`, ...o });
export const usePlatformRevokeKey = (id) => useApiMutation((keyId) => api.post(`/platform/resellers/${id}/keys/${keyId}/revoke`), { invalidate: [P], success: 'Key revoked' });
export const useMarkResellerInvoicePaid = () => useApiMutation(({ id, ...b }) => api.post(`/platform/resellers/invoices/${id}/mark-paid`, b), { invalidate: [P], success: 'Marked as paid' });

// ---- reseller console (the partner's own admins) ----
const R = ['reseller'];
export const useResellerHome = () => useQuery({ queryKey: [...R, 'home'], queryFn: () => api.get('/reseller') });
export const useMyKeys = (params) => useQuery({ queryKey: [...R, 'keys', params], queryFn: () => api.list('/reseller/keys', params), placeholderData: (p) => p });
export const useMySocieties = (params) => useQuery({ queryKey: [...R, 'societies', params], queryFn: () => api.list('/reseller/societies', params), placeholderData: (p) => p });
export const useMyInvoices = () => useQuery({ queryKey: [...R, 'invoices'], queryFn: () => api.list('/reseller/invoices') });
export const useRevokeMyKey = () => useApiMutation((keyId) => api.post(`/reseller/keys/${keyId}/revoke`), { invalidate: [R], success: 'Key revoked' });

// Full keys exist only in the generation response: offer them as a CSV download right away.
export function keysCsv(keys, { plan, cycle, validityMonths, batch }) {
  const term = cycle === 'one_time' ? (validityMonths ? `${validityMonths} months` : 'lifetime') : cycle;
  return ['licence_key,plan,term,batch', ...keys.map((k) => `${k},${plan},${term},${batch}`)].join('\n');
}

export function downloadText(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
