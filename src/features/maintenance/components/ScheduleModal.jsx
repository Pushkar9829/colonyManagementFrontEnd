import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { todayISO } from '../../../lib/format';
import { useAssets } from '../../assets/api';
import { ASSIGNEE_ROLES, clean, numOrUndef, usePeople } from '../../assets/shared';
import { useCreateSchedule, useUpdateSchedule } from '../api';
import { CHECK_TYPES, FREQUENCIES } from '../constants';

const newItem = () => ({ key: Math.random().toString(36).slice(2), label: '', type: 'yes_no', unit: '', min: '', max: '', required: true });

// Create or edit a PPM schedule with its checklist. `assetId` pre-selects the asset.
export function ScheduleModal({ open, onClose, schedule, assetId }) {
  const blank = { asset: assetId || '', title: '', description: '', frequency: 'monthly', intervalDays: '', startDate: todayISO(), endDate: '', assigneeRole: 'staff', assignee: '', leadDays: '7', graceDays: '3', active: true };
  const { values, bind, set, setValues, applyServerErrors } = useForm(blank);
  const [items, setItems] = useState([newItem()]);
  const { data: assets } = useAssets({ limit: 100 }, open && !assetId && !schedule);
  const { data: people } = usePeople(['staff', 'facility_manager', 'guard'], open);

  useEffect(() => {
    if (!open) return;
    if (schedule) {
      setValues({ ...blank, ...Object.fromEntries(Object.keys(blank).map((k) => [k, schedule[k] ?? blank[k]])), asset: schedule.asset?._id || schedule.asset, assignee: schedule.assignee?._id || '', intervalDays: schedule.intervalDays ?? '', leadDays: String(schedule.leadDays), graceDays: String(schedule.graceDays), endDate: schedule.endDate || '' });
      setItems(schedule.checklist.map((c) => ({ ...c, key: c._id, unit: c.unit ?? '', min: c.min ?? '', max: c.max ?? '' })));
    } else {
      setValues(blank);
      setItems([newItem()]);
    }
  }, [open, schedule]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = { onSuccess: onClose };
  const create = useCreateSchedule(done);
  const update = useUpdateSchedule(done);
  const setItem = (key, patch) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const submit = () => {
    const checklist = items
      .filter((i) => i.label.trim())
      .map((i) => clean({ _id: i._id, label: i.label.trim(), type: i.type, unit: i.type === 'reading' ? i.unit : undefined, min: i.type === 'reading' ? numOrUndef(i.min) : undefined, max: i.type === 'reading' ? numOrUndef(i.max) : undefined, required: i.required }));
    const body = {
      ...clean({ title: values.title, description: values.description, frequency: values.frequency, startDate: values.startDate, assigneeRole: values.assigneeRole }),
      intervalDays: values.frequency === 'every_n_days' ? numOrUndef(values.intervalDays) : undefined,
      leadDays: Number(values.leadDays || 0),
      graceDays: Number(values.graceDays || 0),
      checklist,
    };
    if (schedule) update.mutate({ id: schedule._id, ...body, assignee: values.assignee || null, endDate: values.endDate || null, active: values.active }, { onError: applyServerErrors });
    else create.mutate({ ...body, asset: values.asset, assignee: values.assignee || undefined, endDate: values.endDate || undefined }, { onError: applyServerErrors });
  };

  return (
    <Modal open={open} onClose={onClose} title={schedule ? 'Edit PPM schedule' : 'New PPM schedule'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {!assetId && !schedule && <Select className="sm:col-span-2" label="Asset" required placeholder="Choose asset" options={(assets?.data || []).map((a) => ({ value: a._id, label: `${a.code} · ${a.name}` }))} {...bind('asset')} />}
          <Input className="sm:col-span-2" label="Title" required placeholder="e.g. DG weekly test run" {...bind('title')} />
          <Select label="Frequency" options={FREQUENCIES} {...bind('frequency')} />
          {values.frequency === 'every_n_days' ? <Input label="Every (days)" type="number" min="1" {...bind('intervalDays')} /> : <Input label="First due on" type="date" {...bind('startDate')} />}
          {values.frequency === 'every_n_days' && <Input label="First due on" type="date" {...bind('startDate')} />}
          <Input label="Ends on (optional)" type="date" {...bind('endDate')} />
          <Select label="Who does it" options={ASSIGNEE_ROLES} {...bind('assigneeRole')} />
          <Select label="Specific person (optional)" placeholder="Anyone in that role" options={people || []} {...bind('assignee')} />
          <Input label="Create tasks this many days ahead" type="number" min="0" max="60" {...bind('leadDays')} />
          <Input label="Missed after (days overdue)" type="number" min="0" max="60" {...bind('graceDays')} />
          <Textarea className="sm:col-span-2" label="Instructions" rows={2} {...bind('description')} />
          {schedule && <Checkbox label="Active" checked={values.active} onChange={(e) => set('active', e.target.checked)} />}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Checklist</p>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setItems((l) => [...l, newItem()])}>Add item</Button>
          </div>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.key} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-12">
                <Input className="sm:col-span-5" placeholder="Check item" value={i.label} onChange={(e) => setItem(i.key, { label: e.target.value })} />
                <Select className="sm:col-span-2" options={CHECK_TYPES} value={i.type} onChange={(e) => setItem(i.key, { type: e.target.value })} />
                {i.type === 'reading' ? (
                  <>
                    <Input className="sm:col-span-1" placeholder="Unit" value={i.unit} onChange={(e) => setItem(i.key, { unit: e.target.value })} />
                    <Input className="sm:col-span-1" placeholder="Min" type="number" step="any" value={i.min} onChange={(e) => setItem(i.key, { min: e.target.value })} />
                    <Input className="sm:col-span-1" placeholder="Max" type="number" step="any" value={i.max} onChange={(e) => setItem(i.key, { max: e.target.value })} />
                  </>
                ) : <div className="hidden sm:col-span-3 sm:block" />}
                <div className="flex items-center justify-between gap-2 sm:col-span-2">
                  <Checkbox label="Required" checked={i.required} onChange={(e) => setItem(i.key, { required: e.target.checked })} />
                  <button type="button" className="rounded p-1 text-slate-400 hover:text-red-600" aria-label="Remove item" onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))}><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
