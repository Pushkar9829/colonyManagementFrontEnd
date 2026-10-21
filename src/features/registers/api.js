import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

const inv = { invalidate: ['registers'] };

export const useMyRegister = () => useQuery({ queryKey: ['registers', 'mine'], queryFn: () => api.get('/registers/mine') });
export const useRegisterMembers = (params, enabled = true) => useQuery({ queryKey: ['registers', 'members', params], queryFn: () => api.list('/registers/members', params), enabled, placeholderData: (p) => p });
export const useRegisterMember = (id) => useQuery({ queryKey: ['registers', 'member', id], queryFn: () => api.get(`/registers/members/${id}`), enabled: Boolean(id) });
export const useCertificates = (params, enabled = true) => useQuery({ queryKey: ['registers', 'certificates', params], queryFn: () => api.list('/registers/certificates', params), enabled, placeholderData: (p) => p });
export const useTransfers = (params, enabled = true) => useQuery({ queryKey: ['registers', 'transfers', params], queryFn: () => api.list('/registers/transfers', params), enabled, placeholderData: (p) => p });
export const useRegisterNominations = (params, enabled = true) => useQuery({ queryKey: ['registers', 'nominations', params], queryFn: () => api.list('/registers/nominations', params), enabled, placeholderData: (p) => p });
export const useUnitOptions = (enabled) => useQuery({ queryKey: ['units', 'options'], queryFn: () => api.get('/units', { limit: 100 }), enabled, staleTime: 60000 });

export const useAdmitMember = (o) => useApiMutation((b) => api.post('/registers/members', b), { ...inv, success: (m) => tt('Member No. {n} admitted', { n: m.memberNo }), ...o });
export const useCeaseMember = () => useApiMutation(({ id, ...b }) => api.post(`/registers/members/${id}/cease`, b), { ...inv, success: 'Membership ceased' });
export const useIssueCertificate = (o) => useApiMutation((b) => api.post('/registers/certificates', b), { ...inv, success: (c) => tt('Certificate No. {no} issued (shares {from}-{to})', { no: c.certificateNo, from: c.shareFrom, to: c.shareTo }), ...o });
export const useCancelCertificate = () => useApiMutation(({ id, reason }) => api.post(`/registers/certificates/${id}/cancel`, { reason }), { ...inv, success: 'Certificate cancelled' });
export const useTransfer = (o) => useApiMutation((b) => api.post('/registers/transfers', b), { ...inv, success: (t) => tt('Transfer No. {n} recorded', { n: t.transferNo }), ...o });
export const useRecordNomination = (o) => useApiMutation((b) => api.post('/registers/nominations', b), { ...inv, success: 'Nomination recorded', ...o });
export const useRevokeNomination = () => useApiMutation((id) => api.post(`/registers/nominations/${id}/revoke`), { ...inv, success: 'Nomination revoked' });
