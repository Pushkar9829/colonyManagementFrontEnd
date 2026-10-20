import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarPlus, FileText, Hammer, ScanLine, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Pagination, Spinner, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { currentPeriod, date, label, money, periodLabel, time, todayISO } from '../../../lib/format';
import { addDays, openPdf } from '../../assets/shared';
import { useBreakdowns, useRuns, useTasks, useWorkOrders } from '../../maintenance/api';
import { breakdownTone, BreakdownDetailModal } from '../../maintenance/components/BreakdownModals';
import { RunModal } from '../../maintenance/components/RunModal';
import { TaskModal } from '../../maintenance/components/TaskModal';
import { WorkOrderDetailModal } from '../../maintenance/components/WorkOrderModals';
import { RUN_TONES, TASK_TONES, WO_TONES } from '../../maintenance/constants';
import { useCancelLeave, useLeaveBalances, useLeaves, useMyAttendance, usePayslips } from '../api';
import { ATT_TONES } from '../constants';
import { ApplyLeaveModal, BalanceCards, LEAVE_TONES } from '../components/LeaveModals';
import { PunchCard } from '../components/PunchCard';
import { MyTicketsCard } from '../components/MyTicketsCard';

const isTech = (role) => ['staff', 'facility_manager', 'admin'].includes(role);

