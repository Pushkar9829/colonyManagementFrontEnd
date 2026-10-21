import { useQuery } from '@tanstack/react-query';
import { api, upload } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

const inv = { invalidate: ['meters'] };

export const useMeters = (params) => useQuery({ queryKey: ['meters', 'list', params], queryFn: () => api.list('/meters', params), placeholderData: (p) => p });
export const useMeterReadings = (id, params) => useQuery({ queryKey: ['meters', 'readings', id, params], queryFn: () => api.list(`/meters/${id}/readings`, params), enabled: Boolean(id), placeholderData: (p) => p });
export const useReadingSheet = (params, enabled) => useQuery({ queryKey: ['meters', 'sheet', params], queryFn: () => api.get('/meters/sheet', params), enabled });
export const useConsumption = (params) => useQuery({ queryKey: ['meters', 'consumption', params], queryFn: () => api.get('/meters/consumption', params), enabled: Boolean(params.period) });
export const useTariffs = () => useQuery({ queryKey: ['meters', 'tariffs'], queryFn: () => api.get('/meters/tariffs') });

export const useCreateMeter = (o) => useApiMutation((b) => api.post('/meters', b), { ...inv, success: 'Meter added', ...o });
export const useUpdateMeter = (o) => useApiMutation(({ id, ...b }) => api.patch(`/meters/${id}`, b), { ...inv, success: 'Meter updated', ...o });
export const useReplaceMeter = (o) => useApiMutation(({ id, ...b }) => api.post(`/meters/${id}/replace`, b), { ...inv, success: (m) => tt('Replaced with {serial}', { serial: m.serial }), ...o });
export const useAddReading = (o) => useApiMutation(({ id, ...b }) => api.post(`/meters/${id}/readings`, b), { ...inv, success: 'Reading saved', ...o });
export const useDeleteReading = () => useApiMutation((id) => api.del(`/meters/readings/${id}`), { ...inv, success: 'Reading deleted' });
export const useBulkReadings = (o) => useApiMutation((b) => api.post('/meters/readings/bulk', b), { ...inv, success: (r) => (r.failed ? tt('{saved} readings saved, {failed} need attention', { saved: r.saved, failed: r.failed }) : tt('{saved} readings saved', { saved: r.saved })), ...o });
export const useImportReadings = (o) =>
  useApiMutation(
    (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return upload('/meters/readings/import', fd);
    },
    { ...inv, success: (r) => (r.failed ? tt('{saved} readings imported, {failed} rejected', { saved: r.saved, failed: r.failed }) : tt('{saved} readings imported', { saved: r.saved })), ...o },
  );
export const useSaveTariff = (o) =>
  useApiMutation(({ id, ...b }) => (id ? api.patch(`/meters/tariffs/${id}`, b) : api.post('/meters/tariffs', b)), { ...inv, success: 'Tariff saved', ...o });

export const METER_TYPES = [
  { value: 'water', label: 'Water', uom: 'kL' },
  { value: 'electricity', label: 'Electricity', uom: 'kWh' },
  { value: 'gas', label: 'Gas', uom: 'SCM' },
];
export const uomOf = (type) => METER_TYPES.find((t) => t.value === type)?.uom || '';
