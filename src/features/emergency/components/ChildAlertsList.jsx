import { Baby, BellRing } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { Badge, Card, CardHeader, EmptyState, Spinner } from '../../../components/ui';
import { timeAgo, time } from '../../../lib/format';
import { useChildAlerts } from '../api';
import { useT } from '../../../context/LanguageContext';

export function ChildAvatar({ child, className = 'size-12' }) {
  return child?.photoUrl ? (
    <img src={child.photoUrl} alt={child.name} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400`}>
      <Baby className="size-1/2" />
    </div>
  );
}

// Parent's answer as the guard needs to see it: a glanceable OK / HOLD.
export function AlertOutcome({ a }) {
  const { t } = useT();
  if (a.status === 'open') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="amber">{t('Waiting for parent')}</Badge>
        {a.escalatedAt && <Badge tone="red">{t('Escalated')}</Badge>}
      </div>
    );
  }
  if (a.response === 'stop') {
    return <span className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white">{t('HOLD CHILD')}</span>;
  }
  return <span className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">{t('Parent says OK')}</span>;
}

// Read-only recent alerts for guards and managers.
export function ChildAlertsList({ title = 'Recent child exit alerts', limit = 20 }) {
  const live = useLiveInterval(5000);
  const { data, isLoading } = useChildAlerts({ limit }, { refetchInterval: live });
  const { t } = useT();
  return (
    <Card>
      <CardHeader title={title} />
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !data?.data.length ? (
        <EmptyState icon={BellRing} title="No alerts yet" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((a) => (
            <li key={a._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${a.response === 'stop' ? 'bg-red-50' : ''}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ChildAvatar child={a.child} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {a.child?.name || t('Child')}
                    {a.unit?.label ? <span className="font-normal text-slate-500"> · {a.unit.label}</span> : null}
                  </p>
                  <p className="text-sm text-slate-500">
                    {a.gate} · {time(a.createdAt)} ({timeAgo(a.createdAt)})
                    {a.raisedBy?.name ? ` · ${t('by {name}', { name: a.raisedBy.name })}` : ''}
                  </p>
                  {a.note && <p className="text-xs text-slate-500">{t('Guard: {note}', { note: a.note })}</p>}
                  {a.ackNote && <p className="text-xs font-medium text-slate-700">{t('Parent: {note}', { note: a.ackNote })}</p>}
                  {a.acknowledgedBy?.name && <p className="text-xs text-slate-400">{t('Answered by {name} at {time}', { name: a.acknowledgedBy.name, time: time(a.acknowledgedAt) })}</p>}
                </div>
              </div>
              <AlertOutcome a={a} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
