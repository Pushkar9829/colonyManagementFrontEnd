import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, History, XCircle } from 'lucide-react';
import { Badge, Card, EmptyState, Input, Pagination, Select, Spinner } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, time } from '../../../lib/format';
import { usePatrolRounds, usePatrolRoutes } from '../api';
import { rangeQuery, RoundStatus } from './shared';

const STATUSES = ['completed', 'partial', 'missed', 'in_progress', 'pending'].map((v) => ({ value: v, label: v.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) }));

function RoundRow({ round }) {
  const [open, setOpen] = useState(false);
  const scanned = round.scans?.length || 0;
  return (
    <li>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{round.route?.name || 'Deleted route'}</p>
          <p className="text-xs text-slate-500">{date(round.dueAt)} · {time(round.dueAt)} – {time(round.windowEnd)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-xs text-slate-500">{scanned}/{round.expected}</span>
          {round.inOrder === false && <Badge tone="amber">Out of order</Badge>}
          <RoundStatus status={round.status} />
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 bg-slate-50 px-4 py-3 text-sm">
          {scanned ? (
            <ul className="space-y-1.5">
              {round.scans.map((s, i) => (
                <li key={`${s.checkpoint?._id || i}`} className="flex flex-wrap items-center gap-x-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="font-medium text-slate-800">{s.checkpoint?.name || 'Removed checkpoint'}</span>
                  <span className="text-xs text-slate-500">{time(s.scannedAt)} · {s.guard?.name || '—'}</span>
                  {s.gpsOk === false && <span className="flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="size-3.5" />GPS mismatch</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No checkpoints scanned.</p>
          )}
          {round.missedCheckpoints?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">Missed</p>
              <ul className="space-y-1">
                {round.missedCheckpoints.map((c) => (
                  <li key={c._id} className="flex items-center gap-2 text-slate-700"><XCircle className="size-4 text-red-500" />{c.name}</li>
                ))}
              </ul>
            </div>
          )}
          {round.completedAt && <p className="text-xs text-slate-500">Completed at {time(round.completedAt)}</p>}
        </div>
      )}
    </li>
  );
}

export function RoundsTab() {
  const { data: routes = [] } = usePatrolRoutes();
  const [filters, setFilters] = useState({ status: '', route: '', fromDate: '', toDate: '', page: 1 });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const { fromDate, toDate, ...rest } = filters;
  const params = Object.fromEntries(Object.entries({ ...rest, ...rangeQuery(fromDate, toDate), limit: 20 }).filter(([, v]) => v !== '' && v !== undefined));
  const { data, isLoading } = usePatrolRounds(params);

  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select placeholder="All statuses" options={STATUSES} value={filters.status} onChange={set('status')} />
        <Select placeholder="All routes" options={routes.map((r) => ({ value: r._id, label: r.name }))} value={filters.route} onChange={set('route')} />
        <Input type="date" aria-label="From date" value={filters.fromDate} max={filters.toDate || undefined} onChange={set('fromDate')} />
        <Input type="date" aria-label="To date" value={filters.toDate} min={filters.fromDate || undefined} onChange={set('toDate')} />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.data?.length ? (
        <EmptyState icon={History} title="No rounds found" description="Rounds appear once a guard scans a checkpoint or a round window closes." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((r) => <RoundRow key={r._id} round={r} />)}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}
