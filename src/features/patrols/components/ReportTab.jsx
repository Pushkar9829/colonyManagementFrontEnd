import { useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPinOff, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, Input, Spinner, StatCard, Table } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, dateTime, time, todayISO } from '../../../lib/format';
import { usePatrolReport } from '../api';
import { rangeQuery, RoundStatus, shiftISO } from './shared';

const pctTone = (p) => (p == null ? 'text-slate-400' : p >= 90 ? 'text-emerald-700' : p >= 70 ? 'text-amber-700' : 'text-red-700');

export function ReportTab() {
  const [range, setRange] = useState(() => ({ from: shiftISO(todayISO(), -6), to: todayISO() }));
  const valid = range.from && range.to && range.from <= range.to;
  const { data, isLoading, error, refetch } = usePatrolReport(rangeQuery(range.from, range.to), Boolean(valid));
  const set = (k) => (e) => setRange((r) => ({ ...r, [k]: e.target.value }));

  const totals = (data?.routes || []).reduce((t, r) => ({ completed: t.completed + (r.completed || 0), partial: t.partial + (r.partial || 0), missed: t.missed + (r.missed || 0) }), { completed: 0, partial: 0, missed: 0 });
  const closed = totals.completed + totals.partial + totals.missed;
  const mismatches = (data?.guards || []).reduce((n, g) => n + g.gpsMismatch, 0);

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_2fr] sm:items-end">
        <Input label="From" type="date" value={range.from} max={range.to} onChange={set('from')} />
        <Input label="To" type="date" value={range.to} min={range.from} max={todayISO()} onChange={set('to')} />
        <p className="text-xs text-slate-500 sm:pb-3">Completion % counts closed rounds only (completed, partial and missed).</p>
      </Card>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CheckCircle2} tone="green" label="Completion" value={closed ? `${Math.round((totals.completed / closed) * 100)}%` : '—'} sub={`${totals.completed} of ${closed} rounds`} />
            <StatCard icon={AlertTriangle} tone="amber" label="Partial rounds" value={totals.partial} />
            <StatCard icon={ShieldAlert} tone="red" label="Missed rounds" value={totals.missed} />
            <StatCard icon={MapPinOff} tone="slate" label="GPS mismatches" value={mismatches} />
          </div>

          <Card>
            <CardHeader title="By route" />
            <Table
              rows={data.routes}
              rowKey="route"
              empty="No rounds in this period"
              columns={[
                { key: 'name', header: 'Route', render: (r) => <span className="font-medium text-slate-900">{r.name || 'Deleted route'}</span> },
                { key: 'total', header: 'Total' },
                { key: 'completed', header: 'Completed', render: (r) => r.completed || 0 },
                { key: 'partial', header: 'Partial', render: (r) => r.partial || 0 },
                { key: 'missed', header: 'Missed', render: (r) => r.missed || 0 },
                { key: 'completionRate', header: 'Completion', render: (r) => <span className={cn('font-semibold', pctTone(r.completionRate))}>{r.completionRate == null ? '—' : `${r.completionRate}%`}</span> },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="By guard" />
            <Table
              rows={data.guards}
              rowKey="guard"
              empty="No scans in this period"
              columns={[
                { key: 'name', header: 'Guard', render: (g) => <span className="font-medium text-slate-900">{g.name || 'Unknown'}</span> },
                { key: 'scans', header: 'Scans' },
                { key: 'gpsMismatch', header: 'GPS mismatch', render: (g) => <span className={g.gpsMismatch ? 'font-semibold text-amber-700' : ''}>{g.gpsMismatch}</span> },
                { key: 'lastScanAt', header: 'Last scan', render: (g) => dateTime(g.lastScanAt) },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Missed and partial rounds" subtitle={data.missed.length >= 200 ? 'Showing the latest 200' : undefined} />
            {!data.missed.length ? (
              <EmptyState icon={CheckCircle2} title="No missed rounds" description="Every closed round in this period was completed." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.missed.map((r) => (
                  <li key={r._id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{r.route?.name || 'Deleted route'}</p>
                      <p className="text-xs text-slate-500">{date(r.dueAt)} · {time(r.dueAt)} – {time(r.windowEnd)}</p>
                    </div>
                    <p className="text-xs text-slate-600 sm:max-w-xs">{r.missedCheckpoints?.map((c) => c.name).join(', ')}</p>
                    <RoundStatus status={r.status} className="self-start sm:self-center" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
