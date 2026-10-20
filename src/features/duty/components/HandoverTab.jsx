import { useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, ClipboardCheck, KeyRound, Plus, Repeat, X } from 'lucide-react';
import { Badge, Button, Card, Checkbox, EmptyState, Input, Modal, Pagination, Select, Spinner, StatusBadge, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { dateTime, label } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import { useT } from '../../../context/LanguageContext';
import { KEY_STATUSES, SHIFTS, useAcknowledgeHandover, useCreateHandover, useDutyGuards, useHandovers } from '../api';

const KEY_TONES = { with_guard: 'green', issued: 'blue', missing: 'red' };

// Guess the shift being handed over from the clock so most guards never touch the select.
function currentShift() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

function HandoverForm({ onClose }) {
  const { user } = useAuth();
  const { t } = useT();
  const { data: guards = [] } = useDutyGuards();
  const { values, bind, applyServerErrors } = useForm({ shift: currentShift(), gate: 'Main gate', toGuard: '', notes: '', incidents: '' });
  const [keys, setKeys] = useState([]);
  const [pending, setPending] = useState([]);
  const create = useCreateHandover({ onSuccess: onClose });

  const editKey = (i, k, v) => setKeys((list) => list.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const submit = () => {
    const body = {
      shift: values.shift,
      gate: values.gate || undefined,
      toGuard: values.toGuard || undefined,
      notes: values.notes || undefined,
      incidents: values.incidents || undefined,
      keys: keys.filter((k) => k.name.trim()).map((k) => ({ name: k.name.trim(), status: k.status, holder: k.holder?.trim() || undefined })),
      pendingItems: pending.filter((p) => p.text.trim()).map((p) => ({ text: p.text.trim(), done: false })),
    };
    create.mutate(body, { onError: applyServerErrors });
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Hand over shift" description="The incoming guard acknowledges this when they take charge."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Hand over</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Shift" options={SHIFTS.map((s) => ({ value: s, label: label(s) }))} {...bind('shift')} />
        <Input label="Gate / post" {...bind('gate')} />
        <Select className="sm:col-span-2" label="Handing over to" placeholder="Any incoming guard" options={guards.filter((g) => g._id !== user._id).map((g) => ({ value: g._id, label: g.name }))} {...bind('toGuard')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={3} placeholder="Anything the next guard should know" {...bind('notes')} />
        <Textarea className="sm:col-span-2" label="Incidents during shift" rows={2} {...bind('incidents')} />

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{t('Keys')}</p>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setKeys((k) => [...k, { name: '', status: 'with_guard', holder: '' }])}>Add key</Button>
          </div>
          {keys.map((k, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <Input aria-label="Key name" placeholder="Key name" value={k.name} onChange={(e) => editKey(i, 'name', e.target.value)} />
              <Button variant="ghost" icon={X} className="text-red-600 sm:order-last" onClick={() => setKeys((list) => list.filter((_, j) => j !== i))} aria-label="Remove key" />
              <Select aria-label="Key status" options={KEY_STATUSES.map((s) => ({ value: s, label: label(s) }))} value={k.status} onChange={(e) => editKey(i, 'status', e.target.value)} />
              <Input aria-label="Holder" placeholder={k.status === 'issued' ? 'Issued to' : 'Holder (optional)'} value={k.holder} onChange={(e) => editKey(i, 'holder', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{t('Pending items')}</p>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPending((p) => [...p, { text: '' }])}>Add item</Button>
          </div>
          {pending.map((p, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="flex gap-2">
              <Input className="flex-1" aria-label="Pending item" placeholder="e.g. Courier for B-402 at the gate" value={p.text} onChange={(e) => setPending((list) => list.map((x, j) => (j === i ? { text: e.target.value } : x)))} />
              <Button variant="ghost" icon={X} className="text-red-600" onClick={() => setPending((list) => list.filter((_, j) => j !== i))} aria-label="Remove item" />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function AcknowledgeModal({ handover, onClose }) {
  const { t } = useT();
  const [note, setNote] = useState('');
  const [items, setItems] = useState(() => handover.pendingItems.map((p) => ({ ...p })));
  const ack = useAcknowledgeHandover({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Acknowledge handover" description={t('{shift} shift from {name}', { shift: t(label(handover.shift)), name: handover.fromGuard?.name || t('guard') })}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" icon={ClipboardCheck} loading={ack.isPending} onClick={() => ack.mutate({ id: handover._id, note: note || undefined, ...(items.length ? { pendingItems: items } : {}) })}>Acknowledge</Button></>}>
      <div className="space-y-4">
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t('Pending items — tick what is already done')}</p>
            {items.map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Checkbox key={i} className="min-h-10 w-full rounded-lg border border-slate-200 px-3" label={p.text} checked={p.done} onChange={(e) => setItems((list) => list.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />
            ))}
          </div>
        )}
        <Textarea label="Note" rows={3} placeholder="e.g. Received all keys, CCTV checked" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

function HandoverCard({ h, canAck, onAck }) {
  const { t } = useT();
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{t('{shift} shift', { shift: t(label(h.shift)) })} · {h.gate}</p>
          <p className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
            {t('From {name}', { name: h.fromGuard?.name || t('Guard') })} <ArrowRight className="size-3.5" /> {t('Handed to: {name}', { name: h.toGuard?.name || t('next guard on shift') })}
            <span className="text-xs">· {dateTime(h.createdAt)}</span>
          </p>
        </div>
        <StatusBadge status={h.status} />
      </div>
      <div className="space-y-3 px-4 py-3 text-sm sm:px-5">
        {h.notes && <p className="whitespace-pre-line text-slate-700">{h.notes}</p>}
        {h.incidents && (
          <div className="rounded-lg bg-amber-50 p-3 text-amber-900">
            <p className="text-xs font-semibold uppercase tracking-wide">{t('Incidents')}</p>
            <p className="whitespace-pre-line">{h.incidents}</p>
          </div>
        )}
        {h.keys?.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><KeyRound className="size-3.5" />{t('Keys')}</p>
            <ul className="flex flex-wrap gap-2">
              {h.keys.map((k, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">
                  <span className="font-medium text-slate-800">{k.name}</span>
                  <Badge tone={KEY_TONES[k.status]}>{t(label(k.status))}</Badge>
                  {k.holder && <span className="text-xs text-slate-500">{k.holder}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {h.pendingItems?.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Pending items')}</p>
            <ul className="space-y-1">
              {h.pendingItems.map((p, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i} className={cn('flex items-start gap-2', p.done && 'text-slate-400 line-through')}>
                  {p.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" />}
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        {h.status === 'acknowledged' ? (
          <p className="rounded-lg bg-sky-50 p-3 text-sky-900">
            {t('Acknowledged by {name} on {date}', { name: h.acknowledgedBy?.name || '—', date: dateTime(h.acknowledgedAt) })}
            {h.ackNote && <span className="mt-1 block text-sm">“{h.ackNote}”</span>}
          </p>
        ) : canAck && (
          <Button variant="success" size="lg" icon={ClipboardCheck} className="w-full sm:w-auto" onClick={() => onAck(h)}>Acknowledge</Button>
        )}
      </div>
    </Card>
  );
}

export function HandoverTab() {
  const { user } = useAuth();
  const isGuard = hasRole(user, ROLES.GUARD);
  const [filters, setFilters] = useState({ status: '', page: 1 });
  const { data, isLoading } = useHandovers({ ...(filters.status ? { status: filters.status } : {}), page: filters.page, limit: 10 });
  const [creating, setCreating] = useState(false);
  const [acking, setAcking] = useState(null);

  // Mirrors the server: the author can't acknowledge, and a guard can't take one addressed to someone else.
  const canAck = (h) => isGuard && h.status === 'open' && h.fromGuard?._id !== user._id && (!h.toGuard || h.toGuard._id === user._id || user.role === ROLES.ADMIN);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select className="sm:w-56" placeholder="All handovers" options={[{ value: 'open', label: 'Waiting for acknowledgement' }, { value: 'acknowledged', label: 'Acknowledged' }]} value={filters.status} onChange={(e) => setFilters({ status: e.target.value, page: 1 })} />
        {isGuard && <Button size="lg" icon={Repeat} onClick={() => setCreating(true)}>Hand over shift</Button>}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.data?.length ? (
        <Card><EmptyState icon={Repeat} title="No handovers yet" description={isGuard ? 'At the end of your shift, hand over keys, notes and pending items here.' : 'Guards record shift handovers here.'} /></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.data.map((h) => <HandoverCard key={h._id} h={h} canAck={canAck(h)} onAck={setAcking} />)}
          </div>
          {data.meta?.pages > 1 && <Card><Pagination meta={data.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} /></Card>}
        </>
      )}
      {creating && <HandoverForm onClose={() => setCreating(false)} />}
      {acking && <AcknowledgeModal handover={acking} onClose={() => setAcking(null)} />}
    </div>
  );
}
