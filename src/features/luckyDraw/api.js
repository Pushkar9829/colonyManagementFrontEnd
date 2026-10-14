import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['luckyDraws', 'notifications'] };

export const useLuckyDraws = (params) => useQuery({ queryKey: ['luckyDraws', 'list', params], queryFn: () => api.list('/lucky-draws', params), placeholderData: (p) => p });
export const useLuckyDraw = (id) => useQuery({ queryKey: ['luckyDraws', 'detail', id], queryFn: () => api.get(`/lucky-draws/${id}`), enabled: Boolean(id) });
export const useDrawEntries = (id, params, enabled) =>
  useQuery({ queryKey: ['luckyDraws', 'entries', id, params], queryFn: () => api.list(`/lucky-draws/${id}/entries`, params), enabled, placeholderData: (p) => p });
export const useVerifyDraw = (id, enabled) => useQuery({ queryKey: ['luckyDraws', 'verify', id], queryFn: () => api.get(`/lucky-draws/${id}/verify`), enabled });

export const useCreateDraw = (o) => useApiMutation((b) => api.post('/lucky-draws', b), { ...inv, success: 'Draft saved', ...o });
export const useUpdateDraw = (o) => useApiMutation(({ id, ...b }) => api.patch(`/lucky-draws/${id}`, b), { ...inv, success: 'Draw updated', ...o });
export const usePublishDraw = (o) => useApiMutation((id) => api.post(`/lucky-draws/${id}/publish`), { ...inv, success: 'Published — members have been told', ...o });
export const useCloseDraw = (o) => useApiMutation((id) => api.post(`/lucky-draws/${id}/close`), { ...inv, success: 'Entries closed', ...o });
export const useRunDraw = (o) => useApiMutation((id) => api.post(`/lucky-draws/${id}/draw`), { ...inv, success: 'Draw complete — winners notified', ...o });
export const useCancelDraw = (o) => useApiMutation(({ id, reason }) => api.post(`/lucky-draws/${id}/cancel`, { reason }), { ...inv, success: 'Draw cancelled', ...o });
export const useEnterDraw = (o) => useApiMutation((id) => api.post(`/lucky-draws/${id}/entry`), { ...inv, success: "You're in! Good luck", ...o });
export const useWithdrawEntry = (o) => useApiMutation((id) => api.del(`/lucky-draws/${id}/entry`), { ...inv, success: 'Entry withdrawn', ...o });
export const usePromoteReserve = (o) =>
  useApiMutation(({ id, winnerId, reason }) => api.post(`/lucky-draws/${id}/winners/${winnerId}/promote`, { reason }), { ...inv, success: 'Next reserve promoted and notified', ...o });
export const useHandover = (o) =>
  useApiMutation(({ id, winnerId, ...b }) => api.post(`/lucky-draws/${id}/winners/${winnerId}/handover`, b), { ...inv, success: 'Marked as handed over', ...o });

// platform console
export const usePlatformDraws = (params) =>
  useQuery({ queryKey: ['platform', 'luckyDraws', params], queryFn: () => api.list('/platform/lucky-draws', params), placeholderData: (p) => p });
export const usePlatformCancelDraw = (o) =>
  useApiMutation(({ id, reason }) => api.post(`/platform/lucky-draws/${id}/cancel`, { reason }), { invalidate: [['platform', 'luckyDraws']], success: 'Draw cancelled', ...o });
