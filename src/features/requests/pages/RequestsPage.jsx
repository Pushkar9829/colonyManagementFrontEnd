import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Truck } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, FileUpload, FilterBar, Input, Modal, PageLoader, Pagination, Select, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime, todayISO, toPaise } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useGovernance } from '../../committee/api';
import { useCreateRequest, useMoves, useRequests } from '../api';
import { KINDS, NOC_TYPES, STATUSES, requestTitle, statusTone } from '../constants';

const INITIAL = {
  kind: 'noc', nocType: 'passport', addressedTo: '', purpose: '', description: '',
  buyerName: '', bankName: '', loanAmount: '', provider: '', workDescription: '', contractorName: '', contractorPhone: '', workFrom: '', workTo: '',
  date: '', from: '09:00', to: '13:00', liftBooking: false, vehicleNumber: '', vehicleType: '', driverName: '', driverPhone: '', moversCompany: '', tenancy: '',
};

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

function NewRequestModal({ open, onClose, residentType }) {
  const navigate = useNavigate();
  const { values: v, bind, set, applyServerErrors, errors, reset } = useForm({ ...INITIAL, tenancy: residentType === 'tenant' ? 'tenant' : 'owner' });
  const [files, setFiles] = useState([]);
  const create = useCreateRequest({ onSuccess: (r) => { reset(); setFiles([]); onClose(); navigate(`/requests/${r._id}`); } });
  const isNoc = v.kind === 'noc';
  const submit = () => create.mutate(clean({
    kind: v.kind,
    nocType: isNoc ? v.nocType : undefined,
    addressedTo: isNoc ? v.addressedTo : undefined,
    purpose: v.purpose,
    description: v.description,
    info: isNoc ? clean({
      buyerName: v.buyerName, bankName: v.bankName, loanAmount: v.loanAmount ? toPaise(v.loanAmount) : undefined, provider: v.provider,
      workDescription: v.workDescription, contractorName: v.contractorName, contractorPhone: v.contractorPhone, workFrom: v.workFrom, workTo: v.workTo,
    }) : undefined,
    move: isNoc ? undefined : clean({
      date: v.date, from: v.from, to: v.to, liftBooking: v.liftBooking, vehicleNumber: v.vehicleNumber, vehicleType: v.vehicleType,
      driverName: v.driverName, driverPhone: v.driverPhone, moversCompany: v.moversCompany, tenancy: v.tenancy,
    }),
    attachments: files.length ? files.map((f) => f._id) : undefined,
  }), { onError: applyServerErrors });

  return (
    <Modal open={open} onClose={onClose} size="lg" title="New request" description="NOCs and move-in / move-out permissions are reviewed by the managing committee."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Submit</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Request type" options={KINDS} {...bind('kind')} />
        {isNoc && <Select label="NOC for" options={NOC_TYPES.filter((t) => residentType === 'owner' || t.value !== 'sale')} {...bind('nocType')} error={errors.nocType} />}
        {isNoc && (
          <>
            <Input className="sm:col-span-2" label="Addressed to" placeholder="To whom it may concern" {...bind('addressedTo')} />
            {v.nocType === 'sale' && <Input className="sm:col-span-2" label="Proposed buyer" {...bind('buyerName')} />}
            {v.nocType === 'bank_loan' && (<><Input label="Bank" {...bind('bankName')} /><Input type="number" min="0" label="Loan amount (₹)" {...bind('loanAmount')} /></>)}
            {['electricity', 'gas'].includes(v.nocType) && <Input className="sm:col-span-2" label="Provider" placeholder="MSEDCL / MNGL" {...bind('provider')} />}
            {v.nocType === 'renovation' && (
              <>
                <Textarea className="sm:col-span-2" label="Work to be done" {...bind('workDescription')} error={errors['info.workDescription']} />
                <Input type="date" label="From" {...bind('workFrom')} />
                <Input type="date" label="To" {...bind('workTo')} error={errors['info.workTo']} />
                <Input label="Contractor" {...bind('contractorName')} />
                <Input label="Contractor phone" {...bind('contractorPhone')} error={errors['info.contractorPhone']} />
              </>
            )}
            <Input className="sm:col-span-2" label="Purpose" placeholder="e.g. passport application for my son" {...bind('purpose')} />
          </>
        )}
        {!isNoc && (
          <>
            <Input type="date" label="Date" required min={todayISO()} {...bind('date')} error={errors['move.date'] || errors.move} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" label="From" {...bind('from')} />
              <Input type="time" label="To" {...bind('to')} />
            </div>
            <Input label="Vehicle number" placeholder="MH12AB1234" {...bind('vehicleNumber')} />
            <Input label="Vehicle type" placeholder="Tempo / truck" {...bind('vehicleType')} />
            <Input label="Driver name" {...bind('driverName')} />
            <Input label="Driver phone" {...bind('driverPhone')} error={errors['move.driverPhone']} />
            <Input label="Packers & movers" {...bind('moversCompany')} />
            <Select label="I am the" options={[{ value: 'owner', label: 'Owner' }, { value: 'tenant', label: 'Tenant' }]} {...bind('tenancy')} />
            <Checkbox className="sm:col-span-2" label="Book the service lift for this slot" checked={v.liftBooking} onChange={(e) => set('liftBooking', e.target.checked)} />
          </>
        )}
        <Textarea className="sm:col-span-2" label="Details" rows={2} {...bind('description')} />
        <div className="sm:col-span-2">
          <FileUpload folder="documents" files={files} onChange={setFiles} label={v.kind === 'move_in' && v.tenancy === 'tenant' ? 'Attach rent agreement (required)' : 'Attach documents'} />
        </div>
      </div>
    </Modal>
  );
}

