import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export const usePortfolio = () => useQuery({ queryKey: ['portfolio'], queryFn: () => api.get('/portfolio'), refetchInterval: 120000 });
