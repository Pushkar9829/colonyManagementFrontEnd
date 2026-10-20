import { api, refreshSession, tokens } from '../../api/client';

// "Log in as" keeps the person's own login aside while they view someone else's account:
//   - their refresh token moves to RETURN_KEY (localStorage), so a 401 inside the session can never quietly
//     refresh back into their own account and replay the request as them;
//   - the acting access token (valid until the session ends, no refresh) sits in sessionStorage so a reload
//     of this tab stays in the session. Other tabs keep the person's own login.
const RETURN_KEY = 'cms.actingReturn';
const ACT_KEY = 'cms.actingToken';

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
const local = {
  get: () => safe(() => localStorage.getItem(RETURN_KEY)),
  set: (v) => safe(() => (v ? localStorage.setItem(RETURN_KEY, v) : localStorage.removeItem(RETURN_KEY))),
};
const tab = {
  get: () => safe(() => JSON.parse(sessionStorage.getItem(ACT_KEY) || 'null')),
  set: (v) => safe(() => (v ? sessionStorage.setItem(ACT_KEY, JSON.stringify(v)) : sessionStorage.removeItem(ACT_KEY))),
};

export const minutesLeft = (expiresAt, now = Date.now()) => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 60000));

// The stored acting token for this tab, if it has not run out.
export function storedActing(now = Date.now()) {
  const t = tab.get();
  return t?.accessToken && new Date(t.expiresAt).getTime() > now ? t : null;
}

export function beginActing({ accessToken, expiresAt }) {
  const own = tokens.refreshToken();
  if (own) local.set(own);
  tab.set({ accessToken, expiresAt });
  tokens.setSession({ accessToken, refreshToken: null });
}

// Puts the person's own login back. Returns true when there is one to go back to.
function restoreOwn() {
  tab.set(null);
  const own = local.get();
  local.set(null);
  if (own) tokens.setSession({ accessToken: null, refreshToken: own });
  return Boolean(own || tokens.hasRefresh());
}

const sendExit = () => (tokens.access() ? api.post('/login-as/exit', {}).catch(() => {}) : Promise.resolve());

// Exit (button or time up): ends the session on the server, then reopens the person's own account.
// Resolves to their user, or null when there is no login to return to.
export async function exitActing() {
  await sendExit();
  if (!restoreOwn()) return null;
  return (await refreshSession()).user;
}

// Page load: resume this tab's session, or leave a finished one. null = nothing to do.
export function resumeActing() {
  const acting = storedActing();
  if (!acting && !local.get()) return null;
  if (!acting) {
    // The session ran out while the tab was closed (or this is another tab): back to the person's own account.
    if (!restoreOwn()) return Promise.resolve(null);
    return refreshSession().then((s) => s.user);
  }
  tokens.setSession({ accessToken: acting.accessToken, refreshToken: null });
  return api.get('/auth/me').catch(async () => {
    if (!restoreOwn()) return null;
    return (await refreshSession()).user;
  });
}

// Logging out from inside a session: end it and hand back the own refresh token so it is revoked too.
export function takeActingReturn() {
  if (tab.get()) sendExit();
  tab.set(null);
  const own = local.get();
  local.set(null);
  return own;
}
