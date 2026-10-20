import { useState } from 'react';
import { BarChart3, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, FilterBar, Input, Modal, Pagination, Select, Spinner, StatCard, Table } from '../../../components/ui';
import { date, label } from '../../../lib/format';
import { ROLE_LABELS } from '../../../lib/roles';
import { useAdStats, useAds, useDeleteAd, useSaveAd } from '../api';
import { PLACEMENTS, statusTone } from '../lib';
import { AdForm } from './AdForm';
import { AdMedia } from './AdMedia';

const STATUS_OPTIONS = ['live', 'scheduled', 'paused', 'ended'].map((s) => ({ value: s, label: label(s) }));
const placementLabel = (p) => PLACEMENTS.find((x) => x.value === p)?.label || p;

function StatsModal({ scope, ad, onClose }) {
  const { data, isLoading } = useAdStats(scope, ad._id);
  return (
    <Modal open onClose={onClose} title={`Numbers for “${ad.title}”`} description="Last 30 days, by day (IST).">
      {isLoading || !data ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Impressions" value={data.totals.impressions} />
            <StatCard label="Clicks" value={data.totals.clicks} />
            <StatCard label="CTR" value={`${data.totals.ctr}%`} />
            <StatCard label="Closed" value={data.totals.dismissals} />
          </div>
          <Table rows={data.days} rowKey="day" empty="No views yet"
            columns={[
              { key: 'day', header: 'Day', render: (d) => date(d.day) },
              { key: 'i', header: 'Impressions', render: (d) => d.impressions },
              { key: 'c', header: 'Clicks', render: (d) => d.clicks },
              { key: 'ctr', header: 'CTR', render: (d) => `${d.ctr}%` },
              { key: 'x', header: 'Closed', render: (d) => d.dismissals },
            ]} />
        </div>
      )}
    </Modal>
  );
}

const audienceText = (a, scope) => {
  const roles = a?.roles?.length ? a.roles.map((r) => ROLE_LABELS[r] || r).join(', ') : 'Everyone';
  if (scope !== 'platform') return roles;
  const where = a?.allSocieties ? 'All societies' : (a?.societies || []).map((s) => s.name || s).join(', ') || '—';
  return `${where}${a?.platform ? ' + console' : ''} · ${roles}`;
};

// Ads table with create / edit / pause / delete / numbers. `readOnly` lists another society's ads (platform view).
export function AdsManager({ scope, society, readOnly = false, canCreate = true }) {
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });
  const [editing, setEditing] = useState(null);
  const [stats, setStats] = useState(null);
  const { data, isLoading } = useAds(scope, { status: filters.status || undefined, search: filters.search || undefined, society, page: filters.page });
  const save = useSaveAd(scope, { success: false });
  const remove = useDeleteAd(scope);

  return (
    <Card>
      <FilterBar cols={2} active={filters.status ? 1 : 0}
        search={<div className="flex gap-2">
          <Input className="flex-1" aria-label="Search ads" placeholder="Search title" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
          {!readOnly && canCreate && <Button icon={Plus} onClick={() => setEditing({})}>New ad</Button>}
        </div>}>
        <Select aria-label="Status" placeholder="Any status" options={STATUS_OPTIONS} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
      </FilterBar>
      <Table loading={isLoading} rows={data?.data} empty="No ads yet" emptyHint={readOnly ? undefined : 'Create a banner or pop-up with an image or a short video.'}
        columns={[
          {
            key: 'ad', header: 'Ad', render: (a) => (
              <div className="flex items-center gap-3">
                <AdMedia ad={a} className="h-10 w-16 shrink-0 rounded" />
                <div className="min-w-0"><p className="truncate font-medium text-slate-900">{a.title}</p><p className="text-xs text-slate-500">{placementLabel(a.placement)}{a.placement !== 'banner' ? ` · ${label(a.frequency)}` : ''}</p></div>
              </div>
            ),
          },
          { key: 'status', header: 'Status', render: (a) => <Badge tone={statusTone[a.status]}>{label(a.status)}</Badge> },
          { key: 'when', header: 'Runs', mobile: false, render: (a) => `${date(a.startAt)} – ${date(a.endAt)}` },
          { key: 'who', header: 'Audience', mobile: false, render: (a) => <span className="text-xs text-slate-600">{audienceText(a.audience, scope === 'platform' && !society ? 'platform' : 'society')}</span> },
          { key: 'num', header: 'Views · clicks · CTR', render: (a) => `${a.stats.impressions} · ${a.stats.clicks} · ${a.stats.ctr}%` },
          {
            key: 'actions', header: '', className: 'text-right', render: (a) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" icon={BarChart3} title="Numbers" aria-label="Numbers" onClick={() => setStats(a)} />
                {!readOnly && <>
                  <Button size="sm" variant="ghost" icon={a.active ? Pause : Play} title={a.active ? 'Pause' : 'Resume'} aria-label={a.active ? 'Pause' : 'Resume'} onClick={() => save.mutate({ id: a._id, active: !a.active })} />
                  <Button size="sm" variant="ghost" icon={Pencil} title="Edit" aria-label="Edit" onClick={() => setEditing(a)} />
                  <Button size="sm" variant="ghost" icon={Trash2} title="Delete" aria-label="Delete" onClick={() => window.confirm(`Delete “${a.title}” and its numbers?`) && remove.mutate(a._id)} />
                </>}
              </div>
            ),
          },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      {editing && <AdForm scope={scope} ad={editing._id ? editing : null} onClose={() => setEditing(null)} />}
      {stats && <StatsModal scope={scope} ad={stats} onClose={() => setStats(null)} />}
    </Card>
  );
}
