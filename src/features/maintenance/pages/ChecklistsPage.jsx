import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, Input, Modal, Pagination, Select, Table, Tabs } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { dateTime, label, time, todayISO } from '../../../lib/format';
import { ASSIGNEE_ROLES, addDays, usePeople } from '../../assets/shared';
import { useChecklists, useCreateChecklist, useRunReport, useRuns, useUpdateChecklist } from '../api';
import { RunModal } from '../components/RunModal';
import { AREAS, RUN_TONES, WEEKDAYS } from '../constants';
import { useT } from '../../../context/LanguageContext';

function ChecklistModal({ open, onClose, checklist }) {
  const { t } = useT();
  const blank = { name: '', area: 'lobby', location: '', assigneeRole: 'staff', assignee: '', requirePhoto: true, graceMinutes: '120', active: true };
  const { values, bind, set, setValues, applyServerErrors } = useForm(blank);
  const [items, setItems] = useState([{ label: '' }]);
  const [slots, setSlots] = useState([{ label: 'Morning', dueBy: '10:00' }]);
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const { data: people } = usePeople(['staff', 'guard'], open);
  useEffect(() => {
    if (!open) return;
    if (checklist) {
      setValues({ ...blank, ...checklist, assignee: checklist.assignee?._id || '', graceMinutes: String(checklist.graceMinutes) });
      setItems(checklist.items.map((i) => ({ _id: i._id, label: i.label })));
      setSlots(checklist.slots);
      setDays(checklist.days);
    } else {
      setValues(blank);
      setItems([{ label: '' }]);
      setSlots([{ label: 'Morning', dueBy: '10:00' }]);
      setDays([0, 1, 2, 3, 4, 5, 6]);
    }
  }, [open, checklist]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = useCreateChecklist({ onSuccess: onClose });
  const update = useUpdateChecklist({ onSuccess: onClose });
  const submit = () => {
    const body = {
      name: values.name,
      area: values.area,
      location: values.location || undefined,
      assigneeRole: values.assigneeRole,
      requirePhoto: values.requirePhoto,
      graceMinutes: Number(values.graceMinutes || 0),
      items: items.filter((i) => i.label.trim()),
      slots: slots.filter((s) => s.label.trim() && s.dueBy),
      days,
    };
    if (checklist) update.mutate({ id: checklist._id, ...body, assignee: values.assignee || null, active: values.active }, { onError: applyServerErrors });
    else create.mutate({ ...body, assignee: values.assignee || undefined }, { onError: applyServerErrors });
  };
  return (
    <Modal open={open} onClose={onClose} title={checklist ? 'Edit checklist' : 'New area checklist'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" required placeholder="e.g. Lobby cleaning" {...bind('name')} />
          <Select label="Area" options={AREAS} {...bind('area')} />
          <Input label="Location" placeholder="Tower A" {...bind('location')} />
          <Select label="Done by" options={ASSIGNEE_ROLES.filter((r) => r.value !== 'facility_manager')} {...bind('assigneeRole')} />
          <Select label="Specific person" placeholder="Anyone in that role" options={people || []} {...bind('assignee')} />
          <Input label="Missed after (minutes past due)" type="number" min="0" {...bind('graceMinutes')} />
          <Checkbox label="Photo proof required" checked={values.requirePhoto} onChange={(e) => set('requirePhoto', e.target.checked)} />
          {checklist && <Checkbox label="Active" checked={values.active} onChange={(e) => set('active', e.target.checked)} />}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">{t('Days')}</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i].sort()))}
                className={`rounded-full px-3 py-1 text-xs font-medium ${days.includes(i) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t(d)}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{t('Shift slots')}</p><Button size="sm" variant="secondary" icon={Plus} onClick={() => setSlots((s) => [...s, { label: '', dueBy: '18:00' }])}>Add slot</Button></div>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" placeholder="Slot (Morning)" value={s.label} onChange={(e) => setSlots((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <Input className="w-32" type="time" value={s.dueBy} onChange={(e) => setSlots((x) => x.map((y, j) => (j === i ? { ...y, dueBy: e.target.value } : y)))} />
                <button type="button" aria-label={t('Remove slot')} className="p-2 text-slate-400 hover:text-red-600" onClick={() => setSlots((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{t('Items')}</p><Button size="sm" variant="secondary" icon={Plus} onClick={() => setItems((x) => [...x, { label: '' }])}>Add item</Button></div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it._id || i} className="flex gap-2">
                <Input className="flex-1" placeholder="e.g. Floor mopped" value={it.label} onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <button type="button" aria-label={t('Remove item')} className="p-2 text-slate-400 hover:text-red-600" onClick={() => setItems((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RunsTab({ initialStatus }) {
  const { t } = useT();
  const [f, setF] = useState({ date: todayISO(), status: initialStatus || '', page: 1 });
  const { data, isLoading } = useRuns(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const [run, setRun] = useState(null);
  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Input title={t('Date')} type="date" value={f.date} onChange={(e) => setF((x) => ({ ...x, date: e.target.value, page: 1 }))} />
        <Select placeholder="All statuses" options={Object.keys(RUN_TONES).map((v) => ({ value: v, label: label(v) }))} value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value, page: 1 }))} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="Nothing scheduled" onRowClick={setRun}
        columns={[
          { key: 'name', header: 'Checklist', render: (r) => <div><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{t(label(r.area))} · {r.slot}</p></div> },
          { key: 'dueAt', header: 'Due', render: (r) => time(r.dueAt) },
          { key: 'who', header: 'Assigned', render: (r) => r.assignee?.name || t('Any {role}', { role: t(label(r.assigneeRole)) }) },
          { key: 'progress', header: 'Items', render: (r) => `${r.items.filter((i) => i.done).length}/${r.items.length}` },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={RUN_TONES[r.status]}>{t(label(r.status))}</Badge> },
          { key: 'completedAt', header: 'Done', render: (r) => (r.completedAt ? `${dateTime(r.completedAt)} · ${r.completedBy?.name || ''}` : '—') },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      <RunModal run={run} onClose={() => setRun(null)} />
    </Card>
  );
}

function TemplatesTab() {
  const { t } = useT();
  const { data, isLoading } = useChecklists();
  const [edit, setEdit] = useState(null);
  return (
    <Card>
      <Table loading={isLoading} rows={data} empty="No checklists yet" onRowClick={setEdit}
        columns={[
          { key: 'name', header: 'Checklist', render: (c) => <div><p className="font-medium text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{t(label(c.area))}{c.location ? ` · ${c.location}` : ''}</p></div> },
          { key: 'slots', header: 'Slots', render: (c) => c.slots.map((s) => `${s.label} ${s.dueBy}`).join(', ') },
          { key: 'days', header: 'Days', render: (c) => (c.days.length === 7 ? t('Every day') : c.days.map((d) => t(WEEKDAYS[d])).join(' ')) },
          { key: 'items', header: 'Items', render: (c) => c.items.length },
          { key: 'who', header: 'Done by', render: (c) => c.assignee?.name || t('Any {role}', { role: t(label(c.assigneeRole)) }) },
          { key: 'active', header: '', render: (c) => (c.active ? <Badge tone="green">{t('Active')}</Badge> : <Badge>{t('Paused')}</Badge>) },
        ]} />
      <ChecklistModal open={Boolean(edit)} checklist={edit} onClose={() => setEdit(null)} />
    </Card>
  );
}

function ReportTab() {
  const { t } = useT();
  const [range, setRange] = useState({ from: addDays(todayISO(), -6), to: todayISO() });
  const { data, isLoading } = useRunReport(range);
  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </div>
      <Table loading={isLoading} rows={data?.rows} rowKey="checklist" empty="No checklists were due"
        columns={[
          { key: 'name', header: 'Checklist', render: (r) => <div><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{t(label(r.area))}</p></div> },
          { key: 'total', header: 'Scheduled' },
          { key: 'completed', header: 'Done' },
          { key: 'verified', header: 'Verified' },
          { key: 'missed', header: 'Missed', render: (r) => (r.missed ? <span className="font-semibold text-red-600" title={r.missedSlots.map((m) => `${m.date} ${m.slot}`).join('\n')}>{r.missed}</span> : 0) },
          { key: 'completionRate', header: 'Rate', render: (r) => (r.completionRate === null ? '—' : <Badge tone={r.completionRate >= 90 ? 'green' : r.completionRate >= 70 ? 'amber' : 'red'}>{r.completionRate}%</Badge>) },
        ]} />
    </Card>
  );
}

export default function ChecklistsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'runs';
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <PageHeader title="Housekeeping checklists" description="Area checklists by shift, done with photo proof and checked by a supervisor." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New checklist</Button>} />
      <Tabs className="mb-4" value={tab} onChange={(v) => setParams({ tab: v })} tabs={[{ value: 'runs', label: 'Daily sheet' }, { value: 'templates', label: 'Checklists' }, { value: 'report', label: 'Missed report' }]} />
      {tab === 'runs' && <RunsTab initialStatus={params.get('status')} />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'report' && <ReportTab />}
      <ChecklistModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
