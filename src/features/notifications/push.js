import { api } from '../../api/client';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) || navigator.serviceWorker.register('/sw.js');
}

// 'unsupported' | 'disabled' (server has no keys) | 'denied' | 'on' | 'off'
export async function pushState() {
  if (!supported()) return 'unsupported';
  const cfg = await api.get('/notifications/push/config');
  if (!cfg.enabled) return 'disabled';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enablePush() {
  const cfg = await api.get('/notifications/push/config');
  if (!cfg.enabled) throw new Error('Push notifications are not configured on the server');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked for this site in your browser settings');
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) }));
  const json = sub.toJSON();
  await api.post('/notifications/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

// On logout, stop this device receiving the previous user's pushes.
export const unsubscribeOnLogout = () => (supported() ? disablePush().catch(() => {}) : Promise.resolve());
