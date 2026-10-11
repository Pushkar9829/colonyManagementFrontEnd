import { useState } from 'react';
import { AlertTriangle, CalendarClock, FileSignature, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Checkbox, Card, FileUpload, Input, Modal, Pagination, Select, StatCard, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date as fmtDate, label, money, toPaise, toRupees, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { POLICE_STATUS, useCreateLease, useEndLease, useLeases, useUnitLeaseHistory, useUnitOptions, useUnitResidents, useUpdateLease } from '../api';
import { LeaseCard } from '../components/LeasePanel';

const plusYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
};

function NewLeaseModal({ onClose }) {
  const { data: units = [] } = useUnitOptions();
  const [v, setV] = useState({ unit: '', tenantMembership: '', startDate: todayISO(), endDate: plusYear(), rent: '', securityDeposit: '', ecName: '', ecPhone: '', ecRelation: '', notes: '' });
  const [files, setFiles] = useState([]);
  const { data: residents = [] } = useUnitResidents(v.unit);
  const tenants = residents.filter((r) => r.residentType === 'tenant' && r.status === 'active');
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value, ...(k === 'unit' ? { tenantMembership: '' } : {}) }));
  const create = useCreateLease({ onSuccess: onClose });
  const submit = () => create.mutate({
    unit: v.unit,
    tenantMembership: v.tenantMembership,
    startDate: v.startDate,
    endDate: v.endDate,
    rent: v.rent ? toPaise(v.rent) : undefined,
    securityDeposit: v.securityDeposit ? toPaise(v.securityDeposit) : undefined,
    agreement: files.length ? files.map((f) => f._id) : undefined,
    emergencyContact: v.ecName && v.ecPhone ? { name: v.ecName, phone: v.ecPhone, relation: v.ecRelation || undefined } : undefined,
    notes: v.notes || undefined,
  });
  return (
    <Modal open onClose={onClose} title="Record a lease" description="The tenant must already be a member of the unit (registered as a tenant)." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!v.unit || !v.tenantMembership} loading={create.isPending} onClick={submit}>Save lease</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Unit" placeholder="Choose unit" options={units.map((u) => ({ value: u._id, label: `${u.label} · ${label(u.occupancy)}` }))} value={v.unit} onChange={set('unit')} />
        <Select label="Tenant" placeholder={v.unit ? (tenants.length ? 'Choose tenant' : 'No tenant members in this unit') : 'Choose a unit first'} options={tenants.map((t) => ({ value: t._id, label: t.name }))} value={v.tenantMembership} onChange={set('tenantMembership')} />
        <Input label="Start date" type="date" value={v.startDate} onChange={set('startDate')} />
        <Input label="End date" type="date" min={v.startDate} value={v.endDate} onChange={set('endDate')} />
        <Input label="Monthly rent (₹, optional)" type="number" min={0} value={v.rent} onChange={set('rent')} />
        <Input label="Security deposit (₹, optional)" type="number" min={0} value={v.securityDeposit} onChange={set('securityDeposit')} />
        <Input label="Tenant's emergency contact" value={v.ecName} onChange={set('ecName')} />
        <Input label="Contact phone" type="tel" value={v.ecPhone} onChange={set('ecPhone')} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">Rental agreement</p>
          <FileUpload folder="documents" files={files} onChange={setFiles} max={5} label="Attach agreement" />
        </div>
        <Textarea className="sm:col-span-2" label="Notes" rows={2} value={v.notes} onChange={set('notes')} />
      </div>
    </Modal>
  );
}

