import { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, FilterBar, Input, Pagination, Select, Table } from '../../../components/ui';
import { dateTime, timeAgo } from '../../../lib/format';
import { usePlatformSocieties } from '../api';
import { PermissionGate } from '../components/PermissionGate';
import { ACTION_AREAS, ACTION_LABELS, actionLabel, describeDetails } from '../activityLabels';
import { useActivityActors, usePlatformActivity } from '../teamApi';

const ACTION_OPTIONS = [
  ...ACTION_AREAS.map((a) => ({ value: a.value, label: `All: ${a.label}` })),
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

// Calendar dates in the filters cover whole local days.
const dayStart = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const dayEnd = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined);

function ActivityList() {
  const [f, setF] = useState({ actor: '', action: '', society: '', from: '', to: '', page: 1 });
  const { data, isLoading } = usePlatformActivity({
    actor: f.actor || undefined,
    action: f.action || undefined,
    society: f.society || undefined,
    from: dayStart(f.from),
    to: dayEnd(f.to),
    page: f.page,
  });
  const { data: actors = [] } = useActivityActors();
  const { data: societies } = usePlatformSocieties({ limit: 100 });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <PageHeader title="Platform activity" description="Everything done in this console: society changes, billing, support sessions, team and role changes." />
      <Card>
        <FilterBar cols={5} active={[f.actor, f.action, f.society, f.from, f.to].filter(Boolean).length}>
          <Select aria-label="Who" placeholder="Anyone" value={f.actor} onChange={set('actor')} options={actors.map((a) => ({ value: a._id, label: a.name }))} />
          <Select aria-label="Action" placeholder="Any action" value={f.action} onChange={set('action')} options={ACTION_OPTIONS} />
          <Select aria-label="Society" placeholder="Any society" value={f.society} onChange={set('society')} options={(societies?.data || []).map((s) => ({ value: s._id, label: s.name }))} />
          <Input aria-label="From" type="date" value={f.from} onChange={set('from')} />
          <Input aria-label="To" type="date" value={f.to} onChange={set('to')} />
        </FilterBar>
        <Table loading={isLoading} rows={data?.data} empty="No activity matches"
          columns={[
            { key: 'action', header: 'What', wrap: true, render: (r) => <div><p className="font-medium text-slate-900">{actionLabel(r.action)}</p>{describeDetails(r) && <p className="text-xs text-slate-500">{describeDetails(r)}</p>}</div> },
            { key: 'actor', header: 'Who', render: (r) => r.actor?.name || 'System' },
            { key: 'society', header: 'Society', render: (r) => (r.society ? `${r.society.name} (${r.society.code})` : '—') },
            { key: 'at', header: 'When', render: (r) => <span title={dateTime(r.at)}>{timeAgo(r.at)}</span> },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      </Card>
    </div>
  );
}

export default function PlatformActivityPage() {
  return (
    <PermissionGate permission="audit.view">
      <ActivityList />
    </PermissionGate>
  );
}
