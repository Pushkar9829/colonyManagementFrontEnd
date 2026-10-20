import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useT } from '../../context/LanguageContext';

export const useNotices = (params) => useQuery({ queryKey: ['notices', params], queryFn: () => api.list('/notices', params), placeholderData: (p) => p });
export const useNoticeAcks = (id) => useQuery({ queryKey: ['notices', 'acks', id], queryFn: () => api.get(`/notices/${id}/acks`), enabled: Boolean(id) });
export const useCreateNotice = (o) =>
  useApiMutation((b) => api.post('/notices', b), { invalidate: ['notices'], success: (n) => (n.scheduled ? 'Notice scheduled' : 'Notice published'), ...o });
export const useUpdateNotice = () => useApiMutation(({ id, ...b }) => api.patch(`/notices/${id}`, b), { invalidate: ['notices'] });
export const useDeleteNotice = () => useApiMutation((id) => api.del(`/notices/${id}`), { invalidate: ['notices'], success: 'Notice deleted' });
export const useMarkNoticeRead = () => useApiMutation((id) => api.post(`/notices/${id}/read`), { invalidate: ['notices', 'dashboard'], toastErrors: false });
export const useAckNotice = () => useApiMutation((id) => api.post(`/notices/${id}/ack`), { invalidate: ['notices', 'dashboard'], success: 'Thanks for confirming' });
export const useRemindAcks = () => {
  const { t } = useT();
  return useApiMutation((id) => api.post(`/notices/${id}/acks/remind`), { invalidate: ['notices'], success: (r) => t('Reminder sent to {n}', { n: r.reminded }) });
};
