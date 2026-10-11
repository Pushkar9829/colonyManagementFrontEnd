import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const useMovements = (params, options) =>
  useQuery({ queryKey: ['vehicleMovements', params], queryFn: () => api.list('/vehicles/movements', params), placeholderData: (p) => p, ...options });
export const useLogMovement = (o) =>
  useApiMutation((b) => api.post('/vehicles/movements', b), {
    invalidate: ['vehicleMovements'],
    success: (m) => `${m.plate}: ${m.decision === 'allow' ? 'allowed' : 'hold'} — ${m.reason}`,
    ...o,
  });
export const lookupPlate = (plate, direction = 'in') => api.get('/vehicles/lookup', { plate, direction });

export const useGates = () => useQuery({ queryKey: ['barrierCommands', 'gates'], queryFn: () => api.get('/gate-devices/gates'), staleTime: 5 * 60000 });
export const useBarrierCommands = (params, options) => useQuery({ queryKey: ['barrierCommands', params], queryFn: () => api.list('/gate-devices/barrier/commands', params), ...options });
export const useOpenBarrier = (o) =>
  useApiMutation((b) => api.post('/gate-devices/barrier/open', b), { invalidate: ['barrierCommands'], success: (c) => `Open command sent to ${c.gate}`, ...o });
