import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { BASE_URL, refreshSession, tokens } from '../api/client';
import { useToast } from '../context/ToastContext';

const RealtimeContext = createContext({ connected: false });

// Socket server lives at the API origin (BASE_URL minus /api/v1).
const SOCKET_URL = new URL(BASE_URL).origin;

// Which cached queries a notification type affects.
const KEYS_BY_TYPE = {
  visitor: ['visitors', 'dashboard', 'dailyHelp'],
  bill: ['bills', 'payments', 'dashboard'],
  complaint: ['complaints', 'dashboard'],
  sos: ['sos', 'dashboard'],
  booking: ['bookings', 'amenities', 'dashboard'],
  notice: ['notices', 'dashboard'],
  poll: ['polls', 'dashboard'],
  account: ['users', 'dashboard'],
  // ---- feature notification types (add below this line) ----
  facility: ['assets', 'ppm', 'breakdowns', 'workOrders', 'checklists', 'fire', 'utility'],
  inventory: ['inventory'],
  leave: ['leave', 'attendance'],
  payroll: ['payroll'],
  kyc: ['kyc'],
  lease: ['tenancies'],
  dailyHelp: ['dailyHelp'],
  security: ['visitors', 'watchlist', 'vehicleMovements', 'guardDuty'],
  parcel: ['parcels', 'dashboard'],
  patrol: ['patrols'],
  parking: ['parking'],
  child_alert: ['childAlerts', 'children'],
  duty: ['guardDuty'],
  purchase_request: ['purchaseRequests'],
  vendor_bill: ['vendorBills', 'vendors'],
  meeting: ['meetings'],
  election: ['elections', 'notices'],
  document: ['documents'],
  request: ['requests'],
  event: ['events', 'dashboard'],
  forum: ['forum'],
  lostfound: ['lostFound'],
  marketplace: ['marketplace'],
  chat: ['chat'],
  subscription: ['subscription'],
  support: ['support'],
  builder: ['builder'],
  finance: ['finance', 'bills', 'payments'],
  meter: ['meters'],
};

export function RealtimeProvider({ children, enabled = true }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // called on every (re)connect so a refreshed access token is picked up
      auth: (cb) => cb({ token: tokens.access() }),
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      setConnected(false);
      // expired access token: refresh, then the client's auto-reconnect retries with the new one
      if (err.message === 'unauthorized') refreshSession().then(() => socket.connect()).catch(() => {});
    });

    socket.on('notification', (n) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      for (const key of KEYS_BY_TYPE[n.type] || ['dashboard']) qc.invalidateQueries({ queryKey: [key] });
      if (n.type === 'sos' || n.type === 'visitor') toast.success(n.title);
    });
    socket.on('invalidate', ({ keys }) => {
      for (const key of keys || []) qc.invalidateQueries({ queryKey: [key] });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [qc, toast, enabled]);

  return <RealtimeContext.Provider value={{ connected }}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);

// Polling interval to use for a live list: slow safety-net poll when the socket is up, fast poll when it's down.
export function useLiveInterval(fallbackMs) {
  const { connected } = useRealtime();
  return connected ? Math.max(fallbackMs * 6, 60000) : fallbackMs;
}
