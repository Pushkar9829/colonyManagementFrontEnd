import { ApiError, BASE_URL, refreshSession, tokens } from '../../api/client';

function buildUrl(path, query) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  return url;
}

// Downloads a file endpoint (Excel / PDF / XML) as a blob with the session's bearer token and saves it.
// The API client only handles JSON, so file downloads go through fetch directly.
export async function downloadFile(path, query, filename) {
  const send = () => {
    const token = tokens.access();
    return fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  };
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
    const e = json.error || {};
    throw new ApiError(res.status, e.code || 'HTTP_ERROR', e.message || `Download failed (${res.status})`, e.details);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
