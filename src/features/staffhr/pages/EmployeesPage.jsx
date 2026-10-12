import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, FilterBar, Input, Pagination, Select, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { date, label, money, toPaise, toRupees } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useCreateShift, useEmployees, useHrSettings, useShifts, useUpdateHrSettings, useUpdateShift } from '../api';
import { DEPARTMENTS, EmployeeModal } from '../components/EmployeeModal';

const PV_TONES = { verified: 'green', submitted: 'amber', failed: 'red', not_started: 'slate' };
const grossOf = (s = {}) => (s.basic || 0) + (s.hra || 0) + (s.allowances || []).reduce((t, a) => t + a.amount, 0);

function EmployeesTab({ manager, creating, setCreating }) {
  const [f, setF] = useState({ search: '', department: '', status: 'active', page: 1 });
  const { data, isLoading } = useEmployees(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const [edit, setEdit] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      <FilterBar cols={3} active={[f.department, f.status !== 'active' && f.status].filter(Boolean).length}
        search={<Input aria-label="Search employees" placeholder="Search name, code…" value={f.search} onChange={set('search')} />}>
        <Select aria-label="Department" placeholder="All departments" options={DEPARTMENTS} value={f.department} onChange={set('department')} />
        <Select aria-label="Status" placeholder="Any status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Left' }]} value={f.status} onChange={set('status')} />
      </FilterBar>
      <Table loading={isLoading} rows={data?.data} empty="No employees yet" onRowClick={manager ? setEdit : undefined}
        emptyAction={manager && <Button icon={Plus} onClick={() => setCreating(true)}>Add employee</Button>}
        columns={[
          { key: 'name', header: 'Name', render: (e) => <div><p className="font-medium text-slate-900">{e.user?.name}</p><p className="text-xs text-slate-500">{e.designation || label(e.membership?.role)} · {label(e.department)}</p></div> },
          { key: 'employeeCode', header: 'Code', render: (e) => <span className="font-mono text-xs font-semibold">{e.employeeCode}</span> },
          { key: 'doj', header: 'Joined', mobile: false, render: (e) => (e.dateOfJoining ? date(e.dateOfJoining) : '—') },
          { key: 'shift', header: 'Shift', mobile: false, render: (e) => (e.defaultShift ? `${e.defaultShift.name} ${e.defaultShift.start}–${e.defaultShift.end}` : '—') },
          { key: 'gross', header: 'Gross / month', render: (e) => money(grossOf(e.salary)) },
          { key: 'bank', header: 'Bank', render: (e) => (e.bank?.accountLast4 ? `•••• ${e.bank.accountLast4}` : <span className="text-amber-600">Missing</span>) },
          { key: 'pv', header: 'Police verification', render: (e) => <Badge tone={PV_TONES[e.policeVerification?.status || 'not_started']}>{label(e.policeVerification?.status || 'not_started')}</Badge> },
          { key: 'status', header: '', render: (e) => (e.status === 'inactive' ? <Badge>Left</Badge> : null) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      <EmployeeModal open={creating || Boolean(edit)} employee={edit} onClose={() => { setCreating(false); setEdit(null); }} />
    </Card>
  );
}

function ShiftsTab() {
  const { data, isLoading } = useShifts();
  const [form, setForm] = useState({ name: '', start: '08:00', end: '20:00' });
  const create = useCreateShift({ onSuccess: () => setForm({ name: '', start: '08:00', end: '20:00' }) });
  const update = useUpdateShift();
  return (
    <Card>
      <CardHeader title="Shift templates" subtitle="End before start means the shift runs past midnight." />
      <form className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
        <Input placeholder="Name (Day, Night…)" value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} />
        <Input type="time" value={form.start} onChange={(e) => setForm((x) => ({ ...x, start: e.target.value }))} />
        <Input type="time" value={form.end} onChange={(e) => setForm((x) => ({ ...x, end: e.target.value }))} />
        <Button type="submit" icon={Plus} loading={create.isPending}>Add shift</Button>
      </form>
      <Table loading={isLoading} rows={data} empty="No shifts yet"
        columns={[
          { key: 'name', header: 'Shift', render: (s) => <span className="font-medium">{s.name}</span> },
          { key: 'time', header: 'Hours', render: (s) => `${s.start} – ${s.end}${s.end <= s.start ? ' (next day)' : ''}` },
          { key: 'active', header: '', render: (s) => <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: s._id, active: !s.active })}>{s.active ? 'Disable' : 'Enable'}</Button> },
        ]} />
    </Card>
  );
}