function LeaseModal({ lease, onClose }) {
  const { user } = useAuth();
  const isAdmin = user.role === ROLES.ADMIN;
  const [endDate, setEndDate] = useState(lease.endDate);
  const [rent, setRent] = useState(String(toRupees(lease.rent)));
  const [pv, setPv] = useState(lease.policeVerification?.status || 'not_submitted');
  const [reason, setReason] = useState('');
  const [moveOut, setMoveOut] = useState(lease.moveOutDue);
  const update = useUpdateLease({ onSuccess: onClose });
  const end = useEndLease({ onSuccess: onClose });
  const history = useUnitLeaseHistory(lease.unit?._id);
  return (
    <Modal open onClose={onClose} title={`Lease · ${lease.unit?.label}`} size="lg">
      <div className="space-y-5">
        <LeaseCard lease={lease} />
        {lease.status === 'active' && (
          <>
            <div className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-3 sm:items-end">
              <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} hint="Extend to renew" />
              <Input label="Rent (₹)" type="number" min={0} value={rent} onChange={(e) => setRent(e.target.value)} />
              <Select label="Police verification" options={POLICE_STATUS.map((s) => ({ value: s, label: label(s) }))} value={pv} onChange={(e) => setPv(e.target.value)} />
              <Button className="sm:col-span-3 justify-self-start" loading={update.isPending}
                onClick={() => update.mutate({ id: lease._id, endDate, rent: rent ? toPaise(rent) : undefined, policeVerification: { status: pv } })}>Save changes</Button>
            </div>
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-4">
              <p className="font-medium text-slate-800">End lease</p>
              <Textarea label="Reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lease completed, tenant moved out" />
              {isAdmin ? <Checkbox label="Tenant moved out — deactivate their membership" checked={moveOut} onChange={(e) => setMoveOut(e.target.checked)} /> : <p className="text-xs text-slate-500">An admin can also deactivate the tenant's login on move-out.</p>}
              <Button variant="danger" disabled={reason.trim().length < 3} loading={end.isPending} onClick={() => end.mutate({ id: lease._id, reason, moveOut: isAdmin && moveOut })}>End lease</Button>
            </div>
          </>
        )}
        {history.data?.leases?.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Tenant history of {lease.unit?.label}</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {history.data.leases.map((l) => (
                <li key={l._id} className="flex justify-between gap-2 px-4 py-2">
                  <span>{l.tenantUser?.name}</span>
                  <span className="text-slate-500">{fmtDate(l.startDate)} – {fmtDate(l.endedAt || l.endDate)} · {label(l.status)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function TenanciesPage() {
  const [tab, setTab] = useState('active');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const params = { active: { status: 'active' }, expiring: { expiringWithinDays: 30 }, moveout: { expired: true }, ended: { status: 'ended' } }[tab];
  const { data, isLoading } = useLeases({ ...params, page });
  const { data: expiring } = useLeases({ expiringWithinDays: 30, limit: 1 });
  const { data: moveout } = useLeases({ expired: true, limit: 1 });
  const open = data?.data.find((l) => l._id === openId);
  return (
    <div>
      <PageHeader title="Tenancies" description="Leases of rented units, police verification and move-outs." actions={<Button icon={Plus} onClick={() => setCreating(true)}>Record lease</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard icon={CalendarClock} tone="amber" label="Ending in 30 days" value={expiring?.meta?.total ?? '—'} />
        <StatCard icon={AlertTriangle} tone="red" label="Ended — move-out to confirm" value={moveout?.meta?.total ?? '—'} />
      </div>
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={(t) => { setTab(t); setPage(1); }}
        tabs={[{ value: 'active', label: 'Active' }, { value: 'expiring', label: 'Expiring', count: expiring?.meta?.total }, { value: 'moveout', label: 'Move-out due', count: moveout?.meta?.total }, { value: 'ended', label: 'History' }]} />
      <Card>
        <Table loading={isLoading} rows={data?.data} empty="No leases" onRowClick={(l) => setOpenId(l._id)}
          columns={[
            { key: 'unit', header: 'Unit', render: (l) => <span className="font-medium text-slate-900">{l.unit?.label}</span> },
            { key: 'tenant', header: 'Tenant', render: (l) => l.tenantUser?.name },
            { key: 'owner', header: 'Owner', render: (l) => l.ownerUser?.name || l.ownerName || '—' },
            { key: 'period', header: 'Period', render: (l) => `${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}` },
            { key: 'rent', header: 'Rent', render: (l) => (l.rent ? money(l.rent) : '—') },
            { key: 'pv', header: 'Police', render: (l) => <StatusBadge status={l.policeVerification?.status === 'verified' ? 'approved' : l.policeVerification?.status === 'submitted' ? 'pending' : 'inactive'} /> },
            { key: 'status', header: 'Status', render: (l) => (l.moveOutDue ? <Badge tone="red">Move-out due</Badge> : l.status === 'active' && l.daysLeft <= 30 ? <Badge tone="amber">{l.daysLeft} days left</Badge> : <StatusBadge status={l.status} />) },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      {!isLoading && !data?.data.length && tab === 'active' && <p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><FileSignature className="size-3.5" /> Leases are added for units whose members are registered as tenants.</p>}
      {creating && <NewLeaseModal onClose={() => setCreating(false)} />}
      {open && <LeaseModal key={open._id} lease={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
