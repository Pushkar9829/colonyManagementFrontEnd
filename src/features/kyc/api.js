import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { label } from '../../lib/format';

export const ID_PROOFS = ['aadhaar', 'pan', 'passport', 'voter_id', 'driving_licence'];
export const OWNERSHIP_DOCS = ['sale_deed', 'possession_letter', 'allotment_letter'];
export const KYC_TYPE_OPTIONS = [...ID_PROOFS, ...OWNERSHIP_DOCS, 'photo', 'other'].map((v) => ({ value: v, label: v === 'pan' ? 'PAN' : label(v) }));
export const CATEGORY_LABELS = { id_proof: 'ID proof', photo: 'Photo', ownership: 'Ownership proof' };

const inv = { invalidate: ['kyc'] };

export const useMyKyc = () => useQuery({ queryKey: ['kyc', 'me'], queryFn: () => api.get('/kyc/me') });
export const useSubmitKyc = (o) => useApiMutation((b) => api.post('/kyc', b), { ...inv, success: 'Submitted for verification', ...o });
export const useDeleteKyc = () => useApiMutation((id) => api.del(`/kyc/${id}`), { ...inv, success: 'Removed' });

export const useKycQueue = (params) => useQuery({ queryKey: ['kyc', 'queue', params], queryFn: () => api.list('/kyc', params), placeholderData: (p) => p });
export const useKycCompletion = (params) => useQuery({ queryKey: ['kyc', 'completion', params], queryFn: () => api.list('/kyc/completion', params), placeholderData: (p) => p });
export const useVerifyKyc = () => useApiMutation((id) => api.post(`/kyc/${id}/verify`), { ...inv, success: 'Verified' });
export const useRejectKyc = () => useApiMutation(({ id, reason }) => api.post(`/kyc/${id}/reject`, { reason }), { ...inv, success: 'Rejected' });
