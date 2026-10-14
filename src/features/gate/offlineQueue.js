import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

// Offline mode for the gate console.
// Actions taken while the browser is offline are kept in localStorage with the time they happened and a
// unique key, then replayed in order through POST /visitors/sync. The server stores each key, so a retry
// after a dropped connection never creates a second entry. Refusals come back as conflicts for the guard.

const DEVICE_KEY = 'colonyhub.gate.device';
const queueKey = (societyId) => `colonyhub.gate.queue.${societyId}`;
const BATCH = 50;

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
function write(key, ops) {
  try {
    localStorage.setItem(key, JSON.stringify(ops));
    return true;
  } catch {
    return false;
  }
}

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `g${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'gtab';
  }
}

export const newKey = () => `${deviceId()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// A request failed because the server could not be reached (not because it said no).
export const isNetworkError = (err) => err?.status === 0 || err?.code === 'NETWORK_ERROR';

// What goes to POST /visitors/sync for one queued op (labels stay on the device).
export const toSyncOp = ({ key, kind, occurredAt, data, gateId }) => ({ key, kind, occurredAt, data, ...(gateId ? { gateId } : {}) });

let syncing = false; // one sync at a time per tab

// gate: the gate this console is at. Every queued op carries it, so the entry is recorded at the gate
// where it happened even if the guard moves before the connection returns.
export function useGateQueue(societyId, gate) {
  const key = queueKey(societyId);
  const gateRef = useRef(gate);
  gateRef.current = gate;
  const qc = useQueryClient();
  const online = useOnline();
  const [ops, setOps] = useState(() => read(key));
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Other tabs on the same tablet share the queue.
  useEffect(() => {
    const onStorage = (e) => e.key === key && setOps(read(key));
    window.addEventListener('storage', onStorage);
    setOps(read(key));
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const update = useCallback((fn) => {
    const next = fn(read(keyRef.current));
    write(keyRef.current, next);
    setOps(next);
    return next;
  }, []);

  // kind: entry | checkout | pass | help_scan; label is what the guard sees in the queue list.
  const enqueue = useCallback(
    (kind, data, label) => {
      const g = gateRef.current;
      const op = { key: newKey(), kind, occurredAt: new Date().toISOString(), data, label, status: 'queued', ...(g?._id ? { gateId: g._id, gateName: g.name } : {}) };
      update((cur) => [...cur, op]);
      return op;
    },
    [update],
  );

  const sync = useCallback(async () => {
    if (syncing) return;
    const pending = read(keyRef.current).filter((o) => o.status === 'queued');
    if (!pending.length) return;
    syncing = true;
    setBusy(true);
    let ok = 0;
    let conflicts = 0;
    try {
      for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH);
        // eslint-disable-next-line no-await-in-loop
        const res = await api.post('/visitors/sync', { ops: batch.map(toSyncOp) });
        const byKey = new Map(res.results.map((r) => [r.key, r]));
        update((cur) =>
          cur.flatMap((o) => {
            const r = byKey.get(o.key);
            if (!r) return [o];
            if (r.status === 'ok') {
              ok += 1;
              return [];
            }
            if (r.status === 'conflict') {
              conflicts += 1;
              return [{ ...o, status: 'conflict', message: r.message, code: r.code }];
            }
            return [o]; // 'error' / 'processing': keep and retry next time
          }),
        );
      }
    } catch {
      // Still offline or server unreachable; the queue stays as it is.
    } finally {
      syncing = false;
      setBusy(false);
      setLastSync({ at: new Date(), ok, conflicts });
      if (ok || conflicts) ['visitors', 'dailyHelp', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
  }, [qc, update]);

  // Replay as soon as the connection is back, and every 30 s while anything is waiting.
  useEffect(() => {
    if (!online) return undefined;
    sync();
    const t = setInterval(() => read(keyRef.current).some((o) => o.status === 'queued') && sync(), 30000);
    return () => clearInterval(t);
  }, [online, sync]);

  const dismiss = useCallback((k) => update((cur) => cur.filter((o) => o.key !== k)), [update]);
  // The server remembers the outcome per key, so a retry after fixing things goes out under a fresh key.
  const retry = useCallback((k) => update((cur) => cur.map((o) => (o.key === k ? { ...o, key: newKey(), status: 'queued', message: undefined, code: undefined } : o))), [update]);

  return {
    online,
    ops,
    queued: ops.filter((o) => o.status === 'queued'),
    conflicts: ops.filter((o) => o.status === 'conflict'),
    enqueue,
    sync,
    syncing: busy,
    lastSync,
    dismiss,
    retry,
  };
}
