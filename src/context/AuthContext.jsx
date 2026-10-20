import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, tokens } from '../api/client';
import { unsubscribeOnLogout } from '../features/notifications/push';
import { beginActing, exitActing, resumeActing, takeActingReturn } from '../features/loginAs/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const startSession = useCallback((session) => {
    tokens.setSession(session);
    setUser(session.user);
  }, []);

  const endSession = useCallback(() => {
    tokens.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Restore the session from the stored refresh token on first load.
  useEffect(() => {
    tokens.onSessionLost(() => {
      setUser(null);
      queryClient.clear();
    });
    // A "Log in as" session open in this tab (or one that ended while the tab was closed).
    const acting = resumeActing();
    if (acting) {
      acting.then(setUser).catch(() => setUser(null)).finally(() => setBooting(false));
      return;
    }
    if (!tokens.hasRefresh()) {
      setBooting(false);
      return;
    }
    refreshSession()
      .then((session) => setUser(session.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      booting,
      // With two-step verification on, these resolve to { mfaRequired, mfaToken } and no session starts yet;
      // the login page then asks for the code and calls verifyMfa.
      async login(identifier, password) {
        const res = await api.post('/auth/login', { identifier, password }, { auth: false });
        if (res.mfaRequired) return res;
        startSession(res);
        return null;
      },
      async loginWithOtp(phone, code) {
        const res = await api.post('/auth/otp/verify', { phone, code }, { auth: false });
        if (res.mfaRequired) return res;
        startSession(res);
        return null;
      },
      async verifyMfa(mfaToken, { code, backupCode }) {
        startSession(await api.post('/auth/mfa/verify', { mfaToken, code, backupCode }, { auth: false }));
      },
      async registerSociety(payload) {
        startSession(await api.post('/auth/register-society', payload, { auth: false }));
      },
      async logout() {
        await unsubscribeOnLogout();
        const refreshToken = tokens.refreshToken() || takeActingReturn();
        endSession();
        await api.post('/auth/logout', { refreshToken }, { auth: false }).catch(() => {});
      },
      // Opens another membership (home / society), or the platform console when membershipId is null.
      async switchTo(membershipId) {
        const session = await api.post('/auth/switch', { membershipId });
        queryClient.clear();
        startSession(session);
      },
      // Platform owner: time-limited, audited admin access to a society for support.
      // "Log in as" someone below you: confirmed with your own password (+ two-step code), time-limited, audited.
      async loginAs(payload) {
        const session = await api.post('/login-as', payload);
        queryClient.clear();
        beginActing(session);
        setUser(session.user);
      },
      // Back to your own account (also used when the session runs out).
      async exitLoginAs() {
        const own = await exitActing().catch(() => null);
        queryClient.clear();
        setUser(own);
      },
      async startSupportSession(societyId, reason) {
        const session = await api.post('/auth/support-session', { societyId, reason });
        queryClient.clear();
        startSession(session);
      },
      async reloadUser() {
        setUser(await api.get('/auth/me'));
      },
    }),
    [user, booting, startSession, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
