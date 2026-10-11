import { useState } from 'react';
import { ApiError, BASE_URL, refreshSession, tokens } from '../../api/client';
import { useToast } from '../../context/ToastContext';

// File downloads (CSV / Excel / PDF) need the bearer token, so a plain <a href> cannot be used.
// Fetches the file as a blob and saves it with the server-provided filename.
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
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = match?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

// { download(path, query, name), busyKey } — busyKey tells which button shows a spinner.
export function useDownload() {
  const toast = useToast();
  const [busyKey, setBusyKey] = useState(null);
  const download = async (path, query, name, key = path) => {
    setBusyKey(key);
    try {
      await downloadFile(path, query, name);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusyKey(null);
    }
  };
  return { download, busyKey };
}
