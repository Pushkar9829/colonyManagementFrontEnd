import { useState } from 'react';
import { Ban, Clock, Download, PackageCheck, ShieldAlert, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, EmptyState, ErrorState, Input, PageLoader, StatCard, Table } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../lib/cn';
import { dateTime, label, todayISO } from '../../../lib/format';
import { downloadFile, useVisitorAnalytics } from '../api';

const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA');
const startOf = (d) => new Date(`${d}T00:00:00`).toISOString();
const endOf = (d) => new Date(new Date(`${d}T00:00:00`).getTime() + 86400000).toISOString();

function duration(sec) {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

// Shade from the brand ramp by share of the busiest cell; empty cells stay neutral.
function heatClass(v, max) {
  if (!v) return 'bg-slate-50 text-slate-300';
  const r = v / max;
  if (r > 0.75) return 'bg-brand-700 text-white';
  if (r > 0.5) return 'bg-brand-600 text-white';
  if (r > 0.25) return 'bg-brand-500 text-white';
  return 'bg-brand-100 text-brand-700';
}

function PerDay({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="overflow-x-auto p-4">
      <div className="flex h-40 min-w-[480px] items-end gap-1" role="img" aria-label="Entries per day">
        {rows.map((r) => (
          <div key={r.date} className="group flex flex-1 flex-col items-center justify-end" title={`${r.date}: ${r.count}`}>
            <span className="mb-1 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">{r.count}</span>
            <div className="w-full rounded-t bg-brand-500" style={{ height: `${(r.count / max) * 100}%`, minHeight: r.count ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex min-w-[480px] justify-between text-[10px] text-slate-400">
        <span>{rows[0]?.date}</span>
        <span>{rows[rows.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function Heatmap({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.hours));
  // Monday first, as people read a week.
  const ordered = [...rows.slice(1), rows[0]];
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-[640px] border-separate border-spacing-0.5 text-[11px]">
        <thead>
          <tr>
            <th className="w-10" />
            {Array.from({ length: 24 }, (_, h) => <th key={h} className="font-normal text-slate-400">{String(h).padStart(2, '0')}</th>)}
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.dow}>
              <th className="pr-1 text-left font-medium text-slate-600">{r.day}</th>
              {r.hours.map((v, h) => (
                <td key={h} title={`${r.day} ${String(h).padStart(2, '0')}:00 — ${v} entr${v === 1 ? 'y' : 'ies'}`} className={`h-7 w-7 rounded text-center ${heatClass(v, max)}`}>
                  {v || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VisitorAnalyticsPage() {
  const toast = useToast();
  const [range, setRange] = useState({ from: isoDaysAgo(29), to: todayISO() });
  const [busy, setBusy] = useState(false);
  const params = { from: startOf(range.from), to: endOf(range.to) };
  const { data, isLoading, error, refetch } = useVisitorAnalytics(params);

  const exportXlsx = async () => {
    setBusy(true);
    try {
      await downloadFile('/visitors/analytics/export', params, 'visitors.xlsx');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Visitor analytics"
        description="Gate traffic, peak hours and how quickly households respond."
        actions={<Button variant="secondary" icon={Download} loading={busy} onClick={exportXlsx}>Export Excel</Button>}
      />
      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <Input label="From" type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} min={range.from} max={todayISO()} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick periods">
          {[7, 30, 90].map((n) => {
            const on = range.to === todayISO() && range.from === isoDaysAgo(n - 1);
            return (
              <button key={n} type="button" aria-pressed={on} onClick={() => setRange({ from: isoDaysAgo(n - 1), to: todayISO() })}
                className={cn('h-10 rounded-full border px-4 text-sm font-medium transition', on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>
                Last {n} days
              </button>
            );
          })}
        </div>
      </Card>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Entries" value={data.totals.total} sub={`${data.totals.guests} people`} icon={Users} />
            <StatCard label="Avg approval" value={duration(data.approval.avgSeconds)} sub={`${data.approval.responses} responses`} icon={Clock} tone="sky" />
            <StatCard label="Denied" value={data.totals.denied} sub={`${data.totals.blocked} by blocklist`} icon={Ban} tone="red" />
            <StatCard label="Watchlist flags" value={data.totals.watch} sub={`${data.totals.escalated} escalated`} icon={ShieldAlert} tone="amber" />
            <StatCard label="Left at gate" value={data.totals.leftAtGate} sub={`${data.totals.preApproved} pre-approved`} icon={PackageCheck} tone="green" />
          </div>
          {!data.totals.total ? (
            <Card><EmptyState title="No visitors in this period" /></Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Entries per day" />
                <PerDay rows={data.perDay} />
              </Card>
              <Card>
                <CardHeader title="Busy hours" subtitle="Entries by weekday and hour of arrival" />
                <Heatmap rows={data.heatmap} />
              </Card>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader title="By purpose" />
                  <ul className="space-y-3 p-4">
                    {data.byPurpose.map((p) => (
                      <li key={p.purpose}>
                        <div className="flex justify-between text-sm"><span className="text-slate-700">{label(p.purpose)}</span><span className="font-medium text-slate-900">{p.count}</span></div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(p.count / data.totals.total) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader title="Top frequent visitors" subtitle="Guests and service visits, 2+ times" />
                  <Table
                    rows={data.topVisitors.map((r, i) => ({ ...r, _id: `${r.phone || r.name}-${i}` }))}
                    empty="No repeat visitors"
                    columns={[
                      { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
                      { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
                      { key: 'visits', header: 'Visits' },
                      { key: 'lastAt', header: 'Last visit', render: (r) => dateTime(r.lastAt) },
                    ]}
                  />
                </Card>
              </div>
              {data.topCompanies.length > 0 && (
                <Card>
                  <CardHeader title="Delivery & cab companies" />
                  <div className="flex flex-wrap gap-2 p-4">
                    {data.topCompanies.map((c) => (
                      <span key={c.company} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">{c.company} <strong className="ml-1">{c.count}</strong></span>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
