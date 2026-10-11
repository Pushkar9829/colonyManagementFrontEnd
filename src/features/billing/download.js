import { ApiError, BASE_URL, refreshSession, tokens } from '../../api/client';

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
    throw new ApiError(res.status, json.error?.code || 'HTTP_ERROR', json.error?.message || `Download failed (${res.status})`);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}