function MovesBoard() {
  const [day, setDay] = useState(todayISO());
  const { data, isLoading } = useMoves(day);
  const { t } = useT();
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <Input label="Date" type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-44" />
        <span className="text-sm text-slate-500">{t('Approved move-ins and move-outs — allow these movers at the gate.')}</span>
      </div>
      {isLoading ? <PageLoader /> : data?.items?.length ? (
        <ul className="divide-y divide-slate-100">
          {data.items.map((r) => (
            <li key={r._id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-900">{r.unitLabel} · {r.applicantName}</p>
                <p className="text-sm text-slate-600">{r.move.from} – {r.move.to}{r.move.moversCompany ? ` · ${r.move.moversCompany}` : ''}</p>
                <p className="text-sm text-slate-600">{r.move.vehicleNumber ? `${t('Vehicle {number}', { number: r.move.vehicleNumber })}${r.move.vehicleType ? ` (${r.move.vehicleType})` : ''}` : t('No vehicle given')}{r.move.driverName ? ` · ${t('Driver {name}', { name: r.move.driverName })}${r.move.driverPhone ? ` ${r.move.driverPhone}` : ''}` : ''}</p>
              </div>
              <div className="flex gap-1.5">
                <Badge tone={r.kind === 'move_in' ? 'green' : 'amber'}>{r.kind === 'move_in' ? t('Move-in') : t('Move-out')}</Badge>
                {r.move.liftBooking && <Badge tone="blue">{t('Lift booked')}</Badge>}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Truck} title={t('No approved moves on {date}', { date: date(day) })} />}
    </Card>
  );
}

function RequestTable({ params, manage }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ kind: '', status: '', page: 1 });
  const { data, isLoading } = useRequests(clean({ ...params, ...filters }));
  const { t } = useT();
  return (
    <Card>
      {manage && (
        <FilterBar cols={3} active={[filters.kind, filters.status].filter(Boolean).length}>
          <Select label="Request type" placeholder="All types" options={KINDS} value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value, page: 1 })} />
          {!params.open && <Select label="Status" placeholder="All statuses" options={STATUSES} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} />}
        </FilterBar>
      )}
      <Table loading={isLoading} rows={data?.data} empty="No requests"
        emptyHint={manage ? undefined : 'Need an NOC for a bank loan, sale or rent, or permission to move in or out? Tap New request.'}
        onRowClick={(r) => navigate(`/requests/${r._id}`)}
        columns={[
          { key: 'number', header: 'No.', render: (r) => <span className="font-mono text-xs font-semibold text-slate-600">{r.number}</span> },
          { key: 'title', header: 'Request', className: 'max-w-xs', render: (r) => <div className="truncate"><p className="truncate font-medium text-slate-900">{requestTitle(r, t)}</p>{manage && <p className="text-xs text-slate-500">{r.unitLabel} · {r.applicantName}</p>}</div> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={statusTone(r.status)} /> },
          { key: 'createdAt', header: 'Raised', render: (r) => dateTime(r.createdAt) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters({ ...filters, page })} />
    </Card>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const { data: access, isLoading } = useGovernance();
  const [tab, setTab] = useState('open');
  const [creating, setCreating] = useState(false);
  if (isLoading) return <PageLoader />;
  const manage = Boolean(access?.canManage);
  const resident = user.role === ROLES.RESIDENT;

  if (user.role === ROLES.GUARD && !manage) {
    return (
      <div>
        <PageHeader title="Move-ins & move-outs" description="Approved moves for the day." />
        <MovesBoard />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={manage ? 'NOC & move requests' : 'Letters & move requests'}
        description={manage ? 'Review NOCs and move-in / move-out requests, check dues and issue letters.' : 'Ask the society for a No-Objection Certificate (NOC) for a bank loan, sale or rent, or permission to move in or out.'}
        actions={resident && <Button icon={Plus} onClick={() => setCreating(true)}>New request</Button>}
      />
      {manage ? (
        <>
          <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={[
            { value: 'open', label: 'Open' }, { value: 'all', label: 'All' }, { value: 'moves', label: 'Moves board' }, ...(resident ? [{ value: 'mine', label: 'Mine' }] : []),
          ]} />
          {tab === 'open' && <RequestTable key="open" params={{ open: true }} manage />}
          {tab === 'all' && <RequestTable key="all" params={{}} manage />}
          {tab === 'moves' && <MovesBoard />}
          {tab === 'mine' && <RequestTable key="mine" params={{ mine: true }} />}
        </>
      ) : <RequestTable params={{}} />}
      {resident && <NewRequestModal open={creating} onClose={() => setCreating(false)} residentType={user.residentType} />}
    </div>
  );
}
