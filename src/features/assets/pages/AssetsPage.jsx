import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, CheckCircle2, Plus, ScanLine, ShieldAlert, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Pagination, Select, StatCard, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date, label } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useAssets, useAssetStats } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { CATEGORIES, CATEGORY_LABELS, STATUSES, STATUS_TONES } from '../constants';
import { DUE_TONES } from '../shared';

function Stats() {
  const { data } = useAssetStats();
  if (!data) return null;
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Boxes} label="Assets" value={data.total} sub={`${data.retired} retired`} />
      <StatCard icon={CheckCircle2} tone="green" label="Working" value={data.working} />
      <StatCard icon={Wrench} tone="amber" label="Under repair" value={data.underRepair} />
      <StatCard icon={ShieldAlert} tone="red" label="AMC / warranty ≤ 30 days" value={data.amcExpiring + data.warrantyExpiring} sub={data.amcExpired ? `${data.amcExpired} AMC expired` : undefined} />
    </div>
  );
}

export default function AssetsPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({ category: '', status: '', search: '', expiring: '', page: 1 });
  const { data, isLoading } = useAssets(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')));
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Equipment register with QR labels, AMC and warranty tracking, and service history."
        actions={
          <>
            <Link to="/assets/scan"><Button variant="secondary" icon={ScanLine}>Scan QR</Button></Link>
            {manager && <Button icon={Plus} onClick={() => setCreating(true)}>Add asset</Button>}
          </>
        }
      />
      {manager && <Stats />}
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4">
          <Input placeholder="Search name, code, location…" value={filters.search} onChange={set('search')} />
          <Select placeholder="All categories" options={CATEGORIES} value={filters.category} onChange={set('category')} />
          <Select placeholder="Any status" options={STATUSES} value={filters.status} onChange={set('status')} />
          <Select placeholder="Any AMC / warranty" options={[{ value: '30', label: 'Expiring in 30 days' }, { value: '90', label: 'Expiring in 90 days' }]} value={filters.expiring} onChange={set('expiring')} />
        </div>
        <Table
          loading={isLoading}
          rows={data?.data}
          empty="No assets yet"
          onRowClick={(a) => navigate(`/assets/${a._id}`)}
          columns={[
            { key: 'code', header: 'Code', render: (a) => <span className="font-mono text-xs font-semibold text-slate-700">{a.code}</span> },
            { key: 'name', header: 'Asset', className: 'max-w-xs', render: (a) => <div className="truncate"><p className="truncate font-medium text-slate-900">{a.name}</p><p className="text-xs text-slate-500">{CATEGORY_LABELS[a.category]}{a.location ? ` · ${a.location}` : ''}</p></div> },
            { key: 'status', header: 'Status', render: (a) => <Badge tone={STATUS_TONES[a.status]}>{label(a.status)}</Badge> },
            { key: 'amc', header: 'AMC', render: (a) => (a.amcStatus === 'none' ? <span className="text-slate-400">—</span> : <Badge tone={DUE_TONES[a.amcStatus]}>{a.amcStatus === 'expired' ? 'Expired' : `till ${date(a.amc.endDate)}`}</Badge>) },
            { key: 'warranty', header: 'Warranty', render: (a) => (a.warrantyStatus === 'none' ? <span className="text-slate-400">—</span> : <span className="flex items-center gap-1">{a.warrantyStatus !== 'active' && <AlertTriangle className="size-3.5 text-amber-500" />}{date(a.warrantyExpiry)}</span>) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      <AssetFormModal open={creating} onClose={() => setCreating(false)} onSaved={(a) => navigate(`/assets/${a._id}`)} />
    </div>
  );
}
