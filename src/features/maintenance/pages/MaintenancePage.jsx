import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarCheck2, CheckCircle2, Plus, Siren, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Modal, Pagination, Select, StatCard, Table, Tabs, Textarea } from '../../../components/ui';
import { date, dateTime, label, todayISO } from '../../../lib/format';
import { ASSIGNEE_ROLES, addDays, usePeople } from '../../assets/shared';
import { useAssignTask, useBreakdowns, useMaintenanceStats, usePpmReport, useSchedules, useSkipTask, useTasks } from '../api';
import { BreakdownDetailModal, ReportBreakdownModal, breakdownTone } from '../components/BreakdownModals';
import { ScheduleModal } from '../components/ScheduleModal';
import { TaskModal } from '../components/TaskModal';
import { CreateWorkOrderModal } from '../components/WorkOrderModals';
import { BD_STATUSES, FREQUENCIES, TASK_STATUSES, TASK_TONES } from '../constants';

const freqText = (s) => (s.frequency === 'every_n_days' ? `Every ${s.intervalDays} days` : FREQUENCIES.find((f) => f.value === s.frequency)?.label);

function TaskActionsModal({ task, onClose }) {
  const [reason, setReason] = useState('');
  const [assignee, setAssignee] = useState(task?.assignee?._id || '');
  const [role, setRole] = useState(task?.assigneeRole || 'staff');
  const { data: people } = usePeople(['staff', 'facility_manager', 'guard'], Boolean(task));
  const skip = useSkipTask({ onSuccess: onClose });
  const assign = useAssignTask({ onSuccess: onClose });
  if (!task) return null;
  return (
    <Modal open onClose={onClose} title={task.title} description={`Due ${date(task.dueDate)}`} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Reassign</p>
          <Select label="Role" options={ASSIGNEE_ROLES} value={role} onChange={(e) => setRole(e.target.value)} />
          <Select label="Person" placeholder="Anyone in that role" options={people || []} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          <Button loading={assign.isPending} onClick={() => assign.mutate({ id: task._id, assignee: assignee || null, assigneeRole: role })}>Save assignment</Button>
        </div>
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-800">Skip this occurrence</p>
          <Textarea rows={2} placeholder="Reason (e.g. asset under AMC repair)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="secondary" disabled={reason.trim().length < 3} loading={skip.isPending} onClick={() => skip.mutate({ id: task._id, reason })}>Skip</Button>
        </div>
      </div>
    </Modal>
  );
}

function TasksTab({ initialStatus, initialTask }) {
  const [f, setF] = useState({ status: initialStatus || '', from: todayISO(), to: addDays(todayISO(), 7), page: 1 });
  const { data, isLoading } = useTasks(Object.fromEntries(Object.entries({ ...f, from: f.status === 'overdue' ? undefined : f.from, to: f.status === 'overdue' ? undefined : f.to }).filter(([, v]) => v)));
  const [open, setOpen] = useState(initialTask || null);
  const [manage, setManage] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Select placeholder="All statuses" options={TASK_STATUSES} value={f.status} onChange={set('status')} />
        <Input type="date" value={f.from} onChange={set('from')} disabled={f.status === 'overdue'} />
        <Input type="date" value={f.to} onChange={set('to')} disabled={f.status === 'overdue'} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No tasks in this range" onRowClick={(t) => setOpen(t._id)}
        columns={[
          { key: 'dueDate', header: 'Due', render: (t) => date(t.dueDate) },
          { key: 'title', header: 'Task', className: 'max-w-xs', render: (t) => <div className="truncate"><p className="truncate font-medium text-slate-900">{t.title}</p><p className="text-xs text-slate-500">{t.asset?.name} · {t.asset?.code}</p></div> },
          { key: 'assignee', header: 'Assigned', render: (t) => t.assignee?.name || <span className="text-slate-500">Any {label(t.assigneeRole)}</span> },
          { key: 'status', header: 'Status', render: (t) => <div className="flex gap-1"><Badge tone={TASK_TONES[t.status]}>{label(t.status)}</Badge>{t.hasIssues && <Badge tone="red">Issues</Badge>}{t.late && <Badge tone="amber">Late</Badge>}</div> },
          { key: 'done', header: 'Done', render: (t) => (t.completedAt ? `${dateTime(t.completedAt)} · ${t.completedBy?.name || ''}` : '—') },
          { key: 'manage', header: '', render: (t) => ['pending', 'overdue'].includes(t.status) && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setManage(t); }}>Manage</Button> },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      <TaskModal taskId={open} open={Boolean(open)} onClose={() => setOpen(null)} />
      {manage && <TaskActionsModal task={manage} onClose={() => setManage(null)} />}
    </Card>
  );
}