function SettingsTab() {
  const toast = useToast();
  const { data } = useHrSettings();
  const save = useUpdateHrSettings();
  const [v, setV] = useState(null);
  useEffect(() => {
    if (data) {
      setV({
        enabled: Boolean(data.geofence?.enabled), lat: data.geofence?.lat ?? '', lng: data.geofence?.lng ?? '', radiusM: data.geofence?.radiusM ?? 200,
        requireSelfie: data.requireSelfie, lateGraceMinutes: data.lateGraceMinutes, halfDayMinutes: data.halfDayMinutes,
        casual: data.leaveQuota?.casual ?? 12, sick: data.leaveQuota?.sick ?? 7, earned: data.leaveQuota?.earned ?? 15,
        pfWageCeiling: toRupees(data.pfWageCeiling), esiWageCeiling: toRupees(data.esiWageCeiling),
      });
    }
  }, [data]);
  if (!v) return null;
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const useHere = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setV((x) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => toast.error('Could not read your location'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  const submit = () =>
    save.mutate({
      geofence: { enabled: v.enabled, lat: v.lat === '' ? undefined : Number(v.lat), lng: v.lng === '' ? undefined : Number(v.lng), radiusM: Number(v.radiusM) },
      requireSelfie: v.requireSelfie,
      lateGraceMinutes: Number(v.lateGraceMinutes),
      halfDayMinutes: Number(v.halfDayMinutes),
      leaveQuota: { casual: Number(v.casual), sick: Number(v.sick), earned: Number(v.earned) },
      pfWageCeiling: toPaise(v.pfWageCeiling),
      esiWageCeiling: toPaise(v.esiWageCeiling),
    });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Attendance" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Checkbox className="sm:col-span-2" label="Staff must take a selfie to check in / out" checked={v.requireSelfie} onChange={set('requireSelfie')} />
          <Checkbox className="sm:col-span-2" label="Only allow check-in near the society (geofence)" checked={v.enabled} onChange={set('enabled')} />
          <Input label="Latitude" type="number" step="any" value={v.lat} onChange={set('lat')} />
          <Input label="Longitude" type="number" step="any" value={v.lng} onChange={set('lng')} />
          <Input label="Radius (metres)" type="number" min="20" max="5000" value={v.radiusM} onChange={set('radiusM')} />
          <Button className="self-end" variant="secondary" icon={MapPin} onClick={useHere}>Use my location</Button>
          <Input label="Late after (minutes past shift start)" type="number" min="0" value={v.lateGraceMinutes} onChange={set('lateGraceMinutes')} />
          <Input label="Half day if worked under (minutes)" type="number" min="0" value={v.halfDayMinutes} onChange={set('halfDayMinutes')} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Leave & payroll" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Input label="Casual / year" type="number" min="0" value={v.casual} onChange={set('casual')} />
          <Input label="Sick / year" type="number" min="0" value={v.sick} onChange={set('sick')} />
          <Input label="Earned / year" type="number" min="0" value={v.earned} onChange={set('earned')} />
          <Input className="sm:col-span-3" label="PF wage ceiling (₹ / month)" type="number" min="0" value={v.pfWageCeiling} onChange={set('pfWageCeiling')} hint="PF is charged on basic up to this amount" />
          <Input className="sm:col-span-3" label="ESI wage ceiling (₹ / month)" type="number" min="0" value={v.esiWageCeiling} onChange={set('esiWageCeiling')} hint="ESI applies only when gross is at or below this" />
        </div>
      </Card>
      <div className="lg:col-span-2"><Button loading={save.isPending} onClick={submit}>Save settings</Button></div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'employees';
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <PageHeader title="Employees" description="HR profiles of society staff: salary structure, bank, documents and police verification."
        actions={manager && tab === 'employees' && <Button icon={Plus} onClick={() => setCreating(true)}>Add employee</Button>} />
      {manager && <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ value: 'employees', label: 'Employees' }, { value: 'shifts', label: 'Shifts' }, { value: 'settings', label: 'HR settings' }]} />}
      {tab === 'employees' && <EmployeesTab manager={manager} creating={creating} setCreating={setCreating} />}
      {manager && tab === 'shifts' && <ShiftsTab />}
      {manager && tab === 'settings' && <SettingsTab />}
    </div>
  );
}
