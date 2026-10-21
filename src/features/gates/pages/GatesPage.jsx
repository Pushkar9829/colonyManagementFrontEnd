import { useState } from 'react';
import { ArrowDown, ArrowUp, DoorOpen, Footprints, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, FilterBar, Input, Modal, Table, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { useCreateGate, useGates, useRemoveGate, useReorderGates, useUpdateGate } from '../api';
import { describeGate, KINDS } from '../gateRules';
import { useT } from '../../../context/LanguageContext';

const BLANK = { name: '', code: '', allowVisitors: true, allowVehicles: true, allowStaff: true, allowDeliveries: true, isPedestrianOnly: false, notes: '' };

function GateModal({ gate, onClose }) {
  const { t } = useT();
  const { values, set, bind, errors, applyServerErrors } = useForm(gate ? { ...BLANK, ...gate, notes: gate.notes || '' } : BLANK);
  const create = useCreateGate({ onSuccess: onClose });
  const update = useUpdateGate({ onSuccess: onClose });
  const none = !KINDS.some((k) => values[k.flag]);
  const submit = (e) => {
    e?.preventDefault();
    const body = {
      name: values.name,
      code: values.code?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      isPedestrianOnly: values.isPedestrianOnly,
      ...Object.fromEntries(KINDS.map((k) => [k.flag, values[k.flag]])),
    };
    if (gate) update.mutate({ id: gate._id, ...body }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={gate ? t('Edit {name}', { name: gate.name }) : 'Add a gate'}
      description="Guards choose their gate in the gate console; what the gate takes decides what can be logged there."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending || update.isPending} disabled={!values.name.trim() || none} onClick={submit}>Save</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Input className="col-span-2" label="Name" required placeholder="Service gate" {...bind('name')} />
          <Input label="Code" placeholder="SVC" maxLength={8} hint="Short label" {...bind('code')} onChange={(e) => set('code', e.target.value.toUpperCase())} />
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">{t('This gate takes')}</legend>
          {KINDS.map((k) => (
            <Checkbox key={k.flag} className="flex" label={k.label} checked={values[k.flag]} onChange={(e) => set(k.flag, e.target.checked)} />
          ))}
          <Checkbox className="flex" label="People on foot only (no vehicles)" checked={values.isPedestrianOnly} onChange={(e) => set('isPedestrianOnly', e.target.checked)} />
          {(none || errors.allowVisitors) && <p className="text-xs text-red-600">{errors.allowVisitors || t('Tick at least one')}</p>}
        </fieldset>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium">{values.name.trim() || t('This gate')}</span> — {describeGate(values, t).replace(/^./, (c) => c.toLowerCase())}
        </p>
        <Textarea label="Notes" rows={2} placeholder="Opening hours, location…" {...bind('notes')} />
      </form>
    </Modal>
  );
}

// One tap to switch what a gate takes, right in the list.
function KindToggles({ gate, onToggle, busy }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap gap-1.5">
      {KINDS.map((k) => {
        const on = gate[k.flag] && !(k.flag === 'allowVehicles' && gate.isPedestrianOnly);
        return (
          <button
            key={k.flag}
            type="button"
            disabled={busy || !gate.active}
            aria-pressed={on}
            title={on ? t('Stop taking {kind} at {gate}', { kind: t(k.word), gate: gate.name }) : t('Start taking {kind} at {gate}', { kind: t(k.word), gate: gate.name })}
            onClick={() => onToggle(gate, k.flag)}
            className={cn('rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition disabled:opacity-60', on ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-50 text-slate-400 line-through ring-slate-300')}
          >
            {t(k.label)}
          </button>
        );
      })}
      {gate.isPedestrianOnly && <Badge tone="blue"><Footprints className="mr-1 size-3" />{t('On foot')}</Badge>}
    </div>
  );
}

export default function GatesPage() {
  const { t } = useT();
  const [showClosed, setShowClosed] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | gate
  const { data = [], isLoading } = useGates({ includeInactive: true });
  const update = useUpdateGate({ success: false });
  const reorder = useReorderGates();
  const remove = useRemoveGate();
  const rows = data.filter((g) => showClosed || g.active);
  const openCount = data.filter((g) => g.active).length;

  const move = (gate, dir) => {
    const ids = data.map((g) => g._id);
    const i = ids.indexOf(gate._id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(ids);
  };
  const toggle = (gate, flag) => {
    const next = { ...gate, [flag]: !gate[flag] };
    if (!KINDS.some((k) => next[k.flag])) return;
    update.mutate({ id: gate._id, [flag]: next[flag] });
  };
  const close = (gate) => {
    if (window.confirm(t('Close {name}? Guards can no longer pick it. A gate with history is kept (closed) so old records still show it.', { name: gate.name }))) remove.mutate(gate._id);
  };

  return (
    <div>
      <PageHeader
        title="Gates"
        description="The society's entrances and what each one takes. Guards pick their gate in the gate console."
        actions={<Button icon={Plus} onClick={() => setEditing('new')}>Add gate</Button>}
      />
      <Card>
        <FilterBar cols={2}>
          <Checkbox label="Show closed gates" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
        </FilterBar>
        <Table
          loading={isLoading}
          rows={rows}
          empty="No gates"
          emptyAction={<Button icon={Plus} onClick={() => setEditing('new')}>Add gate</Button>}
          columns={[
            {
              key: 'name',
              header: 'Gate',
              wrap: true,
              render: (g) => (
                <div className="flex items-start gap-2">
                  <DoorOpen className={cn('mt-0.5 size-4 shrink-0', g.active ? 'text-brand-600' : 'text-slate-300')} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {g.name} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-normal text-slate-600">{g.code}</span>
                    </p>
                    <p className="text-xs text-slate-500">{describeGate(g, t)}</p>
                    {g.notes && <p className="text-xs text-slate-400">{g.notes}</p>}
                  </div>
                </div>
              ),
            },
            { key: 'kinds', header: 'Takes', render: (g) => <KindToggles gate={g} onToggle={toggle} busy={update.isPending} /> },
            { key: 'active', header: 'Status', render: (g) => (g.active ? <Badge tone="green">{t('Open')}</Badge> : <Badge>{t('Closed')}</Badge>) },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (g) => {
                const i = data.findIndex((x) => x._id === g._id);
                return (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={ArrowUp} aria-label={t('Move {name} up', { name: g.name })} disabled={i === 0 || reorder.isPending} onClick={() => move(g, -1)} />
                    <Button size="sm" variant="ghost" icon={ArrowDown} aria-label={t('Move {name} down', { name: g.name })} disabled={i === data.length - 1 || reorder.isPending} onClick={() => move(g, 1)} />
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(g)}>Edit</Button>
                    {g.active ? (
                      <Button size="sm" variant="ghost" icon={Trash2} disabled={openCount <= 1} title={openCount <= 1 ? t('The society needs at least one open gate') : undefined} onClick={() => close(g)}>
                        Close
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: g._id, active: true })}>Reopen</Button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
        {!isLoading && data.length === 1 && (
          <EmptyState icon={DoorOpen} title="Only one gate" description="Add your other entrances (club side, service, pedestrian) so guards can log where people come in." />
        )}
      </Card>
      {editing && <GateModal key={editing === 'new' ? 'new' : editing._id} gate={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
