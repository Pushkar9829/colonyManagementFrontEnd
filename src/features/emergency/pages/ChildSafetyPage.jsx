import { useState } from 'react';
import { Baby, BellRing, Hand, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, Checkbox, EmptyState, FileUpload, Field, Input, Modal, Spinner, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { time, timeAgo } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import { useAcknowledgeAlert, useChildAlerts, useChildren, useCreateChild, useRemoveChild, useUpdateChild } from '../api';
import { AlertOutcome, ChildAlertsList, ChildAvatar } from '../components/ChildAlertsList';
import { ChildExitPanel } from '../components/ChildExitPanel';
import { useT } from '../../../context/LanguageContext';

// ---------- resident ----------

function ChildModal({ child, onClose }) {
  const editing = Boolean(child?._id);
  const { t } = useT();
  const { values, bind, set, applyServerErrors } = useForm({
    name: child?.name || '',
    age: child?.age ?? '',
    notes: child?.notes || '',
    alertOnExit: child?.alertOnExit ?? true,
  });
  const [files, setFiles] = useState([]);
  const [removePhoto, setRemovePhoto] = useState(false);
  const create = useCreateChild({ onSuccess: onClose });
  const update = useUpdateChild({ onSuccess: onClose });

  const save = () => {
    // Always send alertOnExit: a missing value would be reset to the schema default.
    const body = {
      name: values.name.trim(),
      age: values.age === '' ? undefined : Number(values.age),
      notes: values.notes.trim(),
      alertOnExit: Boolean(values.alertOnExit),
      photo: files[0]?._id,
    };
    if (editing) update.mutate({ id: child._id, ...body, removePhoto: !files.length && removePhoto ? true : undefined }, { onError: applyServerErrors });
    else create.mutate({ ...body, notes: body.notes || undefined }, { onError: applyServerErrors });
  };

  return (
    <Modal open onClose={onClose} title={editing ? t('Edit {name}', { name: child.name }) : 'Add a child'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required {...bind('name')} />
        <Input label="Age" type="number" min={0} max={18} inputMode="numeric" {...bind('age')} />
        <Textarea className="sm:col-span-2" label="Notes for the guard" rows={2} placeholder="e.g. Allowed to go to tuition in B-block alone" {...bind('notes')} />
        <Field className="sm:col-span-2" label="Photo" hint="A clear face photo helps the guard recognise your child.">
          {editing && child.photoUrl && !files.length && !removePhoto ? (
            <div className="flex items-center gap-3">
              <img src={child.photoUrl} alt={child.name} className="size-16 rounded-lg object-cover" />
              <div className="space-y-1">
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setRemovePhoto(true)}>Remove photo</Button>
                <FileUpload folder="security" max={1} files={files} onChange={setFiles} label="Replace" />
              </div>
            </div>
          ) : (
            <FileUpload folder="security" max={1} files={files} onChange={setFiles} label="Add photo" />
          )}
        </Field>
        <Checkbox className="sm:col-span-2" label="Alert me if my child leaves the gate alone" checked={Boolean(values.alertOnExit)} onChange={(e) => set('alertOnExit', e.target.checked)} />
      </div>
    </Modal>
  );
}

function MyChildren() {
  const { data, isLoading } = useChildren({ limit: 50 });
  const [editing, setEditing] = useState(null);
  const { t } = useT();
  const update = useUpdateChild({ success: (c) => (c.alertOnExit ? t('Guards will alert you when {name} leaves alone', { name: c.name }) : t('Exit alerts off for {name}', { name: c.name })) });
  const remove = useRemoveChild();
  const children = data?.data || [];
  return (
    <Card className="mb-6">
      <CardHeader title="My children" subtitle="Guards see these children and alert you when one leaves the gate alone." action={<Button icon={Plus} className="w-full sm:w-auto" onClick={() => setEditing({})}>Add child</Button>} />
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !children.length ? (
        <EmptyState icon={Baby} title="No children added" description="Add your child so the gate can alert you if they walk out alone." action={<Button icon={Plus} onClick={() => setEditing({})}>Add child</Button>} />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <div key={c._id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <ChildAvatar child={c} className="size-14" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  {c.age != null && <p className="text-sm text-slate-500">{t('{age} yrs', { age: c.age })}</p>}
                  {c.notes && <p className="mt-1 text-xs text-slate-500">{c.notes}</p>}
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-sm text-slate-700">{t('Alert me if my child leaves the gate alone')}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={Boolean(c.alertOnExit)}
                  disabled={update.isPending && update.variables?.id === c._id}
                  onChange={(e) => update.mutate({ id: c._id, alertOnExit: e.target.checked })}
                />
                <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500', c.alertOnExit ? 'bg-brand-600' : 'bg-slate-300')}>
                  <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', c.alertOnExit ? 'left-5.5' : 'left-0.5')} />
                </span>
              </label>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button size="sm" variant="ghost" icon={Trash2} className="text-slate-500 hover:bg-red-50 hover:text-red-600" loading={remove.isPending && remove.variables === c._id}
                  onClick={() => window.confirm(t('Remove {name}? Guards will no longer see this child.', { name: c.name })) && remove.mutate(c._id)}>
                  Delete
                </Button>
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(c)}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ChildModal key={editing._id || 'new'} child={editing._id ? editing : null} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function OpenAlert({ a }) {
  const [note, setNote] = useState('');
  const ack = useAcknowledgeAlert();
  const { t } = useT();
  const answer = (response) => ack.mutate({ id: a._id, response, note: note.trim() || undefined });
  return (
    <Card className="overflow-hidden border-2 border-red-500">
      <div className="flex items-center gap-2 bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white">
        <BellRing className="size-4 animate-pulse" />
        {t('Your child is at the gate')}
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <ChildAvatar child={a.child} className="size-16" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900">{t('{name} is leaving through {gate}', { name: a.child?.name, gate: a.gate })}</p>
            <p className="text-sm text-slate-500">
              {time(a.createdAt)} ({timeAgo(a.createdAt)}){a.raisedBy?.name ? ` · ${t('reported by {name}', { name: a.raisedBy.name })}` : ''}
            </p>
            {a.note && <p className="mt-1 text-sm text-slate-700">{t('Guard: “{note}”', { note: a.note })}</p>}
          </div>
        </div>
        <Input placeholder="Optional message for the guard" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={ack.isPending} onClick={() => answer('ok')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
            <ShieldCheck className="size-5" />
            {t('OK, let them go')}
          </button>
          <button type="button" disabled={ack.isPending} onClick={() => answer('stop')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-base font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">
            <Hand className="size-5" />
            {t('STOP — hold my child')}
          </button>
        </div>
      </div>
    </Card>
  );
}

// Open alerts go on top (they need an answer now); the children cards sit between them and the history.
function ResidentView() {
  const live = useLiveInterval(5000);
  const { data, isLoading } = useChildAlerts({ limit: 20 }, { refetchInterval: live });
  const alerts = data?.data || [];
  const open = alerts.filter((a) => a.status === 'open');
  const past = alerts.filter((a) => a.status !== 'open');
  const { t } = useT();
  return (
    <div>
      <PageHeader title="Child safety" description="Get an alert when your child walks out of the gate alone, and tell the guard what to do." />
      {open.length > 0 && <div className="mb-6 space-y-4">{open.map((a) => <OpenAlert key={a._id} a={a} />)}</div>}
      <MyChildren />
      <Card>
        <CardHeader title="Alerts" />
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !past.length ? (
          <EmptyState icon={BellRing} title={open.length ? 'No earlier alerts' : 'No alerts yet'} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {past.map((a) => (
              <li key={a._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <ChildAvatar child={a.child} className="size-10" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{a.child?.name} · {a.gate}</p>
                    <p className="text-xs text-slate-500">
                      {time(a.createdAt)} ({timeAgo(a.createdAt)})
                      {a.acknowledgedBy?.name ? ` · ${t('answered by {name}', { name: a.acknowledgedBy.name })}` : ''}
                      {a.ackNote ? ` · “${a.ackNote}”` : ''}
                    </p>
                  </div>
                </div>
                <AlertOutcome a={a} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function ChildSafetyPage() {
  const { user } = useAuth();
  if (user.role === ROLES.RESIDENT) return <ResidentView />;
  if (hasRole(user, ROLES.GUARD)) {
    return (
      <div>
        <PageHeader title="Child safety" description="Tap “Child exiting” when a registered child leaves alone. The parents answer in seconds." />
        <div className="space-y-6">
          <ChildExitPanel />
          <ChildAlertsList />
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Child safety" description="Child exit alerts raised at the gate and how parents responded." />
      <ChildAlertsList title="Child exit alerts" limit={50} />
    </div>
  );
}
