export const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const REFRESH_KEY = 'cms.refreshToken';

export class ApiError extends Error {
  // template/params: the English message with its dynamic parts left as {placeholders}, so it can be translated.
  constructor(status, code, message, details, { template, params } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    if (template) {
      this.template = template;
      this.params = params || {};
    }
  }

  // field -> message map for forms
  get fieldErrors() {
    const out = {};
    for (const d of this.details || []) out[d.field.replace(/^body\./, '')] = d.message;
    return out;
  }
}

// ---- token storage: access token in memory, refresh token in localStorage ----
let accessToken = null;
let onSessionLost = () => {};

const storage = {
  get: () => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set: (v) => {
    try {
      if (v) localStorage.setItem(REFRESH_KEY, v);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* storage unavailable (private mode) — session lasts for this tab only */
    }
  },
};

export const tokens = {
  setSession({ accessToken: a, refreshToken: r }) {
    accessToken = a;
    storage.set(r);
  },
  clear() {
    accessToken = null;
    storage.set(null);
  },
  hasRefresh: () => Boolean(storage.get()),
  access: () => accessToken,
  refreshToken: () => storage.get(),
  onSessionLost(fn) {
    onSessionLost = fn;
  },
};

function buildUrl(path, query) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  return url;
}

async function raw(method, path, { body, query, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return { data: null };
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = json.error || {};
    throw new ApiError(res.status, e.code || 'HTTP_ERROR', e.message || `Request failed (${res.status})`, e.details, e);
  }
  return json;
}

// Concurrent 401s share a single refresh call.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    const refreshToken = storage.get();
    refreshing = (refreshToken ? raw('POST', '/auth/refresh', { body: { refreshToken }, auth: false }) : Promise.reject(new ApiError(401, 'NO_SESSION', 'Not logged in')))
      .then((json) => {
        tokens.setSession(json.data);
        return json.data;
      })
      .catch((err) => {
        if (err.status === 401) {
          tokens.clear();
          onSessionLost();
        }
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function request(method, path, options = {}) {
  try {
    return await raw(method, path, options);
  } catch (err) {
    const retriable = err.status === 401 && options.auth !== false && tokens.hasRefresh();
    if (!retriable) throw err;
    await refreshSession();
    return raw(method, path, options);
  }
}

// Multipart upload (FormData). Shares token refresh with request().
export async function upload(path, formData) {
  const send = () =>
    fetch(buildUrl(path), { method: 'POST', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, body: formData }).catch(() => {
      throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
    });
  let res = await send();
  if (res.status === 401 && tokens.hasRefresh()) {
    await refreshSession();
    res = await send();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = json.error || {};
    throw new ApiError(res.status, e.code || 'HTTP_ERROR', e.message || `Upload failed (${res.status})`, e.details, e);
  }
  return json.data;
}

// Convenience helpers that resolve to `data` (or { data, meta } with `withMeta`).
const unwrap = (p, withMeta) => p.then((json) => (withMeta ? { data: json.data, meta: json.meta } : json.data));

export const api = {
  get: (path, query, { withMeta } = {}) => unwrap(request('GET', path, { query }), withMeta),
  list: (path, query) => unwrap(request('GET', path, { query }), true),
  post: (path, body, opts) => unwrap(request('POST', path, { body: body ?? {}, ...opts })),
  patch: (path, body) => unwrap(request('PATCH', path, { body })),
  put: (path, body) => unwrap(request('PUT', path, { body })),
  del: (path) => unwrap(request('DELETE', path)),
};
