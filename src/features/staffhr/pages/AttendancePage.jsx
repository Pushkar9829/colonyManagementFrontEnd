import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, LogIn, Save, UserCheck, UserX, Clock, Plane } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Modal, Select, Spinner, StatCard, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { useForm } from '../../../hooks/useForm';
import { currentPeriod, label, time, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { addDays, downloadFile } from '../../assets/shared';
import { useDaySheet, useMarkAttendance, useRegister, useRoster, useSaveRoster } from '../api';

import { ATT_TONES } from '../constants';
const CODE_TONES = { P: 'text-emerald-700', L: 'text-amber-600', H: 'text-amber-600', A: 'text-red-600 font-bold', LV: 'text-sky-700', HL: 'text-sky-700', LOP: 'text-red-600', WO: 'text-slate-400', HO: 'text-slate-400' };
// 24h IST wall-clock time for <input type="time">.
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
const mondayOf = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
};

function MarkModal({ row, dateStr, onClose }) {
  const { t } = useT();
  const rec = row?.record;
  const { values, bind, applyServerErrors } = useForm({
    status: rec?.status && rec.status !== 'on_leave' ? rec.status : 'present',
    checkIn: rec?.checkIn?.at ? hhmm(rec.checkIn.at) : '',
    checkOut: rec?.checkOut?.at ? hhmm(rec.checkOut.at) : '',
    notes: rec?.notes || '',
  });
  const mark = useMarkAttendance({ onSuccess: onClose });
  if (!row) return null;
  return (
    <Modal open onClose={onClose} title={t('Mark attendance · {name}', { name: row.employee.name })} description={dateStr} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={mark.isPending} onClick={() => mark.mutate({ employee: row.employee._id, date: dateStr, status: values.status, checkIn: values.checkIn || undefined, checkOut: values.checkOut || undefined, notes: values.notes || undefined }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="space-y-4">
        <Select label="Status" options={['present', 'late', 'half_day', 'absent', 'week_off', 'holiday'].map((v) => ({ value: v, label: label(v) }))} {...bind('status')} />
        {['present', 'late', 'half_day'].includes(values.status) && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="In (24h)" type="time" {...bind('checkIn')} />
            <Input label="Out (24h)" type="time" {...bind('checkOut')} />
          </div>
        )}
        <Textarea label="Note" rows={2} {...bind('notes')} />
      </div>
    </Modal>
  );
}

function TodayTab() {
  const { t: tx } = useT();
  const [d, setD] = useState(todayISO());
  const { data, isLoading } = useDaySheet(d);
  const [mark, setMark] = useState(null);
  const t = data?.totals;
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} aria-label={tx('Previous day')} onClick={() => setD(addDays(d, -1))} />
        <Input label="Date" type="date" value={d} max={todayISO()} onChange={(e) => setD(e.target.value)} />
        <Button variant="secondary" size="sm" icon={ChevronRight} aria-label={tx('Next day')} disabled={d >= todayISO()} onClick={() => setD(addDays(d, 1))} />
      </div>
      {t && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={UserCheck} tone="green" label="Present" value={`${t.present} / ${t.employees}`} sub={tx('{n} on duty now', { n: t.in })} />
          <StatCard icon={Clock} tone="amber" label="Late" value={t.late} />
          <StatCard icon={Plane} tone="sky" label="On leave" value={t.onLeave} />
          <StatCard icon={UserX} tone="red" label="Absent / not marked" value={`${t.absent} / ${t.notMarked}`} />
        </div>
      )}
      <Card>
        <Table loading={isLoading} rows={(data?.rows || []).map((r) => ({ ...r, _id: r.employee._id }))} empty="No employees"
          columns={[
            { key: 'name', header: 'Employee', render: (r) => <div><p className="font-medium text-slate-900">{r.employee.name}</p><p className="text-xs text-slate-500">{r.employee.employeeCode}{r.employee.designation ? ` · ${r.employee.designation}` : ''}</p></div> },
            { key: 'shift', header: 'Shift', render: (r) => (r.dayOff ? <span className="text-slate-400">{tx('Day off')}</span> : r.shift ? `${r.shift.name} ${r.shift.start}` : '—') },
            { key: 'in', header: 'In', render: (r) => (r.record?.checkIn?.at ? <span className="flex items-center gap-1.5">{time(r.record.checkIn.at)}{r.record.checkIn.photo && <a href={r.record.checkIn.photo.url} target="_blank" rel="noreferrer"><img src={r.record.checkIn.photo.url} alt={tx('Selfie')} className="size-7 rounded-full object-cover" /></a>}<span className="text-[10px] uppercase text-slate-400">{r.record.checkIn.source}</span></span> : '—') },
            { key: 'out', header: 'Out', render: (r) => (r.record?.checkOut?.at ? time(r.record.checkOut.at) : '—') },
            { key: 'status', header: 'Status', render: (r) => (r.record ? <span className="flex items-center gap-1"><Badge tone={ATT_TONES[r.record.status]}>{tx(label(r.record.status))}</Badge>{r.record.lateMinutes > 0 && r.record.status === 'late' && <span className="text-xs text-amber-600">+{r.record.lateMinutes}m</span>}</span> : <span className="text-slate-400">{tx('Not marked')}</span>) },
            { key: 'act', header: '', render: (r) => <Button size="sm" variant="ghost" icon={LogIn} onClick={() => setMark(r)}>Mark</Button> },
          ]} />
      </Card>
      {mark && <MarkModal row={mark} dateStr={d} onClose={() => setMark(null)} />}
    </div>
  );
}

