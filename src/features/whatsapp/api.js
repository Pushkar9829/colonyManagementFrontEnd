import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

// The open society's WhatsApp mode (everyone) plus credits and usage (admin / accountant).
export const useWhatsApp = (enabled = true) => useQuery({ queryKey: ['whatsapp', 'me'], queryFn: () => api.get('/whatsapp'), staleTime: 5 * 60000, enabled });

// Platform console
export const usePlatformWhatsApp = (societyId) =>
  useQuery({ queryKey: ['platform', 'whatsapp', societyId], queryFn: () => api.get(`/platform/societies/${societyId}/whatsapp`), enabled: Boolean(societyId) });
export const usePlatformWhatsAppLedger = (societyId, params) =>
  useQuery({ queryKey: ['platform', 'whatsapp', societyId, 'ledger', params], queryFn: () => api.list(`/platform/societies/${societyId}/whatsapp/ledger`, params), enabled: Boolean(societyId), placeholderData: (p) => p });
export const useSetWhatsAppMode = (societyId, o) =>
  useApiMutation((b) => api.patch(`/platform/societies/${societyId}/whatsapp`, b), { invalidate: [['platform', 'whatsapp', societyId]], success: 'WhatsApp settings saved', ...o });
export const useAddWhatsAppCredits = (societyId, o) =>
  useApiMutation((b) => api.post(`/platform/societies/${societyId}/whatsapp/credits`, b), { invalidate: [['platform', 'whatsapp', societyId]], success: (d, v) => tt('{n} credits added', { n: v.amount }), ...o });
