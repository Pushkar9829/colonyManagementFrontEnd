import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, Check, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Input, Pagination, Select, Spinner, Table, Tabs } from '../../../components/ui';
import { currentPeriod, date, label, periodLabel } from '../../../lib/format';
import { useCancelLeave, useDecideLeave, useEmployees, useLeaveBalances, useLeaveCalendar, useLeaves, useSetLeaveBalance } from '../api';
import { ApplyLeaveModal, BalanceCards, LEAVE_TONES } from '../components/LeaveModals';

function RequestsTab() {
  const [f, setF] = useState({ status: 'pending', page: 1 });
  const { data, isLoading } = useLeaves(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const decide = useDecideLeave();
  const cancel = useCancelLeave();
  return (
    <Card>
      <div className="border-b border-slate-100 p-4 sm:w-64">
        <Select placeholder="All requests" options={['pending', 'approved', 'rejected', 'cancelled'].map((v) => ({ value: v, label: label(v) }))} value={f.status} onChange={(e) => setF({ status: e.target.value, page: 1 })} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No leave requests"
        columns={[
          { key: 'who', header: 'Employee', render: (l) => <div><p className="font-medium text-slate-900">{l.employee?.user?.name}</p><p className="text-xs text-slate-500">{l.employee?.employeeCode}</p></div> },
          { key: 'type', header: 'Type', render: (l) => label(l.type) },
          { key: 'dates', header: 'Dates', render: (l) => `${date(l.from)}${l.to !== l.from ? ` – ${date(l.to)}` : ''}` },
          { key: 'days', header: 'Days', render: (l) => l.days },
          { key: 'reason', header: 'Reason', className: 'max-w-xs truncate', render: (l) => l.reason || '—' },
          { key: 'status', header: 'Status', render: (l) => <Badge tone={LEAVE_TONES[l.status]}>{label(l.status)}</Badge> },
          { key: 'act', header: '', render: (l) => (
            <div className="flex gap-1">
              {l.status === 'pending' && <Button size="sm" variant="success" icon={Check} loading={decide.isPending} onClick={() => decide.mutate({ id: l._id, approved: true })}>Approve</Button>}
              {l.status === 'pending' && <Button size="sm" variant="secondary" icon={X} loading={decide.isPending} onClick={() => decide.mutate({ id: l._id, approved: false })}>Reject</Button>}
              {l.status === 'approved' && <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(l._id)}>Cancel</Button>}
            </div>
          ) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
    </Card>
  );
}

function CalendarTab() {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = useLeaveCalendar(period);
  const [y, m] = period.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const on = (d) => {
    const iso = `${period}-${String(d).padStart(2, '0')}`;
    return (data || []).filter((l) => l.from <= iso && l.to >= iso);
  };
  return (
    <Card>
      <CardHeader title={periodLabel(period)} action={<Input title="Month" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />} />
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="grid grid-cols-7 gap-px bg-slate-100 p-px text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="bg-slate-50 px-1 py-1.5 text-center font-semibold text-slate-500">{d}</div>)}
          {Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} className="bg-white" />)}
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
            <div key={d} className="min-h-20 bg-white p-1">
              <p className="font-medium text-slate-500">{d}</p>
              {on(d).map((l) => (
                <p key={l._id} className={`mt-0.5 truncate rounded px-1 ${l.status === 'approved' ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`} title={`${l.employee?.user?.name} · ${l.type}${l.halfDay ? ' (half)' : ''}`}>
                  {l.employee?.user?.name?.split(' ')[0]}{l.halfDay ? ' ½' : ''}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BalancesTab() {
  const year = new Date().getFullYear();
  const [emp, setEmp] = useState('');
  const [alloc, setAlloc] = useState({ casual: '', sick: '', earned: '', carriedForward: '' });
  const { data: employees } = useEmployees({ status: 'active', limit: 100 });
  const { data: bal } = useLeaveBalances({ year, employee: emp }, Boolean(emp));
  const save = useSetLeaveBalance();
  const num = (v) => (v === '' ? undefined : Number(v));
  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Select label={`Employee · ${year}`} placeholder="Choose" options={(employees?.data || []).map((e) => ({ value: e._id, label: `${e.user?.name} · ${e.employeeCode}` }))} value={emp} onChange={(e) => setEmp(e.target.value)} />
      </div>
      {emp && (
        <div className="space-y-4 p-4">
          <BalanceCards balances={bal?.balances} />
          <p className="text-sm font-medium text-slate-700">Override this year’s allocation</p>
          <div className="grid gap-3 sm:grid-cols-5">
            {['casual', 'sick', 'earned'].map((k) => <Input key={k} label={label(k)} type="number" min="0" step="0.5" value={alloc[k]} onChange={(e) => setAlloc((a) => ({ ...a, [k]: e.target.value }))} placeholder="Default" />)}
            <Input label="EL carried forward" type="number" min="0" step="0.5" value={alloc.carriedForward} onChange={(e) => setAlloc((a) => ({ ...a, carriedForward: e.target.value }))} />
            <Button className="self-end" loading={save.isPending} onClick={() => save.mutate({ employee: emp, year, allocations: Object.fromEntries(['casual', 'sick', 'earned'].filter((k) => alloc[k] !== '').map((k) => [k, Number(alloc[k])])), carriedForward: num(alloc.carriedForward) })}>Save</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function LeavePage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'requests';
  const [applying, setApplying] = useState(false);
  return (
    <div>
      <PageHeader title="Leave" description="Approve requests, see who is away, and manage yearly allocations." actions={<Button icon={CalendarPlus} onClick={() => setApplying(true)}>Record leave</Button>} />
      <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ value: 'requests', label: 'Requests' }, { value: 'calendar', label: 'Calendar' }, { value: 'balances', label: 'Balances' }]} />
      {tab === 'requests' && <RequestsTab />}
      {tab === 'calendar' && <CalendarTab />}
      {tab === 'balances' && <BalancesTab />}
      <ApplyLeaveModal open={applying} onClose={() => setApplying(false)} forEmployee />
    </div>
  );
}