function RosterTab() {
  const { t } = useT();
  const [week, setWeek] = useState(mondayOf(todayISO()));
  const { data, isLoading } = useRoster(week);
  const [grid, setGrid] = useState({});
  const save = useSaveRoster();
  useEffect(() => {
    if (data) setGrid(Object.fromEntries(data.rows.map((r) => [r.employee._id, r.shifts.map((s) => s || '')])));
  }, [data]);
  const shiftOpts = useMemo(() => [{ value: '', label: t('Off') }, ...(data?.shifts || []).map((s) => ({ value: s._id, label: s.name }))], [data, t]);
  const setCell = (emp, i, v) => setGrid((g) => ({ ...g, [emp]: g[emp].map((x, j) => (j === i ? v : x)) }));
  const submit = () => save.mutate({ weekStart: week, assignments: Object.entries(grid).map(([employee, shifts]) => ({ employee, shifts: shifts.map((s) => s || null) })) });
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={ChevronLeft} aria-label={t('Previous week')} onClick={() => setWeek(addDays(week, -7))} />
          <span className="text-sm font-medium text-slate-700">{t('Week of {week}', { week })}</span>
          <Button variant="secondary" size="sm" icon={ChevronRight} aria-label={t('Next week')} onClick={() => setWeek(addDays(week, 7))} />
        </div>
        <Button icon={Save} loading={save.isPending} disabled={!data?.rows?.length} onClick={submit}>Publish roster</Button>
      </div>
      {isLoading || !data ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">{t('Employee')}</th>
                {data.dates.map((d) => <th key={d} className="px-2 py-2 text-left">{new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', timeZone: 'UTC' })}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.employee._id}>
                  <td className="whitespace-nowrap px-3 py-2"><p className="font-medium text-slate-900">{r.employee.user?.name}</p><p className="text-xs text-slate-500">{r.employee.employeeCode}{!r.published && ` · ${t('default')}`}</p></td>
                  {data.dates.map((d, i) => (
                    <td key={d} className="px-1 py-1">
                      <select className="h-9 w-24 rounded-md border border-slate-300 bg-white px-1 text-xs" value={grid[r.employee._id]?.[i] ?? ''} onChange={(e) => setCell(r.employee._id, i, e.target.value)}>
                        {shiftOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rows.length && <p className="p-6 text-center text-sm text-slate-500">{t('Add employees first.')}</p>}
        </div>
      )}
    </Card>
  );
}

function RegisterTab() {
  const toast = useToast();
  const { t } = useT();
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = useRegister(period);
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <Input label="Month" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <Button variant="secondary" icon={Download} onClick={() => downloadFile('/staffhr/attendance/register/export', { period }, `attendance-${period}.xlsx`).catch((e) => toast.error(e))}>Excel</Button>
        <p className="text-xs text-slate-500">{t('P present · L late · H half day · A absent · LV leave · HL half-day leave · LOP unpaid · WO week off')}</p>
      </div>
      {isLoading || !data ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">{t('Employee')}</th>
                {data.dates.map((d) => <th key={d} className="px-1 py-2 text-center">{Number(d.slice(8))}</th>)}
                <th className="px-2 py-2">P</th><th className="px-2 py-2">A</th><th className="px-2 py-2">LV</th><th className="px-2 py-2">LOP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.employee._id}>
                  <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2"><p className="font-medium text-slate-900">{r.employee.name}</p><p className="text-slate-400">{r.employee.employeeCode}</p></td>
                  {r.days.map((c, i) => <td key={data.dates[i]} className={`px-1 py-2 text-center ${CODE_TONES[c] || ''}`}>{c || '·'}</td>)}
                  <td className="px-2 text-center font-medium">{r.totals.present + r.totals.late + r.totals.halfDay * 0.5}</td>
                  <td className="px-2 text-center font-medium text-red-600">{r.totals.absent}</td>
                  <td className="px-2 text-center">{r.totals.paidLeave}</td>
                  <td className="px-2 text-center text-red-600">{r.totals.unpaidLeave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || (manager ? 'today' : 'register');
  const tabs = manager ? [{ value: 'today', label: 'Day sheet' }, { value: 'roster', label: 'Roster' }, { value: 'register', label: 'Monthly register' }] : [{ value: 'register', label: 'Monthly register' }];
  return (
    <div>
      <PageHeader title="Roster & attendance" description="Shifts, selfie / device check-ins, late and absent tracking, and the monthly register." />
      <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={tabs} />
      {manager && tab === 'today' && <TodayTab />}
      {manager && tab === 'roster' && <RosterTab />}
      {tab === 'register' && <RegisterTab />}
    </div>
  );
}
