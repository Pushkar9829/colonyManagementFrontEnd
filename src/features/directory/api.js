import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';

export const useDirectory = (params) => useQuery({ queryKey: ['directory', 'list', params], queryFn: () => api.list('/directory', params), placeholderData: (p) => p });
export const useDirectoryContacts = () => useQuery({ queryKey: ['directory', 'contacts'], queryFn: () => api.get('/directory/contacts'), staleTime: 60000 });
export const useMyDirectoryProfile = () => useQuery({ queryKey: ['directory', 'me'], queryFn: () => api.get('/directory/me') });
export const useUpdateDirectoryProfile = (o) => useApiMutation((b) => api.patch('/directory/me', b), { invalidate: ['directory', 'chat'], success: 'Privacy settings saved', ...o });
