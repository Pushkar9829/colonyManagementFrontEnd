import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, DoorOpen, Plus, QrCode, ShieldAlert, Star, Trash2, Zap } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, FilterBar, Input, Modal, Pagination, Select, Spinner, StatusBadge, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { dateTime, dayBounds, label, timeAgo } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import {
  useApproveVisitor,
  useCancelPass,
  useCreateFrequent,
  useDenyVisitor,
  useFrequent,
  useFrequentPass,
  usePasses,
  useRemoveFrequent,
  useUpdateFrequent,
  useVisitors,
} from '../api';
import { VisitorRow } from '../components/VisitorRow';
import { useGates } from '../../gates/api';
import { PassCard, PassModal, passWindow } from '../components/PassModal';

const PURPOSES = ['guest', 'delivery', 'cab', 'service', 'other'];

function ResidentPending() {
  const live5 = useLiveInterval(5000);
  const { data } = useVisitors({ status: 'pending', limit: 20 }, { refetchInterval: live5 });
  const approve = useApproveVisitor();
  const deny = useDenyVisitor();
  if (!data?.data.length) return null;
  return (
    <Card className="mb-6 border-amber-200">
      <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 font-semibold text-amber-800">Waiting at the gate</div>
      <ul className="divide-y divide-slate-100">
        {data.data.map((v) => (
          <VisitorRow
            key={v._id}
            v={v}
            showUnit={false}
            actions={
              <>
                <Button size="sm" variant="success" loading={approve.isPending && approve.variables === v._id} onClick={() => approve.mutate(v._id)}>Allow</Button>
                <Button size="sm" variant="danger" loading={deny.isPending && deny.variables === v._id} onClick={() => deny.mutate(v._id)}>Deny</Button>
              </>
            }
          />
        ))}
      </ul>
    </Card>
  );
}

function PassesTab() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [show, setShow] = useState(null);
  const { data, isLoading } = usePasses({ page, kind: kind || undefined });
  const cancel = useCancelPass();
  return (
    <Card>
      <div className="border-b border-slate-100 p-3">
        <Tabs className="w-fit" value={kind} onChange={(v) => { setKind(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, { value: 'one_time', label: 'One visit' }, { value: 'recurring', label: 'Recurring' }]} />
      </div>
      <Table
        loading={isLoading}
        rows={data?.data}
        empty="No passes yet"
        columns={[
          { key: 'guestName', header: 'Guest', render: (p) => <span className="font-medium text-slate-900">{p.guestName}</span> },
          { key: 'code', header: 'Code', render: (p) => <span className="font-mono font-semibold tracking-widest">{p.code}</span> },
          { key: 'when', header: 'When', render: (p) => passWindow(p) || `until ${dateTime(p.validTo)}` },
          { key: 'gates', header: 'Gates', render: (p) => (p.gates?.length ? p.gates.map((g) => g.name).join(', ') : 'Any gate') },
          { key: 'uses', header: 'Used', render: (p) => (p.kind === 'recurring' ? p.usedCount : `${p.usedCount}/${p.maxUses}`) },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          {
            key: 'a',
            header: '',
            render: (p) =>
              p.status === 'active' && (
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" icon={QrCode} onClick={() => setShow(p)}>QR</Button>
                  <Button size="sm" variant="ghost" onClick={() => window.confirm('Cancel this pass?') && cancel.mutate(p._id)}>Cancel</Button>
                </div>
              ),
          },
        ]}
      />
      <Pagination meta={data?.meta} onPage={setPage} />
      <Modal open={Boolean(show)} onClose={() => setShow(null)} title="Guest pass" size="sm" footer={<Button onClick={() => setShow(null)}>Close</Button>}>
        {show && <PassCard pass={show} />}
      </Modal>
    </Card>
  );
}

function FrequentModal({ open, onClose }) {
  const { values, bind, applyServerErrors, reset } = useForm({ name: '', phone: '', purpose: 'guest', company: '', autoApprove: false });
  const create = useCreateFrequent({ onSuccess: () => { reset(); onClose(); } });
  const submit = () => create.mutate({ ...values, phone: values.phone || undefined, company: values.company || undefined }, { onError: applyServerErrors });
  return (
    <Modal open={open} onClose={onClose} title="Add a frequent visitor" description="Regulars get one-tap passes; with auto-approve the guard lets them in without asking you."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required {...bind('name')} />
        <Input label="Phone" type="tel" hint="Needed for auto-approve" {...bind('phone')} />
        <Select label="Purpose" options={PURPOSES.map((p) => ({ value: p, label: label(p) }))} {...bind('purpose')} />
        <Input label="Company (optional)" {...bind('company')} />
        <Checkbox className="sm:col-span-2" label="Auto-approve at the gate (matched by phone number)" checked={values.autoApprove} onChange={(e) => bind('autoApprove').onChange(e)} name="autoApprove" />
      </div>
    </Modal>
  );
}

