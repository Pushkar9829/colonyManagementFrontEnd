import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { put } from './shared';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['assets'] };
const fireInv = { invalidate: ['fire'] };

export const useAssets = (params, enabled = true) => useQuery({ queryKey: ['assets', 'list', params], queryFn: () => api.list('/assets', params), placeholderData: (p) => p, enabled });
export const useAssetStats = (enabled = true) => useQuery({ queryKey: ['assets', 'stats'], queryFn: () => api.get('/assets/stats'), enabled });
export const useAsset = (id) => useQuery({ queryKey: ['assets', 'detail', id], queryFn: () => api.get(`/assets/${id}`), enabled: Boolean(id) });
export const useAssetTimeline = (id, page = 1) => useQuery({ queryKey: ['assets', 'timeline', id, page], queryFn: () => api.list(`/assets/${id}/timeline`, { page, limit: 20 }), enabled: Boolean(id), placeholderData: (p) => p });
export const useAmcVisits = (id, enabled) => useQuery({ queryKey: ['assets', 'amc-visits', id], queryFn: () => api.get(`/assets/${id}/amc-visits`), enabled: Boolean(id) && enabled });
export const lookupAssetCode = (code) => api.get(`/assets/by-code/${encodeURIComponent(code)}`);

export const useCreateAsset = (o) => useApiMutation((b) => api.post('/assets', b), { ...inv, success: (a) => `Asset ${a.code} registered`, ...o });
export const useUpdateAsset = (o) => useApiMutation(({ id, ...b }) => api.patch(`/assets/${id}`, b), { ...inv, success: 'Asset updated', ...o });
export const useAssetStatus = (o) => useApiMutation(({ id, ...b }) => api.post(`/assets/${id}/status`, b), { ...inv, success: 'Status changed', ...o });
export const useAddAssetFiles = (o) => useApiMutation(({ id, ...b }) => api.post(`/assets/${id}/files`, b), { ...inv, success: 'Files added', ...o });
export const useRemoveAssetFile = (o) => useApiMutation(({ id, ...b }) => api.post(`/assets/${id}/files/remove`, b), { ...inv, success: 'File removed', ...o });
export const useSetAmc = (o) => useApiMutation(({ id, ...b }) => put(`/assets/${id}/amc`, b), { ...inv, success: 'AMC saved', ...o });
export const useAddAmcVisit = (o) => useApiMutation(({ id, ...b }) => api.post(`/assets/${id}/amc-visits`, b), { ...inv, success: 'Visit logged', ...o });
export const useAddAssetEvent = (o) => useApiMutation(({ id, ...b }) => api.post(`/assets/${id}/events`, b), { ...inv, success: 'Added to service history', ...o });

// fire safety
export const useFireSummary = () => useQuery({ queryKey: ['fire', 'summary'], queryFn: () => api.get('/fire-safety/summary') });
export const useExtinguishers = (params) => useQuery({ queryKey: ['fire', 'extinguishers', params], queryFn: () => api.list('/fire-safety/extinguishers', params), placeholderData: (p) => p });
export const useDrills = (params) => useQuery({ queryKey: ['fire', 'drills', params], queryFn: () => api.list('/fire-safety/drills', params), placeholderData: (p) => p });
export const useNocs = (enabled = true) => useQuery({ queryKey: ['fire', 'nocs'], queryFn: () => api.get('/fire-safety/nocs'), enabled });
export const useCreateExtinguisher = (o) => useApiMutation((b) => api.post('/fire-safety/extinguishers', b), { ...fireInv, success: 'Extinguisher added', ...o });
export const useUpdateExtinguisher = (o) => useApiMutation(({ id, ...b }) => api.patch(`/fire-safety/extinguishers/${id}`, b), { ...fireInv, success: 'Saved', ...o });
export const useRefillExtinguisher = (o) => useApiMutation(({ id, ...b }) => api.post(`/fire-safety/extinguishers/${id}/refill`, b), { ...fireInv, success: 'Refill recorded', ...o });
export const useCreateDrill = (o) => useApiMutation((b) => api.post('/fire-safety/drills', b), { ...fireInv, success: 'Drill logged', ...o });
export const useCreateNoc = (o) => useApiMutation((b) => api.post('/fire-safety/nocs', b), { ...fireInv, success: 'NOC saved', ...o });
