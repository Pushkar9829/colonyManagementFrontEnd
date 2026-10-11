import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useLiveInterval } from '../../realtime/RealtimeProvider';

// Every key starts with 'patrols' so server-side realtime invalidation refreshes them all.
const inv = { invalidate: ['patrols'] };

export const useCurrentPatrol = () => {
  const refetchInterval = useLiveInterval(15000);
  return useQuery({ queryKey: ['patrols', 'current'], queryFn: () => api.get('/patrols/current'), refetchInterval });
};
export const useCheckpoints = (params) => useQuery({ queryKey: ['patrols', 'checkpoints', params], queryFn: () => api.get('/patrols/checkpoints', params) });
export const usePatrolRoutes = () => useQuery({ queryKey: ['patrols', 'routes'], queryFn: () => api.get('/patrols/routes') });
export const usePatrolRounds = (params) => useQuery({ queryKey: ['patrols', 'rounds', params], queryFn: () => api.list('/patrols/rounds', params), placeholderData: (p) => p });
export const usePatrolReport = (params, enabled = true) => useQuery({ queryKey: ['patrols', 'report', params], queryFn: () => api.get('/patrols/report', params), enabled });

export const useScanCheckpoint = (o) => useApiMutation((b) => api.post('/patrols/scan', b), { ...inv, toastErrors: false, ...o });

export const useCreateCheckpoint = (o) => useApiMutation((b) => api.post('/patrols/checkpoints', b), { ...inv, success: 'Checkpoint added', ...o });
export const useUpdateCheckpoint = (o) => useApiMutation(({ id, ...b }) => api.patch(`/patrols/checkpoints/${id}`, b), { ...inv, success: 'Checkpoint saved', ...o });
export const useDeleteCheckpoint = (o) => useApiMutation((id) => api.del(`/patrols/checkpoints/${id}`), { ...inv, success: 'Checkpoint deleted', ...o });

export const useCreateRoute = (o) => useApiMutation((b) => api.post('/patrols/routes', b), { ...inv, success: 'Route created', ...o });
export const useUpdateRoute = (o) => useApiMutation(({ id, ...b }) => api.patch(`/patrols/routes/${id}`, b), { ...inv, success: 'Route saved', ...o });
export const useDeleteRoute = (o) => useApiMutation((id) => api.del(`/patrols/routes/${id}`), { ...inv, success: 'Route deleted', ...o });

// Resolves to { lat, lng, accuracyM } or null when GPS is unavailable/denied/slow; never rejects.
export function getPosition(timeout = 5000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 10000 },
    );
    return undefined;
  });
}
