import { useEffect, useState } from 'react';
import { Attachments, Badge, Button, FileUpload, Input, Modal, Select, Spinner, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime, label, money, toPaise } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useAssets } from '../../assets/api';
import { clean, usePeople } from '../../assets/shared';
import { useCreateWorkOrder, useWorkOrder, useWorkOrderStatus } from '../api';
import { PRIORITIES, WO_TONES } from '../constants';
import { useT } from '../../../context/LanguageContext';

// preset: { asset, breakdown, ppmTask, title } when raised from another screen.
export function CreateWorkOrderModal({ open, onClose, preset }) {
  const empty = { title: '', scope: '', asset: '', location: '', vendorName: '', vendor: '', technician: '', priority: 'medium', estimate: '', dueDate: '' };
  const { values, bind, setValues, applyServerErrors, errors } = useForm(empty);
  const [files, setFiles] = useState([]);
  const { data: assets } = useAssets({ limit: 100 }, open && !preset?.asset);
  const { data: people } = usePeople(['staff', 'facility_manager'], open);
  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setValues({ ...empty, title: preset?.title || '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = useCreateWorkOrder({ onSuccess: onClose });

  const submit = () =>
    create.mutate(
      clean({
        ...values,
        asset: preset?.asset || values.asset,
        breakdown: preset?.breakdown,
        ppmTask: preset?.ppmTask,
        estimate: values.estimate ? toPaise(values.estimate) : 0,
        attachments: files.length ? files.map((f) => f._id) : undefined,
      }),
      { onError: applyServerErrors },
    );

  return (
    <Modal open={open} onClose={onClose} title="New work order" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Create</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" required {...bind('title')} />
        <Textarea className="sm:col-span-2" label="Scope of work" rows={3} {...bind('scope')} />
        {!preset?.asset && <Select label="Asset (optional)" placeholder="No asset" options={(assets?.data || []).map((a) => ({ value: a._id, label: `${a.code} · ${a.name}` }))} {...bind('asset')} />}
        <Input label="Location" {...bind('location')} />
        <Input label="Vendor name" hint="Outside contractor doing the job" error={errors.vendorName} {...bind('vendorName')} />
        <Select label="In-house technician" placeholder="None" options={people || []} {...bind('technician')} />
        <Select label="Priority" options={PRIORITIES} {...bind('priority')} />
        <Input label="Estimate (₹)" type="number" min="0" step="0.01" {...bind('estimate')} />
        <Input label="Due by" type="date" {...bind('dueDate')} />
        <FileUpload className="sm:col-span-2" folder="facility" files={files} onChange={setFiles} label="Attach quote / photos" />
      </div>
    </Modal>
  );
}

export function WorkOrderDetailModal({ id, open, onClose }) {
  const { user } = useAuth();
  const manager = isManager(user);
  const { t } = useT();
  const { data: w, isLoading } = useWorkOrder(open ? id : null);
  const [note, setNote] = useState('');
  const [cost, setCost] = useState('');
  const [files, setFiles] = useState([]);
  const change = useWorkOrderStatus({ onSuccess: () => { setNote(''); setCost(''); setFiles([]); } });
  const go = (status) => change.mutate({ id: w._id, status, note: note || undefined, actualCost: cost ? toPaise(cost) : undefined, attachments: status === 'completed' ? files.map((f) => f._id) : undefined });

  return (
    <Modal open={open} onClose={onClose} title={w ? `${w.number} · ${w.title}` : 'Work order'} size="lg" footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {isLoading || !w ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={WO_TONES[w.status]}>{t(label(w.status))}</Badge>
            <Badge>{t(label(w.priority))}</Badge>
            <span className="text-slate-500">{t(label(w.source))}{w.asset ? ` · ${w.asset.name} (${w.asset.code})` : ''}</span>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div><dt className="text-xs text-slate-500">{t('Vendor')}</dt><dd className="font-medium">{w.vendorName || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">{t('Technician')}</dt><dd className="font-medium">{w.technician?.name || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">{t('Due')}</dt><dd className="font-medium">{w.dueDate ? date(w.dueDate) : '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">{t('Estimate')}</dt><dd className="font-medium">{money(w.estimate)}</dd></div>
            <div><dt className="text-xs text-slate-500">{t('Actual')}</dt><dd className="font-medium">{w.actualCost !== undefined && w.actualCost !== null ? money(w.actualCost) : '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">{t('Location')}</dt><dd className="font-medium">{w.location || '—'}</dd></div>
          </dl>
          {w.scope && <p className="whitespace-pre-line text-slate-700">{w.scope}</p>}
          <Attachments items={w.attachments} />
          {w.completion?.completedAt && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-800">{t('Completion · {time}', { time: dateTime(w.completion.completedAt) })}</p>
              {w.completion.notes && <p className="text-slate-600">{w.completion.notes}</p>}
              <div className="mt-2"><Attachments items={w.completion.attachments} /></div>
            </div>
          )}
          {['open', 'in_progress', 'completed'].includes(w.status) && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <Textarea label={w.status === 'completed' ? 'Verification note' : 'Notes'} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              {(w.status !== 'completed' || manager) && <Input label="Actual cost (₹)" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />}
              {w.status !== 'completed' && <FileUpload folder="facility" files={files} onChange={setFiles} camera label="Completion proof" />}
              <div className="flex flex-wrap gap-2">
                {w.status === 'open' && <Button variant="secondary" loading={change.isPending} onClick={() => go('in_progress')}>Start</Button>}
                {w.status !== 'completed' && <Button variant="success" loading={change.isPending} onClick={() => go('completed')}>Mark completed</Button>}
                {manager && w.status === 'completed' && <Button variant="success" loading={change.isPending} onClick={() => go('verified')}>Verify</Button>}
                {manager && w.status === 'completed' && <Button variant="secondary" loading={change.isPending} onClick={() => go('in_progress')}>Send back</Button>}
                {manager && w.status !== 'completed' && <Button variant="ghost" loading={change.isPending} onClick={() => go('cancelled')}>Cancel order</Button>}
              </div>
            </div>
          )}
          {w.history?.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-500">
              {w.history.map((h, i) => <li key={i}>{dateTime(h.createdAt)} · {h.by?.name || t('System')}: {h.from ? `${t(label(h.from))} → ` : ''}{t(label(h.to))}{h.note ? ` — ${h.note}` : ''}</li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
