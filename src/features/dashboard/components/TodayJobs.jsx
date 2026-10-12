import { Link } from 'react-router-dom';
import { ClipboardCheck, Hammer, Wrench } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, Spinner } from '../../../components/ui';
import { date, label, time, todayISO } from '../../../lib/format';
import { useRuns, useTasks, useWorkOrders } from '../../maintenance/api';
import { RUN_TONES, TASK_TONES, WO_TONES } from '../../maintenance/constants';

// Staff home: everything due today in one list. Each row opens My work, where the job is done.
export function TodayJobs() {
  const today = todayISO();
  const runs = useRuns({ date: today, mine: true, limit: 20 });
  const tasks = useTasks({ mine: true, open: true, to: today, limit: 20 });
  const wos = useWorkOrders({ open: true, mine: true, limit: 20 });
  const loading = runs.isLoading || tasks.isLoading || wos.isLoading;
  const items = [
    ...(runs.data?.data || []).filter((r) => r.status === 'pending' || r.status === 'rejected').map((r) => ({ id: r._id, icon: ClipboardCheck, title: r.name, sub: `Checklist · ${r.slot} · by ${time(r.dueAt)}`, tone: RUN_TONES[r.status], status: r.status === 'rejected' ? 'redo' : r.status })),
    ...(tasks.data?.data || []).map((x) => ({ id: x._id, icon: Wrench, title: x.title, sub: `Maintenance · ${x.asset?.name || ''} · due ${date(x.dueDate)}`, tone: TASK_TONES[x.status], status: x.status })),
    ...(wos.data?.data || []).map((w) => ({ id: w._id, icon: Hammer, title: w.title, sub: `Work order ${w.number}${w.asset ? ` · ${w.asset.name}` : ''}`, tone: WO_TONES[w.status], status: w.status })),
  ];
  return (
    <Card>
      <CardHeader title="Due today" subtitle="Checklists, maintenance and work orders" action={<Link to="/my-work" className="text-sm font-medium text-brand-600 hover:underline">My work</Link>} />
      {loading ? (
        <div className="flex justify-center p-6"><Spinner /></div>
      ) : !items.length ? (
        <EmptyState icon={ClipboardCheck} title="Nothing else due today" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map(({ id, icon: Icon, title, sub, tone, status }) => (
            <li key={id}>
              <Link to="/my-work" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <div className="flex min-w-0 items-start gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{title}</p>
                    <p className="truncate text-xs text-slate-500">{sub}</p>
                  </div>
                </div>
                <Badge tone={tone}>{label(status)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