function SchedulesTab() {
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const { data, isLoading } = useSchedules({ page });
  return (
    <Card>
      <Table loading={isLoading} rows={data?.data} empty="No PPM schedules yet" onRowClick={setEdit}
        columns={[
          { key: 'title', header: 'Schedule', render: (s) => <div><p className="font-medium text-slate-900">{s.title}</p><p className="text-xs text-slate-500">{s.asset?.name} · {s.asset?.code}</p></div> },
          { key: 'frequency', header: 'Frequency', render: freqText },
          { key: 'startDate', header: 'From', render: (s) => date(s.startDate) },
          { key: 'checklist', header: 'Checks', render: (s) => s.checklist.length },
          { key: 'assignee', header: 'Who', render: (s) => s.assignee?.name || `Any ${label(s.assigneeRole)}` },
          { key: 'active', header: '', render: (s) => (s.active ? <Badge tone="green">Active</Badge> : <Badge>Paused</Badge>) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      <ScheduleModal open={Boolean(edit)} schedule={edit} onClose={() => setEdit(null)} />
    </Card>
  );
}

function BreakdownsTab() {
  const [params, setParams] = useSearchParams();
  const [f, setF] = useState({ status: '', page: 1 });
  const { data, isLoading } = useBreakdowns(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const openId = params.get('id');
  const [woPreset, setWoPreset] = useState(null);
  const setOpen = (id) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('id', id); else n.delete('id'); return n; });
  return (
    <Card>
      <div className="border-b border-slate-100 p-4 sm:w-64">
        <Select placeholder="All statuses" options={BD_STATUSES} value={f.status} onChange={(e) => setF({ status: e.target.value, page: 1 })} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No breakdowns" onRowClick={(b) => setOpen(b._id)}
        columns={[
          { key: 'number', header: 'No.', render: (b) => <span className="font-mono text-xs font-semibold">{b.number}</span> },
          { key: 'title', header: 'Issue', className: 'max-w-xs', render: (b) => <div className="truncate"><p className="truncate font-medium text-slate-900">{b.title}</p><p className="text-xs text-slate-500">{b.asset?.name} · {b.asset?.code}</p></div> },
          { key: 'priority', header: 'Priority', render: (b) => <Badge tone={b.priority === 'urgent' ? 'red' : b.priority === 'high' ? 'amber' : 'slate'}>{label(b.priority)}</Badge> },
          { key: 'status', header: 'Status', render: (b) => <Badge tone={breakdownTone(b.status)}>{label(b.status)}</Badge> },
          { key: 'assignedTo', header: 'Assigned', render: (b) => b.assignedTo?.name || '—' },
          { key: 'createdAt', header: 'Reported', render: (b) => dateTime(b.createdAt) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      <BreakdownDetailModal id={openId} open={Boolean(openId)} onClose={() => setOpen(null)} onCreateWorkOrder={(b) => { setOpen(null); setWoPreset({ asset: b.asset?._id, breakdown: b._id, title: b.title }); }} />
      <CreateWorkOrderModal open={Boolean(woPreset)} preset={woPreset} onClose={() => setWoPreset(null)} />
    </Card>
  );
}

function ReportTab() {
  const [range, setRange] = useState({ from: addDays(todayISO(), -29), to: todayISO() });
  const { data, isLoading } = usePpmReport(range);
  const t = data?.totals;
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </Card>
      {t && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CalendarCheck2} label="Completion rate" value={t.completionRate === null ? '—' : `${t.completionRate}%`} sub={`${t.completed} of ${t.total - t.pending - t.skipped} due`} />
          <StatCard icon={CheckCircle2} tone="green" label="On time" value={t.onTime} sub={`${t.late} late`} />
          <StatCard icon={AlertTriangle} tone="red" label="Missed" value={t.missed} sub={`${t.overdue} still overdue`} />
          <StatCard icon={Wrench} tone="amber" label="Found issues" value={t.issues} />
        </div>
      )}
      <Card>
        <Table loading={isLoading} rows={data?.rows} rowKey="schedule" empty="No tasks were due in this range"
          columns={[
            { key: 'title', header: 'Schedule', render: (r) => <div><p className="font-medium text-slate-900">{r.title}</p><p className="text-xs text-slate-500">{r.asset?.name} · {r.asset?.code}</p></div> },
            { key: 'total', header: 'Due' },
            { key: 'completed', header: 'Done' },
            { key: 'late', header: 'Late' },
            { key: 'missed', header: 'Missed' },
            { key: 'overdue', header: 'Overdue' },
            { key: 'completionRate', header: 'Rate', render: (r) => (r.completionRate === null ? '—' : <Badge tone={r.completionRate >= 90 ? 'green' : r.completionRate >= 70 ? 'amber' : 'red'}>{r.completionRate}%</Badge>) },
          ]} />
      </Card>
    </div>
  );
}

export default function MaintenancePage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'tasks';
  const [modal, setModal] = useState(null);
  const { data: stats } = useMaintenanceStats();
  const setTab = (t) => setParams({ tab: t });

  return (
    <div>
      <PageHeader
        title="Maintenance (PPM)"
        description="Preventive maintenance plans, the task calendar they generate, and equipment breakdowns."
        actions={
          <>
            <Button variant="danger" icon={Siren} onClick={() => setModal('breakdown')}>Report breakdown</Button>
            <Button icon={Plus} onClick={() => setModal('schedule')}>New schedule</Button>
          </>
        }
      />
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CalendarCheck2} label="Due today" value={stats.dueToday} />
          <StatCard icon={AlertTriangle} tone="red" label="Overdue" value={stats.overdue} to="/maintenance?tab=tasks&status=overdue" />
          <StatCard icon={CheckCircle2} tone="green" label="Done today" value={stats.completedToday} />
          <StatCard icon={Siren} tone="amber" label="Open breakdowns" value={stats.openBreakdowns} to="/maintenance?tab=breakdowns" />
        </div>
      )}
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'tasks', label: 'Tasks' }, { value: 'schedules', label: 'Schedules' }, { value: 'breakdowns', label: 'Breakdowns', count: stats?.openBreakdowns }, { value: 'report', label: 'Completion report' }]} />
      {tab === 'tasks' && <TasksTab key={params.get('status') || 'all'} initialStatus={params.get('status')} initialTask={params.get('task')} />}
      {tab === 'schedules' && <SchedulesTab />}
      {tab === 'breakdowns' && <BreakdownsTab />}
      {tab === 'report' && <ReportTab />}
      <ScheduleModal open={modal === 'schedule'} onClose={() => setModal(null)} />
      <ReportBreakdownModal open={modal === 'breakdown'} onClose={() => setModal(null)} />
    </div>
  );
}
