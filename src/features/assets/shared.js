import { useQuery } from '@tanstack/react-query';
import { ApiError, BASE_URL, api, refreshSession, request, tokens } from '../../api/client';
import { label } from '../../lib/format';

// Helpers shared by the facility features (assets, maintenance, inventory, utility logs, staff HR).

// The shared client has no PUT helper; idempotent "set" endpoints use PUT.
export const put = (path, body) => request('PUT', path, { body: body ?? {} }).then((json) => json.data);

export const opts = (values) => values.map((v) => ({ value: v, label: label(v) }));

// Drops empty strings / nulls so optional fields are simply left out of the request.
export const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const numOrUndef = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

// Active staff / managers / guards of the society for assignee pickers (value = user id).
export const usePeople = (roles = ['staff', 'facility_manager'], enabled = true) =>
  useQuery({
    queryKey: ['users', 'people', roles],
    queryFn: async () => (await Promise.all(roles.map((role) => api.get('/users', { role, status: 'active', limit: 100 })))).flat(),
    enabled,
    staleTime: 60000,
    select: (rows) => rows.map((m) => ({ value: m.user, label: `${m.name}${m.designation ? ` · ${m.designation}` : ''}`, role: m.role })),
  });

export const ASSIGNEE_ROLES = [
  { value: 'staff', label: 'Any technician / housekeeping' },
  { value: 'guard', label: 'Any guard' },
  { value: 'facility_manager', label: 'Facility manager' },
];

// Tone for derived due states used across facility pages.
export const DUE_TONES = { ok: 'green', active: 'green', due_soon: 'amber', expiring: 'amber', overdue: 'red', expired: 'red', none: 'slate' };

// Authorised file download (PDF / Excel). The API client only speaks JSON, so this fetches the blob
// with the bearer token itself (refreshing once on 401) and hands it to the browser as a file.
export async function downloadFile(path, query, fallbackName = 'download') {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  const send = () => fetch(url, { headers: tokens.access() ? { Authorization: `Bearer ${tokens.access()}` } : {} });
  let res;
  try {
    res = await send();
    if (res.status === 401 && tokens.hasRefresh()) {
      await refreshSession();
      res = await send();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(res.status, json.error?.code || 'HTTP_ERROR', json.error?.message || `Download failed (${res.status})`, undefined, json.error);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

// Opens a PDF in a new tab (same auth handling as downloadFile).
export async function openPdf(path) {
  const send = () => fetch(`${BASE_URL}${path}`, { headers: tokens.access() ? { Authorization: `Bearer ${tokens.access()}` } : {} });
  let res = await send();
  if (res.status === 401 && tokens.hasRefresh()) {
    await refreshSession();
    res = await send();
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(res.status, json.error?.code || 'HTTP_ERROR', json.error?.message || 'Could not open the file', undefined, json.error);
  }
  const href = URL.createObjectURL(await res.blob());
  window.open(href, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}

// Adds days to a YYYY-MM-DD string.
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
