import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useLiveInterval } from '../../realtime/RealtimeProvider';
import { useApiMutation } from '../../hooks/useApiMutation';

export function useSosAlerts(params) {
  const refetchInterval = useLiveInterval(10000);
  return useQuery({ queryKey: ['sos', params], queryFn: () => api.list('/sos', params), refetchInterval });
}

export const useRaiseSos = (opts) =>
  useApiMutation((body) => api.post('/sos', body), { invalidate: ['sos'], success: 'SOS sent. Security has been alerted.', ...opts });

export const useAcknowledgeSos = () => useApiMutation((id) => api.post(`/sos/${id}/acknowledge`), { invalidate: ['sos', 'dashboard'], success: 'Acknowledged' });

export const useResolveSos = () =>
  useApiMutation(({ id, resolutionNote }) => api.post(`/sos/${id}/resolve`, { resolutionNote }), { invalidate: ['sos', 'dashboard'], success: 'Marked resolved' });
