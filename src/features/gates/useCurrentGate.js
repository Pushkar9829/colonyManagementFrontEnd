import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/roles';
import { useGates, useMyPost, useSetPost } from './api';
import { cacheGates, cachedGates, pickGate, rememberGate, rememberedGate } from './gateRules';

// The gate this console works at. Picked automatically when there is only one gate, or from the
// guard's duty / this device's last choice; otherwise the guard is asked (needsChoice).
// choose(gate) remembers it on this device and records it as the guard's gate on the server.
export function useCurrentGate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const societyId = user.society?._id || user.society;
  const isGuard = user.role === ROLES.GUARD;
  const gatesQ = useGates();
  const postQ = useMyPost({ enabled: isGuard });
  const setPost = useSetPost();
  const [remembered, setRemembered] = useState(() => rememberedGate(societyId));

  useEffect(() => {
    if (gatesQ.data) cacheGates(societyId, gatesQ.data);
  }, [gatesQ.data, societyId]);

  const gates = useMemo(() => gatesQ.data || cachedGates(societyId), [gatesQ.data, societyId]);
  const { gate: picked, reason } = pickGate({ gates, postGateId: postQ.data?.gate?._id, rememberedId: remembered?._id });
  // Offline with nothing cached: keep using the gate remembered on this device.
  const gate = picked || (!gates.length && remembered) || null;

  const choose = useCallback(
    (g) => {
      rememberGate(societyId, g);
      setRemembered(g);
      if (isGuard) {
        // Updated locally first, so an older duty gate does not win while offline.
        qc.setQueryData(['gates', 'my-post'], { gate: g, since: new Date().toISOString(), source: 'console' });
        setPost.mutate(g._id);
      }
    },
    [isGuard, qc, setPost, societyId],
  );

  // Keep this device's memory in step with the gate in use (e.g. taken from the duty handover).
  useEffect(() => {
    if (gate && gate._id !== remembered?._id) {
      rememberGate(societyId, gate);
      setRemembered(gate);
    }
  }, [gate, remembered?._id, societyId]);

  const loading = gatesQ.isLoading && !gates.length;
  return { gate, gates, reason, choose, loading, needsChoice: !loading && !gate && gates.length > 1 };
}
