import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, Input, Table } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { label, todayISO } from '../../../lib/format';
import { useStaffPerformance } from '../api';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA');

export default function StaffPerformancePage() {
  const [range, setRange] = useState({ from: daysAgo(30), to: todayISO() });
  const { data, isLoading } = useStaffPerformance(range);
  return (
    <div>
      <Link to="/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> Helpdesk</Link>
      <PageHeader title="Staff performance" description="Complaints raised in the period, by assignee." />
      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2">
        <Input label="From" type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </Card>
      <Card>
        <Table loading={isLoading} rows={data?.rows?.map((r) => ({ ...r, key: r.user._id }))} rowKey="key" empty="No assigned complaints in this period"
          columns={[
            { key: 'name', header: 'Staff', render: (r) => <div><p className="font-medium text-slate-900">{r.user.name}</p><p className="text-xs text-slate-500">{r.user.designation || label(r.user.role)}</p></div> },
            { key: 'assigned', header: 'Assigned', render: (r) => r.assigned },
            { key: 'resolved', header: 'Resolved', render: (r) => `${r.resolved}${r.open ? ` · ${r.open} open` : ''}` },
            { key: 'avg', header: 'Avg resolution', render: (r) => (r.avgResolutionHours == null ? '—' : `${r.avgResolutionHours} h`) },
            {
              key: 'sla', header: 'SLA met', render: (r) => (r.slaMetPercent == null ? '—' : (
                <span className={cn('font-medium', r.slaMetPercent >= 90 ? 'text-emerald-700' : r.slaMetPercent >= 70 ? 'text-amber-700' : 'text-red-700')}>{r.slaMetPercent}%</span>
              )),
            },
            { key: 'rating', header: 'Avg rating', render: (r) => (r.avgRating ? <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" />{r.avgRating} <span className="text-xs text-slate-400">({r.rated})</span></span> : '—') },
            { key: 'esc', header: 'Escalated', render: (r) => (r.escalated ? <Badge tone="amber">{r.escalated}</Badge> : 0) },
          ]}
        />
      </Card>
    </div>
  );
}
