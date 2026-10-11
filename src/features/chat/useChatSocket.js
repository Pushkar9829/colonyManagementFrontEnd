import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { BASE_URL, refreshSession, tokens } from '../../api/client';

// Same origin as the app-wide RealtimeProvider socket (BASE_URL minus /api/v1).
const SOCKET_URL = new URL(BASE_URL).origin;

// A dedicated socket for the messages screen, so chat events (chat:message / chat:typing / chat:read)
// arrive instantly without touching the shared realtime provider. Handlers are read through a ref,
// so passing new callbacks on every render doesn't reconnect.
export function useChatSocket(handlers, enabled = true) {
  const ref = useRef(handlers);
  const [connected, setConnected] = useState(false);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: tokens.access() }),
    });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      setConnected(false);
      if (err.message === 'unauthorized') refreshSession().then(() => socket.connect()).catch(() => {});
    });
    socket.on('chat:message', (m) => ref.current.onMessage?.(m));
    socket.on('chat:typing', (t) => ref.current.onTyping?.(t));
    socket.on('chat:read', (r) => ref.current.onRead?.(r));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled]);

  return { connected };
}
