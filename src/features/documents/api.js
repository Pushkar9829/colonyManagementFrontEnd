import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { tt } from '../../lib/i18n/toastText';

const inv = { invalidate: ['documents'] };

export const useFolders = () => useQuery({ queryKey: ['documents', 'folders'], queryFn: () => api.get('/documents/folders') });
export const useDocumentTags = () => useQuery({ queryKey: ['documents', 'tags'], queryFn: () => api.get('/documents/tags'), staleTime: 60000 });
export const useDocuments = (params) => useQuery({ queryKey: ['documents', 'list', params], queryFn: () => api.list('/documents', params), placeholderData: (p) => p });
export const useDocument = (id) => useQuery({ queryKey: ['documents', 'detail', id], queryFn: () => api.get(`/documents/${id}`), enabled: Boolean(id) });
export const useDownloadLog = (id, enabled) => useQuery({ queryKey: ['documents', 'downloads', id], queryFn: () => api.get(`/documents/${id}/downloads`, { limit: 50 }), enabled: Boolean(id) && enabled });

export const useCreateFolder = (o) => useApiMutation((b) => api.post('/documents/folders', b), { ...inv, success: 'Folder created', ...o });
export const useUploadDocument = (o) => useApiMutation((b) => api.post('/documents', b), { ...inv, success: 'Document uploaded', ...o });
export const useUpdateDocument = (o) => useApiMutation(({ id, ...b }) => api.patch(`/documents/${id}`, b), { ...inv, success: 'Saved', ...o });
export const useAddVersion = (o) => useApiMutation(({ id, ...b }) => api.post(`/documents/${id}/versions`, b), { ...inv, success: (d) => tt('Version {n} uploaded', { n: d.currentVersion }), ...o });
export const useArchiveDocument = () => useApiMutation(({ id, archived }) => api.post(`/documents/${id}/${archived ? 'archive' : 'restore'}`), { ...inv, success: (d) => (d.archived ? 'Archived' : 'Restored') });

// Records the download server-side, then opens the file. The tab is opened before the request
// so popup blockers treat it as part of the click.
export async function openDocument(id, version) {
  const tab = window.open('', '_blank');
  try {
    const file = await api.get(`/documents/${id}/download`, version ? { version } : undefined);
    if (tab) {
      tab.opener = null;
      tab.location.href = file.url;
    } else window.location.href = file.url;
    return file;
  } catch (err) {
    tab?.close();
    throw err;
  }
}
