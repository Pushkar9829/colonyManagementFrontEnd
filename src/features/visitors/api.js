import { useQuery } from '@tanstack/react-query';
import { api, BASE_URL, refreshSession, tokens, ApiError } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['visitors', 'dashboard', 'notifications'] };

export const useVisitors = (params, options) =>
  useQuery({ queryKey: ['visitors', params], queryFn: () => api.list('/visitors', params), placeholderData: (p) => p, ...options });

export const usePasses = (params) => useQuery({ queryKey: ['visitors', 'passes', params], queryFn: () => api.list('/visitors/passes', params) });

export const useLogVisitor = (o) =>
  useApiMutation((b) => api.post('/visitors', b), {
    ...inv,
    success: (v) => (v.leaveAtGate ? 'Delivery can be left at the gate' : v.status === 'pending' ? 'Waiting for resident approval' : 'Entry logged'),
    ...o,
  });
export const useApproveVisitor = () => useApiMutation((id) => api.post(`/visitors/${id}/approve`), { ...inv, success: 'Visitor allowed in' });
export const useDenyVisitor = () => useApiMutation((id) => api.post(`/visitors/${id}/deny`), { ...inv, success: 'Visitor denied' });
export const useGuardCheckIn = () => useApiMutation((id) => api.post(`/visitors/${id}/check-in`, { note: 'Allowed by guard after phone confirmation' }), { ...inv, success: 'Entry allowed' });
export const useCheckOut = () => useApiMutation((id) => api.post(`/visitors/${id}/check-out`), { ...inv, success: 'Checked out' });
export const useHouseholdContacts = (id) => useQuery({ queryKey: ['visitors', 'contacts', id], queryFn: () => api.get(`/visitors/${id}/contacts`), enabled: Boolean(id) });

export const useCreatePass = (o) => useApiMutation((b) => api.post('/visitors/passes', b), { invalidate: ['visitors'], ...o });
export const useCancelPass = () => useApiMutation((id) => api.post(`/visitors/passes/${id}/cancel`), { invalidate: ['visitors'], success: 'Pass cancelled' });
// body: { code } or { qr }
export const useVerifyPass = (o) =>
  useApiMutation((body) => api.post('/visitors/passes/verify', typeof body === 'string' ? { code: body } : body), { ...inv, success: (v) => `${v.name} entered (${v.unit.label})`, ...o });

// ---- watchlist ----
export const useWatchlist = (params, options) => useQuery({ queryKey: ['watchlist', params], queryFn: () => api.list('/visitors/watchlist', params), placeholderData: (p) => p, ...options });
export const useCreateWatch = (o) => useApiMutation((b) => api.post('/visitors/watchlist', b), { invalidate: ['watchlist'], success: 'Added to the list', ...o });
export const useUpdateWatch = (o) => useApiMutation(({ id, ...b }) => api.patch(`/visitors/watchlist/${id}`, b), { invalidate: ['watchlist'], success: 'Saved', ...o });
export const useRemoveWatch = () => useApiMutation((id) => api.del(`/visitors/watchlist/${id}`), { invalidate: ['watchlist'], success: 'Removed' });
export const checkWatchlist = (body) => api.post('/visitors/watchlist/check', body);

// ---- frequent visitors ----
export const useFrequent = (params, options) => useQuery({ queryKey: ['visitors', 'frequent', params], queryFn: () => api.list('/visitors/frequent', params), ...options });
export const useCreateFrequent = (o) => useApiMutation((b) => api.post('/visitors/frequent', b), { invalidate: ['visitors'], success: 'Saved to frequent visitors', ...o });
export const useUpdateFrequent = () => useApiMutation(({ id, ...b }) => api.patch(`/visitors/frequent/${id}`, b), { invalidate: ['visitors'], success: 'Saved' });
export const useRemoveFrequent = () => useApiMutation((id) => api.del(`/visitors/frequent/${id}`), { invalidate: ['visitors'], success: 'Removed' });
export const useFrequentPass = (o) => useApiMutation(({ id, ...b }) => api.post(`/visitors/frequent/${id}/pass`, b), { invalidate: ['visitors'], ...o });

// ---- analytics & settings ----
export const useVisitorAnalytics = (params) => useQuery({ queryKey: ['visitors', 'analytics', params], queryFn: () => api.get('/visitors/analytics', params), placeholderData: (p) => p });
export const useSecuritySettings = (enabled = true) => useQuery({ queryKey: ['visitors', 'security-settings'], queryFn: () => api.get('/visitors/security-settings'), enabled, staleTime: 60000 });
export const useUpdateSecuritySettings = () => useApiMutation((b) => api.patch('/visitors/security-settings', b), { invalidate: ['visitors'], success: 'Settings saved' });

// Authenticated file download (the JSON client does not handle binary bodies).
export async function downloadFile(path, query, fallbackName) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  const send = () => fetch(url, { headers: tokens.access() ? { Authorization: `Bearer ${tokens.access()}` } : {} });
  let res = await send().catch(() => {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  });
  if (res.status === 401 && tokens.hasRefresh()) {
    await refreshSession();
    res = await send();
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(res.status, json.error?.code || 'HTTP_ERROR', json.error?.message || `Download failed (${res.status})`);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
