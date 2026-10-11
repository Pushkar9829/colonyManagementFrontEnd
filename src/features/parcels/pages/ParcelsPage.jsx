import { useState } from 'react';
import { AlertTriangle, BellRing, Clock, Hourglass, Package, PackageCheck, Plus, Undo2 } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Spinner, StatCard, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { label } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import { OPEN_STATUSES, useParcels, useParcelStats, useRemindParcel, useReturnParcel } from '../api';
import { CollectParcelModal } from '../components/CollectParcelModal';
import { DeliveryPreferences } from '../components/DeliveryPreferences';
import { LogParcelForm } from '../components/LogParcelForm';
import { AgeBadge, ParcelRow, ParcelStatus } from '../components/ParcelRow';

const STATUS_FILTERS = [
  { value: 'waiting', label: 'Waiting at gate' },
  { value: '', label: 'All' },
  ...['received', 'notified', 'collected', 'returned'].map((s) => ({ value: s, label: label(s) })),
];

function Stats() {
  const live = useLiveInterval(15000);
  const { data } = useParcelStats({ refetchInterval: live });
  if (!data) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard icon={Package} label="Waiting" value={data.waiting} sub={`${data.ageing?.under24h ?? 0} under 24h`} />
      <StatCard icon={Hourglass} tone="amber" label="1–3 days" value={data.ageing?.days1to3 ?? 0} />
      <StatCard icon={AlertTriangle} tone="red" label="Over 3 days" value={data.ageing?.over3days ?? 0} />
      <StatCard icon={PackageCheck} tone="green" label="Collected today" value={data.collectedToday} />
    </div>
  );
}

function ReturnModal({ parcel, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState();
  const ret = useReturnParcel({ onSuccess: () => { setReason(''); onClose(); } });
  return (
    <Modal
      open={Boolean(parcel)}
      onClose={onClose}
      title="Return parcel to courier"
      description={parcel ? `${parcel.number} · ${parcel.courier} · ${parcel.unit?.label}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={ret.isPending} disabled={reason.trim().length < 3}
            onClick={() => ret.mutate({ id: parcel._id, reason: reason.trim() }, { onError: (e) => setError(e.fieldErrors?.reason) })}>
            Mark returned
          </Button>
        </>
      }
    >
      <Textarea label="Reason" required rows={3} placeholder="e.g. Resident refused, not collected in 7 days" value={reason} onChange={(e) => { setReason(e.target.value); setError(undefined); }} error={error} />
    </Modal>
  );
}

function Register({ canCollect }) {
  const live = useLiveInterval(15000);
  const [filters, setFilters] = useState({ status: 'waiting', search: '', old: false, page: 1 });
  const [collecting, setCollecting] = useState(null);
  const [returning, setReturning] = useState(null);
  const remind = useRemindParcel();
  const params = {
    status: filters.status && filters.status !== 'waiting' ? filters.status : undefined,
    open: filters.status === 'waiting' ? true : undefined,
    search: filters.search.trim() || undefined,
    olderThanHours: filters.old ? 24 : undefined,
    page: filters.page,
  };
  const { data, isLoading } = useParcels(params, { refetchInterval: live });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value, page: 1 }));

  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <Input placeholder="Search number, tracking, courier, name" value={filters.search} onChange={set('search')} />
        <select value={filters.status} onChange={set('status')} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" aria-label="Status">
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Checkbox label="Older than 24h" checked={filters.old} onChange={set('old')} />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.data.length ? (
        <EmptyState icon={Package} title="No parcels found" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((p) => (
            <ParcelRow
              key={p._id}
              p={p}
              actions={
                OPEN_STATUSES.includes(p.status) && (
                  <>
                    {canCollect && <Button size="sm" variant="success" icon={PackageCheck} onClick={() => setCollecting(p)}>Collect</Button>}
                    <Button size="sm" variant="secondary" icon={BellRing} loading={remind.isPending && remind.variables === p._id} onClick={() => remind.mutate(p._id)}>Remind</Button>
                    <Button size="sm" variant="ghost" icon={Undo2} onClick={() => setReturning(p)}>Return</Button>
                  </>
                )
              }
            />
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      <CollectParcelModal parcel={collecting} onClose={() => setCollecting(null)} />
      <ReturnModal key={returning?._id} parcel={returning} onClose={() => setReturning(null)} />
    </Card>
  );
}

function StaffView({ user }) {
  const [logging, setLogging] = useState(false);
  const canLog = hasRole(user, ROLES.GUARD);
  return (
    <div>
      <PageHeader
        title="Parcels"
        description="Deliveries held at the gate until the household collects them with an OTP."
        actions={canLog && <Button icon={Plus} onClick={() => setLogging(true)}>Log parcel</Button>}
      />
      <Stats />
      <Register canCollect={hasRole(user, ROLES.GUARD)} />
      {canLog && (
        <Modal open={logging} onClose={() => setLogging(false)} title="Log parcel" size="lg">
          <LogParcelForm onDone={() => setLogging(false)} />
        </Modal>
      )}
    </div>
  );
}

function WaitingParcels() {
  const live = useLiveInterval(15000);
  const { data, isLoading } = useParcels({ open: true, limit: 50 }, { refetchInterval: live });
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!data?.data.length) {
    return (
      <Card className="mb-6">
        <EmptyState icon={PackageCheck} title="Nothing waiting at the gate" description="When a delivery arrives you'll get a notification with its OTP." />
      </Card>
    );
  }
  return (
    <div className="mb-6 space-y-3">
      {data.data.map((p) => (
        <Card key={p._id} className="overflow-hidden border-brand-200">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-slate-900">{p.courier}</p>
                <ParcelStatus status={p.status} />
                <AgeBadge hours={p.ageHours} />
                {p.leftAtGate && <span className="text-xs font-medium text-emerald-700">Left at gate</span>}
              </div>
              <p className="text-sm text-slate-500">
                {p.number}
                {p.recipientName ? ` · ${p.recipientName}` : ''}
                {p.packages > 1 ? ` · ${p.packages} packages` : ''}
                {p.trackingNo ? ` · ${p.trackingNo}` : ''}
              </p>
              {p.storageLocation && <p className="text-xs text-slate-400">Kept at {p.storageLocation}</p>}
            </div>
            <div className="rounded-xl bg-brand-50 px-5 py-3 text-center">
              <p className="font-mono text-4xl font-bold tracking-[0.3em] text-brand-700 sm:text-5xl">{p.otp || '----'}</p>
              <p className="mt-1 text-xs font-medium text-brand-700">Show this OTP to the guard</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ParcelHistory() {
  const live = useLiveInterval(15000);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useParcels({ page }, { refetchInterval: live });
  return (
    <Card>
      <CardHeader title="History" />
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.data.length ? (
        <EmptyState icon={Clock} title="No parcels yet" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((p) => <ParcelRow key={p._id} p={p} showUnit={false} />)}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

function ResidentView() {
  const [tab, setTab] = useState('parcels');
  return (
    <div>
      <PageHeader title="Parcels" description="Deliveries waiting for you at the gate." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'parcels', label: 'My parcels' }, { value: 'preferences', label: 'Delivery preferences' }]} />
      {tab === 'parcels' ? (
        <>
          <WaitingParcels />
          <ParcelHistory />
        </>
      ) : (
        <DeliveryPreferences />
      )}
    </div>
  );
}

export default function ParcelsPage() {
  const { user } = useAuth();
  return user.role === ROLES.RESIDENT ? <ResidentView /> : <StaffView user={user} />;
}
