import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

// Grouped results for the command palette: { q, groups: [{ type, items: [{ type, id, title, subtitle, link }] }] }
export const useGlobalSearch = (q, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get('/search', { q }),
    enabled: enabled && q.length >= 2,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
