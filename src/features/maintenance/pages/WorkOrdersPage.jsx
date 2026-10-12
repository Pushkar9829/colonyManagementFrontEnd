import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Hammer, IndianRupee, Plus, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Pagination, Select, StatCard, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date, label, money } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useWorkOrderStats, useWorkOrders } from '../api';
import { CreateWorkOrderModal, WorkOrderDetailModal } from '../components/WorkOrderModals';
import { WO_STATUSES, WO_TONES } from '../constants';

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ status: '', page: 1 });
  const { data, isLoading } = useWorkOrders(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const { data: stats } = useWorkOrderStats(manager);
  const openId = params.get('id');
  const setOpen = (id) => setParams(id ? { id } : {});

  return (
    <div>
      <PageHeader title="Work orders" description={manager ? 'Jobs for vendors and technicians, from estimate to verified completion.' : 'Work orders assigned to you.'} actions={manager && <Button icon={Plus} onClick={() => setCreating(true)}>New work order</Button>} />
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Hammer} label="Open" value={stats.open} />
          <StatCard icon={ClipboardCheck} tone="amber" label="Awaiting verification" value={stats.awaitingVerification} />
          <StatCard icon={IndianRupee} tone="sky" label="Open estimates" value={money(stats.openEstimate)} />
          <StatCard icon={Wallet} tone="green" label="Spent (verified)" value={money(stats.spent)} />
        </div>
      )}
      <Card>
        <div className="border-b border-slate-100 p-4 sm:w-64">
          <Select placeholder="All statuses" options={WO_STATUSES} value={f.status} onChange={(e) => setF({ status: e.target.value, page: 1 })} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No work orders" onRowClick={(w) => setOpen(w._id)}
          columns={[
            { key: 'number', header: 'No.', render: (w) => <span className="font-mono text-xs font-semibold">{w.number}</span> },
            { key: 'title', header: 'Work', className: 'max-w-xs', render: (w) => <div className="truncate"><p className="truncate font-medium text-slate-900">{w.title}</p><p className="text-xs text-slate-500">{label(w.source)}{w.asset ? ` · ${w.asset.name}` : w.location ? ` · ${w.location}` : ''}</p></div> },
            { key: 'who', header: 'Vendor / technician', render: (w) => w.vendorName || w.technician?.name || '—' },
            { key: 'estimate', header: 'Estimate', render: (w) => money(w.estimate) },
            { key: 'dueDate', header: 'Due', render: (w) => (w.dueDate ? date(w.dueDate) : '—') },
            { key: 'status', header: 'Status', render: (w) => <Badge tone={WO_TONES[w.status]}>{label(w.status)}</Badge> },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      </Card>
      <CreateWorkOrderModal open={creating} onClose={() => setCreating(false)} />
      <WorkOrderDetailModal id={openId} open={Boolean(openId)} onClose={() => setOpen(null)} />
    </div>
  );
}
