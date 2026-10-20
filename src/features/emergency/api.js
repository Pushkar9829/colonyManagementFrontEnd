import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';

// Key prefixes match the server's realtime invalidation: 'emergency', 'children', 'childAlerts'.

export const CONTACT_CATEGORIES = ['ambulance', 'hospital', 'police', 'fire', 'pharmacy', 'doctor', 'electrician', 'plumber', 'lift', 'gas', 'security', 'management', 'other'];

// ---- directory ----
export const useContacts = (all = false) =>
  useQuery({ queryKey: ['emergency', 'contacts', { all }], queryFn: () => api.get('/emergency/contacts', all ? { all: true } : undefined), placeholderData: (p) => p });
export const useCreateContact = (o) => useApiMutation((b) => api.post('/emergency/contacts', b), { invalidate: ['emergency'], success: 'Contact added', ...o });
export const useUpdateContact = (o) => useApiMutation(({ id, ...b }) => api.patch(`/emergency/contacts/${id}`, b), { invalidate: ['emergency'], success: 'Contact saved', ...o });
export const useRemoveContact = () => useApiMutation((id) => api.del(`/emergency/contacts/${id}`), { invalidate: ['emergency'], success: 'Contact removed' });
export const useReorderContacts = () => useApiMutation((ids) => api.post('/emergency/contacts/reorder', { ids }), { invalidate: ['emergency'] });

// ---- children ----
export const useChildren = (params, options) =>
  useQuery({ queryKey: ['children', params], queryFn: () => api.list('/emergency/children', params), placeholderData: (p) => p, ...options });
export const useCreateChild = (o) => useApiMutation((b) => api.post('/emergency/children', b), { invalidate: ['children'], success: 'Child added', ...o });
export const useUpdateChild = (o) => useApiMutation(({ id, ...b }) => api.patch(`/emergency/children/${id}`, b), { invalidate: ['children'], success: 'Saved', ...o });
export const useRemoveChild = () => useApiMutation((id) => api.del(`/emergency/children/${id}`), { invalidate: ['children'], success: 'Removed' });
export const useRaiseExitAlert = (o) => {
  const { t } = useT();
  return useApiMutation(({ id, ...b }) => api.post(`/emergency/children/${id}/exit-alert`, b), {
    invalidate: ['childAlerts'],
    success: (a) => (a.child?.name ? t('Parents of {name} alerted', { name: a.child.name }) : t('Parents of the child alerted')),
    ...o,
  });
};

// ---- child exit alerts ----
export const useChildAlerts = (params, options) =>
  useQuery({ queryKey: ['childAlerts', params], queryFn: () => api.list('/emergency/child-alerts', params), placeholderData: (p) => p, ...options });
export const useAcknowledgeAlert = (o) =>
  useApiMutation(({ id, ...b }) => api.post(`/emergency/child-alerts/${id}/acknowledge`, b), {
    invalidate: ['childAlerts', 'notifications'],
    // plain strings: useApiMutation translates them
    success: (a) => (a.response === 'stop' ? 'Guard asked to hold your child' : 'Guard told it is OK'),
    ...o,
  });

export const telHref = (phone) => `tel:${String(phone || '').replace(/[\s-]/g, '')}`;
