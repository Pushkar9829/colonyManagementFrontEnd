import { ApiError, BASE_URL, refreshSession, tokens } from '../../api/client';

// Authenticated file download (e.g. Excel exports) — the JSON client cannot return blobs.
export async function downloadFile(path, query, filename) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query || {})) if (v) url.searchParams.set(k, v);
  const send = () => fetch(url, { headers: tokens.access() ? { Authorization: `Bearer ${tokens.access()}` } : {} });
  let res = await send();
  if (res.status === 401 && tokens.hasRefresh()) {
    await refreshSession();
    res = await send();
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(res.status, json.error?.code || 'HTTP_ERROR', json.error?.message || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
