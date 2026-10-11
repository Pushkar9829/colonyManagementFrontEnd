import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

const inv = { invalidate: ['marketplace'] };

export const useListings = (params) => useQuery({ queryKey: ['marketplace', 'listings', params], queryFn: () => api.list('/marketplace/listings', params), placeholderData: (p) => p });
export const useListing = (id) => useQuery({ queryKey: ['marketplace', 'listing', id], queryFn: () => api.get(`/marketplace/listings/${id}`), enabled: Boolean(id) });
export const useListingReports = (enabled, params) => useQuery({ queryKey: ['marketplace', 'reports', params], queryFn: () => api.list('/marketplace/reports', params), enabled });
export const useBusinesses = (params) => useQuery({ queryKey: ['marketplace', 'businesses', params], queryFn: () => api.list('/marketplace/businesses', params), placeholderData: (p) => p });

export const useCreateListing = (o) => useApiMutation((b) => api.post('/marketplace/listings', b), { ...inv, success: 'Listing posted', ...o });
export const useUpdateListing = (o) => useApiMutation(({ id, ...b }) => api.patch(`/marketplace/listings/${id}`, b), { ...inv, success: 'Listing updated', ...o });
export const useListingStatus = () =>
  useApiMutation(({ id, status }) => api.post(`/marketplace/listings/${id}/status`, { status }), { ...inv, success: (l) => ({ sold: 'Marked as sold', closed: 'Listing closed', active: 'Listing is live again' }[l.status]) });
export const useDeleteListing = (o) => useApiMutation((id) => api.del(`/marketplace/listings/${id}`), { ...inv, success: 'Listing removed', ...o });
export const useReportListing = (o) => useApiMutation(({ id, ...b }) => api.post(`/marketplace/listings/${id}/report`, b), { ...inv, success: 'Reported to the moderators', ...o });
export const useContactSeller = (o) => useApiMutation(({ id, message }) => api.post(`/marketplace/listings/${id}/contact`, { message }), { invalidate: ['chat'], ...o });
export const useResolveListingReport = () =>
  useApiMutation(({ id, action, reason }) => api.post(`/marketplace/reports/${id}/resolve`, { action, reason }), { ...inv, success: (_d, v) => (v.action === 'remove' ? 'Listing removed' : 'Report dismissed') });

export const useCreateBusiness = (o) => useApiMutation((b) => api.post('/marketplace/businesses', b), { ...inv, success: 'Sent for admin approval', ...o });
export const useUpdateBusiness = (o) => useApiMutation(({ id, ...b }) => api.patch(`/marketplace/businesses/${id}`, b), { ...inv, success: 'Updated — waiting for re-approval', ...o });
export const useReviewBusiness = () =>
  useApiMutation(({ id, ...b }) => api.post(`/marketplace/businesses/${id}/review`, b), { ...inv, success: (b) => (b.status === 'approved' ? 'Business approved' : 'Business rejected') });
export const useDeleteBusiness = () => useApiMutation((id) => api.del(`/marketplace/businesses/${id}`), { ...inv, success: 'Business removed' });
export const useContactBusiness = (o) => useApiMutation(({ id, message }) => api.post(`/marketplace/businesses/${id}/contact`, { message }), { invalidate: ['chat'], ...o });
