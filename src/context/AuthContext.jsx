import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, tokens } from '../api/client';
import { unsubscribeOnLogout } from '../features/notifications/push';

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
      async login(identifier, password) {
        startSession(await api.post('/auth/login', { identifier, password }, { auth: false }));
      },
      async loginWithOtp(phone, code) {
        startSession(await api.post('/auth/otp/verify', { phone, code }, { auth: false }));
      },
      async registerSociety(payload) {
        startSession(await api.post('/auth/register-society', payload, { auth: false }));
      },
      async logout() {
        await unsubscribeOnLogout();
        const refreshToken = tokens.refreshToken();
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
