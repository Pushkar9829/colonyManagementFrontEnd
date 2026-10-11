import { ApiError, BASE_URL, refreshSession, tokens } from '../../api/client';

// Downloads a PDF the API generates (minutes, letters, certificates). The shared client
// only speaks JSON, so this fetches the binary with the same bearer token and refresh rule.
export async function downloadPdf(path, filename) {
  const send = () => fetch(`${BASE_URL}${path}`, { headers: tokens.access() ? { Authorization: `Bearer ${tokens.access()}` } : {} });
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
    throw new ApiError(res.status, json.error?.code || 'HTTP_ERROR', json.error?.message || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const POSITIONS = [
  { value: 'chairman', label: 'Chairman' },
  { value: 'president', label: 'President' },
  { value: 'vice_president', label: 'Vice President' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'joint_secretary', label: 'Joint Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'member', label: 'Committee Member' },
  { value: 'co_opted', label: 'Co-opted Member' },
  { value: 'other', label: 'Other' },
];

export const positionLabel = (p) => p.title || POSITIONS.find((x) => x.value === p.position)?.label || p.position;
