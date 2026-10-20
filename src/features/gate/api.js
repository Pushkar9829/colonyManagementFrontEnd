import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';

export const useMovements = (params, options) =>
  useQuery({ queryKey: ['vehicleMovements', params], queryFn: () => api.list('/vehicles/movements', params), placeholderData: (p) => p, ...options });
export const useLogMovement = (o) => {
  const { t } = useT();
  return useApiMutation((b) => api.post('/vehicles/movements', b), {
    invalidate: ['vehicleMovements'],
    success: (m) => (m.decision === 'allow' ? t('{plate}: allowed — {reason}', { plate: m.plate, reason: m.reason }) : t('{plate}: hold — {reason}', { plate: m.plate, reason: m.reason })),
    ...o,
  });
};
export const lookupPlate = (plate, direction = 'in') => api.get('/vehicles/lookup', { plate, direction });

export const useGates = () => useQuery({ queryKey: ['barrierCommands', 'gates'], queryFn: () => api.get('/gate-devices/gates'), staleTime: 5 * 60000 });
export const useBarrierCommands = (params, options) => useQuery({ queryKey: ['barrierCommands', params], queryFn: () => api.list('/gate-devices/barrier/commands', params), ...options });
export const useOpenBarrier = (o) => {
  const { t } = useT();
  return useApiMutation((b) => api.post('/gate-devices/barrier/open', b), { invalidate: ['barrierCommands'], success: (c) => t('Open command sent to {gate}', { gate: c.gate }), ...o });
};
