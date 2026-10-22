import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { CLASSIC, applyTemplate, cacheTemplate, lastSocietyCode, readCached, readPreview, rememberSocietyCode, savePreview } from '../lib/template';

const TemplateContext = createContext({ template: CLASSIC, appearance: null, preview: null });

// ?society=DEMO01 on a colony's login link; else the colony this device used last; ?brand / the host name
// pick a white-label partner's look.
function loginQuery() {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('society') || '').trim().toUpperCase();
  if (code) rememberSocietyCode(code);
  return { society: code || lastSocietyCode() || undefined, slug: params.get('brand') || undefined, host: window.location.hostname };
}

// Applies the open colony's app template (backend modules/appearance) and offers the admin's "Try it" preview.
export function TemplateProvider({ children }) {
  const { user, booting } = useAuth();
  const qc = useQueryClient();
  const societyId = user?.society?._id || user?.society || null;
  const [preview, setPreview] = useState(readPreview);
  const [query] = useState(loginQuery);

  const member = useQuery({ queryKey: ['appearance', 'mine', String(societyId)], queryFn: () => api.get('/appearance'), enabled: Boolean(societyId), staleTime: 5 * 60000 });
  const pub = useQuery({
    queryKey: ['appearance', 'public', query.society || '', query.slug || '', query.host || ''],
    queryFn: () => api.get('/appearance/public', query),
    enabled: !booting && !user,
    staleTime: 10 * 60000,
    retry: false,
  });

  // What the server says now: the colony's (members), the login page's (signed out), Classic for the
  // platform console. undefined while it is loading, so the cached template stays on screen meanwhile.
  let confirmed;
  if (user) confirmed = societyId ? member.data?.template : CLASSIC;
  else if (!booting) confirmed = pub.data?.template ?? (pub.isError ? CLASSIC : undefined);
  // A preview survives reloads in this tab (sessionStorage); while the session restores, keep showing it.
  const active = (preview && (societyId || booting) ? preview : null) || confirmed || readCached() || CLASSIC;

  useLayoutEffect(() => {
    applyTemplate(active);
  }, [active]);

  useLayoutEffect(() => {
    if (member.data?.template) {
      cacheTemplate(member.data.template);
      rememberSocietyCode(member.data.society?.code);
    } else if (!user && pub.data?.template) cacheTemplate(pub.data.template);
  }, [member.data, pub.data, user]);

  // Leaving the society (log out, switch to the console) ends a preview.
  useLayoutEffect(() => {
    if (!booting && !societyId && preview) {
      savePreview(null);
      setPreview(null);
    }
  }, [booting, societyId, preview]);

  const startPreview = useCallback(async (key) => {
    const t = await api.get(`/appearance/preview/${key}`);
    savePreview(t);
    setPreview(t);
    return t;
  }, []);
  const cancelPreview = useCallback(() => {
    savePreview(null);
    setPreview(null);
  }, []);
  const applyPreview = useCallback(async () => {
    if (!preview) return null;
    const saved = await api.put('/appearance/template', { template: preview.key });
    qc.setQueryData(['appearance', 'mine', String(societyId)], saved);
    qc.invalidateQueries({ queryKey: ['appearance'] });
    savePreview(null);
    setPreview(null);
    return saved;
  }, [preview, qc, societyId]);

  const value = useMemo(
    () => ({
      template: active,
      // members: { template, logoUrl, coverUrl, society, adminMayChange }; signed out: { template, society, brand }
      appearance: user ? member.data || null : pub.data || null,
      preview: societyId ? preview : null,
      startPreview,
      cancelPreview,
      applyPreview,
    }),
    [active, user, member.data, pub.data, societyId, preview, startPreview, cancelPreview, applyPreview],
  );
  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export const useTemplate = () => useContext(TemplateContext);