function TodayTab() {
  const { user } = useAuth();
  const { t: tx } = useT();
  const t = todayISO();
  const fieldWork = user.role !== 'accountant';
  const tasks = useTasks({ mine: true, open: true, to: addDays(t, 1), limit: 50 }, fieldWork);
  const runs = useRuns({ date: t, mine: true, limit: 50 }, fieldWork);
  const wos = useWorkOrders({ open: true, mine: true, limit: 20 }, isTech(user.role));
  const bds = useBreakdowns({ open: true, limit: 20 }, user.role === 'staff');
  const [task, setTask] = useState(null);
  const [run, setRun] = useState(null);
  const [wo, setWo] = useState(null);
  const [bd, setBd] = useState(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PunchCard />
        {/* Only people with rounds today see this card; for guards the rounds are their patrol/area checks. */}
        {(runs.isLoading || runs.data?.data?.length > 0) && (
          <Card>
            <CardHeader title={user.role === 'guard' ? 'My rounds' : 'Checklists today'} subtitle={user.role === 'guard' ? 'Area rounds to finish today, with photo proof' : 'Housekeeping / area rounds with photo proof'} />
            {runs.isLoading ? <div className="flex justify-center p-6"><Spinner /></div> : (
              <ul className="divide-y divide-slate-100">
                {runs.data.data.map((r) => (
                  <li key={r._id}>
                    <button type="button" onClick={() => setRun(r)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50">
                      <div className="min-w-0"><p className="truncate font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{tx('{slot} · by {time}', { slot: r.slot, time: time(r.dueAt) })}</p></div>
                      <Badge tone={RUN_TONES[r.status]}>{tx(label(r.status))}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
      <div className="space-y-6">
        {isTech(user.role) && <MyTicketsCard />}
        <Card>
          <CardHeader title="My maintenance tasks" subtitle="Due today, tomorrow or overdue" action={<Link to="/assets/scan"><Button size="sm" variant="secondary" icon={ScanLine}>Scan asset</Button></Link>} />
          {tasks.isLoading ? <div className="flex justify-center p-6"><Spinner /></div> : !tasks.data?.data?.length ? <EmptyState icon={Wrench} title="Nothing due" /> : (
            <ul className="divide-y divide-slate-100">
              {tasks.data.data.map((x) => (
                <li key={x._id}>
                  <button type="button" onClick={() => setTask(x._id)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate font-medium text-slate-900">{x.title}</p><p className="text-xs text-slate-500">{tx('{asset} · due {date}', { asset: x.asset?.name || '', date: date(x.dueDate) })}</p></div>
                    <Badge tone={TASK_TONES[x.status]}>{tx(label(x.status))}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {isTech(user.role) && (
          <Card>
            <CardHeader title="Work orders & breakdowns" />
            <ul className="divide-y divide-slate-100">
              {(wos.data?.data || []).map((w) => (
                <li key={w._id}>
                  <button type="button" onClick={() => setWo(w._id)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate font-medium text-slate-900"><Hammer className="mr-1 inline size-3.5 text-slate-400" />{w.title}</p><p className="text-xs text-slate-500">{w.number}{w.asset ? ` · ${w.asset.name}` : ''}</p></div>
                    <Badge tone={WO_TONES[w.status]}>{tx(label(w.status))}</Badge>
                  </button>
                </li>
              ))}
              {(bds.data?.data || []).map((b) => (
                <li key={b._id}>
                  <button type="button" onClick={() => setBd(b._id)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate font-medium text-slate-900"><Wrench className="mr-1 inline size-3.5 text-slate-400" />{b.title}</p><p className="text-xs text-slate-500">{b.number} · {b.asset?.name}</p></div>
                    <Badge tone={breakdownTone(b.status)}>{tx(label(b.status))}</Badge>
                  </button>
                </li>
              ))}
              {!wos.data?.data?.length && !bds.data?.data?.length && <li className="px-5 py-6 text-center text-sm text-slate-500">{tx('Nothing assigned')}</li>}
            </ul>
          </Card>
        )}
      </div>
      <TaskModal taskId={task} open={Boolean(task)} onClose={() => setTask(null)} />
      <RunModal run={run} onClose={() => setRun(null)} />
      <WorkOrderDetailModal id={wo} open={Boolean(wo)} onClose={() => setWo(null)} />
      <BreakdownDetailModal id={bd} open={Boolean(bd)} onClose={() => setBd(null)} />
    </div>
  );
}

function AttendanceTab() {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading, error } = useMyAttendance(period);
  const { t: tx } = useT();
  if (error) return <Card className="p-5 text-sm text-slate-600">{error.message}</Card>;
  const t = data?.totals;
  return (
    <Card>
      <CardHeader title={periodLabel(period)} subtitle={t ? tx('{present} present · {late} late · {halfDay} half day · {absent} absent · {leave} leave', { present: t.present + t.late, late: t.late, halfDay: t.halfDay, absent: t.absent, leave: t.paidLeave + t.unpaidLeave }) : undefined} action={<Input title="Month" type="month" value={period} max={currentPeriod()} onChange={(e) => setPeriod(e.target.value)} />} />
      <Table loading={isLoading} rows={data?.records} empty="No attendance this month"
        columns={[
          { key: 'date', header: 'Date', render: (r) => date(r.date) },
          { key: 'shift', header: 'Shift', render: (r) => r.shift?.name || '—' },
          { key: 'in', header: 'In', render: (r) => (r.checkIn?.at ? time(r.checkIn.at) : '—') },
          { key: 'out', header: 'Out', render: (r) => (r.checkOut?.at ? time(r.checkOut.at) : '—') },
          { key: 'worked', header: 'Worked', render: (r) => (r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '—') },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={ATT_TONES[r.status]}>{tx(label(r.status))}{r.status === 'late' ? ` +${r.lateMinutes}m` : ''}</Badge> },
        ]} />
    </Card>
  );
}

function LeaveTab() {
  const [applying, setApplying] = useState(false);
  const [page, setPage] = useState(1);
  const { data: bal, error } = useLeaveBalances({});
  const { data, isLoading } = useLeaves({ mine: true, page });
  const cancel = useCancelLeave();
  const { t } = useT();
  if (error) return <Card className="p-5 text-sm text-slate-600">{error.message}</Card>;
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{t('Balance {year}', { year: bal?.year ?? '' })}</p><Button icon={CalendarPlus} onClick={() => setApplying(true)}>Apply for leave</Button></div>
        <BalanceCards balances={bal?.balances} />
      </Card>
      <Card>
        <Table loading={isLoading} rows={data?.data} empty="No leave requests"
          columns={[
            { key: 'type', header: 'Type', render: (l) => t(label(l.type)) },
            { key: 'dates', header: 'Dates', render: (l) => `${date(l.from)}${l.to !== l.from ? ` – ${date(l.to)}` : ''}${l.halfDay ? ` ${t('(half)')}` : ''}` },
            { key: 'days', header: 'Days' },
            { key: 'status', header: 'Status', render: (l) => <div><Badge tone={LEAVE_TONES[l.status]}>{t(label(l.status))}</Badge>{l.decisionNote && <p className="text-xs text-slate-500">{l.decisionNote}</p>}</div> },
            { key: 'act', header: '', render: (l) => (l.status === 'pending' || (l.status === 'approved' && l.from > todayISO())) && <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(l._id)}>Cancel</Button> },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      <ApplyLeaveModal open={applying} onClose={() => setApplying(false)} />
    </div>
  );
}

function PayslipsTab() {
  const toast = useToast();
  const { t } = useT();
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayslips({ page });
  return (
    <Card>
      <Table loading={isLoading} rows={data?.data} empty="No payslips yet"
        columns={[
          { key: 'period', header: 'Month', render: (p) => <span className="font-medium">{periodLabel(p.period)}</span> },
          { key: 'days', header: 'Paid days', render: (p) => `${p.paidDays} / ${p.daysInPeriod}` },
          { key: 'gross', header: 'Gross', render: (p) => money(p.gross) },
          { key: 'deductions', header: 'Deductions', render: (p) => money(p.deductions) },
          { key: 'net', header: 'Net', render: (p) => <span className="font-semibold">{money(p.net)}</span> },
          { key: 'status', header: 'Status', render: (p) => <Badge tone={p.status === 'paid' ? 'green' : 'blue'}>{p.status === 'paid' ? t('Paid {date}', { date: date(p.paidAt) }) : t('Approved')}</Badge> },
          { key: 'pdf', header: '', render: (p) => <Button size="sm" variant="secondary" icon={FileText} onClick={() => openPdf(`/staffhr/payslips/${p._id}/pdf`).catch((e) => toast.error(e))}>PDF</Button> },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

export default function MyWorkPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'today';
  return (
    <div>
      <PageHeader title="My work" description="Today’s tasks and checklists, attendance, leave and payslips." />
      <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ value: 'today', label: 'Today' }, { value: 'attendance', label: 'Attendance' }, { value: 'leave', label: 'Leave' }, { value: 'payslips', label: 'Payslips' }]} />
      {tab === 'today' && <TodayTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'payslips' && <PayslipsTab />}
    </div>
  );
}