function FrequentTab() {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState(null);
  const { data, isLoading } = useFrequent({ limit: 100 });
  const update = useUpdateFrequent();
  const remove = useRemoveFrequent();
  const quick = useFrequentPass({ onSuccess: setPass, success: 'Pass ready' });
  const rows = data?.data || [];
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
        <p className="text-sm text-slate-500">Regular visitors for your home.</p>
        <Button size="sm" icon={Plus} onClick={() => setOpen(true)}>Add</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !rows.length ? (
        <EmptyState icon={Star} title="No frequent visitors" description="Save regular guests, tutors or drivers for one-tap passes." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((f) => (
            <li key={f._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{f.name}</p>
                  {f.autoApprove && <Badge tone="green">Auto-approve</Badge>}
                </div>
                <p className="text-sm text-slate-500">{label(f.purpose)}{f.company ? ` · ${f.company}` : ''}{f.phone ? ` · ${f.phone}` : ''}</p>
                <p className="text-xs text-slate-400">{f.visits} visit{f.visits === 1 ? '' : 's'}{f.lastVisitAt ? ` · last ${timeAgo(f.lastVisitAt)}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={Zap} loading={quick.isPending && quick.variables?.id === f._id} onClick={() => quick.mutate({ id: f._id, hours: 12 })}>Pass for today</Button>
                <Button size="sm" variant="secondary" disabled={!f.phone} title={f.phone ? '' : 'Add a phone number to enable'} onClick={() => update.mutate({ id: f._id, autoApprove: !f.autoApprove })}>
                  {f.autoApprove ? 'Turn off auto' : 'Auto-approve'}
                </Button>
                <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove" onClick={() => window.confirm(`Remove ${f.name}?`) && remove.mutate(f._id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <FrequentModal open={open} onClose={() => setOpen(false)} />
      <Modal open={Boolean(pass)} onClose={() => setPass(null)} title="Pass created" size="sm" footer={<Button onClick={() => setPass(null)}>Done</Button>}>
        {pass && <PassCard pass={pass} />}
      </Modal>
    </Card>
  );
}

function HistoryTab({ initialFlagged }) {
  const { user } = useAuth();
  const isResident = user.role === ROLES.RESIDENT;
  const [filters, setFilters] = useState({ status: '', purpose: '', gate: '', date: '', search: '', flagged: initialFlagged, page: 1 });
  const bounds = filters.date ? dayBounds(filters.date) : {};
  // Residents see their own visitors only; the gate filter is for the gate staff and management.
  const { data: gates = [] } = useGates({ includeInactive: true }, { enabled: !isResident });
  const { data, isLoading } = useVisitors({
    status: filters.status || undefined,
    purpose: filters.purpose || undefined,
    gate: filters.gate || undefined,
    search: filters.search || undefined,
    flagged: filters.flagged || undefined,
    page: filters.page,
    ...bounds,
  });
  const saveFrequent = useCreateFrequent();
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e, page: 1 }));
  return (
    <Card>
      <FilterBar
        cols={!isResident && gates.length > 1 ? 5 : 4}
        active={[filters.status, filters.purpose, filters.gate, filters.date, filters.flagged].filter(Boolean).length}
        search={<Input label="Search" placeholder="Name, phone or vehicle" value={filters.search} onChange={set('search')} />}
      >
        <Input label="Visit date" type="date" value={filters.date} onChange={set('date')} />
        <Select label="Status" placeholder="All statuses" value={filters.status} onChange={set('status')} options={['pending', 'checked_in', 'checked_out', 'denied'].map((v) => ({ value: v, label: label(v) }))} />
        <Select label="Purpose" placeholder="All purposes" value={filters.purpose} onChange={set('purpose')} options={PURPOSES.map((v) => ({ value: v, label: label(v) }))} />
        {!isResident && gates.length > 1 && (
          <Select label="Entry gate" placeholder="All gates" value={filters.gate} onChange={set('gate')} options={gates.map((g) => ({ value: g._id, label: g.active ? g.name : `${g.name} (closed)` }))} />
        )}
        {!isResident && <Checkbox label="Only watchlist / blocklist hits" checked={filters.flagged} onChange={set('flagged')} />}
      </FilterBar>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.data.length ? (
        <EmptyState icon={DoorOpen} title="No visitors found" description={filters.search || filters.date || filters.status || filters.purpose || filters.gate || filters.flagged ? 'Try clearing the search or filters.' : undefined} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((v) => (
            <VisitorRow
              key={v._id}
              v={v}
              showUnit={!isResident}
              actions={
                isResident && v.status !== 'denied' && v.purpose !== 'delivery' && !v.frequentVisitor ? (
                  <Button size="sm" variant="ghost" icon={Star} loading={saveFrequent.isPending && saveFrequent.variables?.fromVisitor === v._id} onClick={() => saveFrequent.mutate({ fromVisitor: v._id })}>
                    Save as frequent
                  </Button>
                ) : null
              }
            />
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}

export default function VisitorsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const isResident = user.role === ROLES.RESIDENT;
  const manager = hasRole(user, ROLES.FACILITY_MANAGER);
  const tab = params.get('tab') || 'history';
  const setTab = (t) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });
  // ?new=pass (from the home screen) opens the pre-approve form straight away.
  const [passOpen, setPassOpen] = useState(() => isResident && params.get('new') === 'pass');

  return (
    <div>
      <PageHeader
        title="Visitors"
        description={isResident ? 'Approve guests at the gate, pre-approve expected visitors and manage regulars.' : 'Every gate entry across the colony.'}
        actions={
          <>
            {isResident && <Button icon={Plus} onClick={() => setPassOpen(true)}>Pre-approve guest</Button>}
            {manager && <Link to="/visitors/analytics"><Button variant="secondary" icon={BarChart3}>Analytics</Button></Link>}
            {!isResident && <Link to="/security/watchlist"><Button variant="secondary" icon={ShieldAlert}>Blocklist</Button></Link>}
          </>
        }
      />
      {isResident && <ResidentPending />}
      {isResident && (
        <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'history', label: 'Visit history' }, { value: 'passes', label: 'My passes' }, { value: 'frequent', label: 'Frequent visitors' }]} />
      )}
      {isResident && tab === 'passes' ? <PassesTab /> : isResident && tab === 'frequent' ? <FrequentTab /> : <HistoryTab initialFlagged={params.get('flagged') === 'true'} />}
      {isResident && <PassModal open={passOpen} onClose={() => setPassOpen(false)} />}
    </div>
  );
}
