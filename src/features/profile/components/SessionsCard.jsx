import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, Smartphone } from 'lucide-react';
import { api, tokens } from '../../../api/client';
import { Button, Card, CardHeader, Spinner } from '../../../components/ui';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { dateTime, timeAgo } from '../../../lib/format';

// Devices where this account is signed in, with remote sign-out.
export function SessionsCard() {
  const qc = useQueryClient();
  const refreshToken = tokens.refreshToken() || undefined;
  const { data = [], isLoading } = useQuery({ queryKey: ['sessions'], queryFn: () => api.post('/auth/sessions', { refreshToken }) });
  const revoke = useApiMutation((id) => api.del(`/auth/sessions/${id}`), { invalidate: ['sessions'], success: 'Device signed out' });
  const others = useApiMutation(() => api.post('/auth/sessions/revoke-others', { refreshToken }), {
    success: 'Signed out of all other devices',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  return (
    <Card>
      <CardHeader title="Where you're signed in" action={data.length > 1 && <Button size="sm" variant="secondary" loading={others.isPending} onClick={() => others.mutate()}>Sign out others</Button>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div> : (
        <ul className="divide-y divide-slate-100">
          {data.map((s) => {
            const Icon = /Android|iOS/.test(s.device) ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <Icon className="size-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{s.device}{s.current && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">This device</span>}</p>
                  <p className="text-xs text-slate-500">Active {timeAgo(s.lastUsedAt)} · signed in {dateTime(s.startedAt)}{s.ip ? ` · ${s.ip}` : ''}</p>
                </div>
                {!s.current && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>Sign out</Button>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
