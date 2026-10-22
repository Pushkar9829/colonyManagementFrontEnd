import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

// ---- colony admin: Settings → Appearance ----
export const useAppearanceOptions = () => useQuery({ queryKey: ['appearance', 'options'], queryFn: () => api.get('/appearance/options') });
export const useApplyTemplate = (o = {}) =>
  useApiMutation((template) => api.put('/appearance/template', { template }), { invalidate: ['appearance'], success: 'Template applied for the whole colony', ...o });
export const useSetMedia = (o = {}) => useApiMutation((body) => api.patch('/appearance/media', body), { invalidate: ['appearance'], success: 'Saved', ...o });

// ---- platform console ----
export const usePlatformTemplates = () => useQuery({ queryKey: ['platform', 'templates'], queryFn: () => api.get('/platform/templates') });
const platformInvalidate = [['platform', 'templates'], ['appearance']];
export const useSetTemplateEnabled = () =>
  useApiMutation(({ key, enabled }) => api.patch(`/platform/templates/${key}`, { enabled }), { invalidate: platformInvalidate, success: (_d, v) => (v.enabled ? 'Template switched on' : 'Template switched off') });
export const useSetDefaultTemplate = () =>
  useApiMutation((template) => api.put('/platform/templates/default', { template }), { invalidate: platformInvalidate, success: 'Default template changed' });
export const useSetPlanTemplates = () =>
  useApiMutation(({ plan, templates }) => api.put(`/platform/templates/plans/${plan}`, { templates }), { invalidate: platformInvalidate, success: 'Plan templates saved' });

export const useSocietyAppearance = (id) => useQuery({ queryKey: ['platform', 'templates', 'society', id], queryFn: () => api.get(`/platform/templates/societies/${id}`), enabled: Boolean(id) });
export const useUpdateSocietyAppearance = (id) =>
  useApiMutation((body) => api.patch(`/platform/templates/societies/${id}`, body), { invalidate: [['platform', 'templates']], success: 'Saved' });

export const useResellerTemplates = (id) => useQuery({ queryKey: ['platform', 'templates', 'reseller', id], queryFn: () => api.get(`/platform/templates/resellers/${id}`), enabled: Boolean(id) });
export const useUpdateResellerTemplates = (id) =>
  useApiMutation((body) => api.patch(`/platform/templates/resellers/${id}`, body), { invalidate: [['platform', 'templates']], success: 'Saved' });
