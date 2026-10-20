import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';

// Every key starts with 'guardDuty' so server-side realtime invalidation refreshes them all.
const inv = { invalidate: ['guardDuty'] };

export const SHIFTS = ['morning', 'afternoon', 'evening', 'night'];
export const INCIDENT_TYPES = ['theft', 'trespass', 'suspicious', 'fight', 'accident', 'damage', 'fire', 'medical', 'lost_found', 'noise', 'other'];
export const SEVERITY = ['low', 'medium', 'high', 'critical'];
export const OB_CATEGORIES = ['note', 'round', 'visitor', 'vehicle', 'incident', 'handover', 'key', 'maintenance', 'other'];
export const KEY_STATUSES = ['with_guard', 'issued', 'missing'];

export const useDutyGuards = (enabled = true) => useQuery({ queryKey: ['guardDuty', 'guards'], queryFn: () => api.get('/guard-duty/guards'), enabled, staleTime: 60000 });

export const useHandovers = (params) => useQuery({ queryKey: ['guardDuty', 'handovers', params], queryFn: () => api.list('/guard-duty/handovers', params), placeholderData: (p) => p });
export const useCreateHandover = (o) => useApiMutation((b) => api.post('/guard-duty/handovers', b), { ...inv, success: 'Shift handed over', ...o });
export const useAcknowledgeHandover = (o) => useApiMutation(({ id, ...b }) => api.post(`/guard-duty/handovers/${id}/acknowledge`, b), { ...inv, success: 'Handover acknowledged', ...o });

export const useIncidents = (params) => useQuery({ queryKey: ['guardDuty', 'incidents', params], queryFn: () => api.list('/guard-duty/incidents', params), placeholderData: (p) => p });
export const useIncident = (id) => useQuery({ queryKey: ['guardDuty', 'incidents', 'detail', id], queryFn: () => api.get(`/guard-duty/incidents/${id}`), enabled: Boolean(id) });
export const useCreateIncident = (o) => {
  const { t } = useT();
  return useApiMutation((b) => api.post('/guard-duty/incidents', b), { ...inv, success: (i) => t('Incident {number} reported', { number: i.number }), ...o });
};
export const useCloseIncident = (o) => useApiMutation(({ id, actionTaken }) => api.post(`/guard-duty/incidents/${id}/close`, { actionTaken }), { ...inv, success: 'Incident closed', ...o });

export const useOccurrenceBook = (date) => useQuery({ queryKey: ['guardDuty', 'book', date], queryFn: () => api.get('/guard-duty/occurrence-book', { date }) });
export const useAddOccurrence = (o) => useApiMutation((b) => api.post('/guard-duty/occurrence-book', b), { ...inv, success: 'Entry added', ...o });
