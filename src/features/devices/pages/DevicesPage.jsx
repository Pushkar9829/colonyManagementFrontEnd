import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, Input, Modal, Select, Table } from '../../../components/ui';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { useToast } from '../../../context/ToastContext';
import { label, timeAgo } from '../../../lib/format';
import { useGates } from '../../gates/api';
import { useT } from '../../../context/LanguageContext';

const TYPES = ['anpr', 'rfid', 'barrier', 'meter', 'biometric', 'other'];
const TYPE_LABELS = { anpr: 'Number-plate camera (ANPR)', rfid: 'RFID / tag reader', barrier: 'Boom barrier', meter: 'Water / electricity meter', biometric: 'Biometric / face device', other: 'Other' };
const SCOPES = [
  { value: 'gate:events', label: 'Send gate events (vehicle / tag detected)' },
  { value: 'gate:commands', label: 'Receive gate commands (open barrier)' },
  { value: 'meters:write', label: 'Send meter readings' },
  { value: 'attendance:write', label: 'Send staff attendance punches' },
];
const SCOPE_SHORT = { 'gate:events': 'Gate events', 'gate:commands': 'Opens barrier', 'meters:write': 'Meter readings', 'attendance:write': 'Attendance' };

export default function DevicesPage() {
  const { t } = useT();
  const toast = useToast();
  const { data = [], isLoading } = useQuery({ queryKey: ['devices'], queryFn: () => api.get('/devices') });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'anpr', location: '', scopes: ['gate:events'], gateId: '' });
  const [newKey, setNewKey] = useState(null);
  const { data: gates = [] } = useGates({ includeInactive: true });
  const create = useApiMutation((b) => api.post('/devices', b), { invalidate: ['devices'], onSuccess: (d) => { setOpen(false); setNewKey(d); } });
  const toggle = useApiMutation(({ id, active }) => api.patch(`/devices/${id}`, { active }), { invalidate: ['devices'], success: 'Updated' });
  // A device's events and barrier commands belong to its gate.
  const setGate = useApiMutation(({ id, gateId }) => api.patch(`/devices/${id}`, { gateId: gateId || null }), { invalidate: ['devices'], success: (d) => (d.gate ? t('{device} is at {gate}', { device: d.name, gate: d.gate.name }) : t('{device} is not linked to a gate', { device: d.name })) });
  const gateOptions = gates.map((g) => ({ value: g._id, label: g.active ? g.name : t('{name} (closed)', { name: g.name }) }));
  const gateDevice = (type, scopes) => ['anpr', 'rfid', 'barrier'].includes(type) || scopes.some((s) => s.startsWith('gate:'));
  const revoke = useApiMutation((id) => api.del(`/devices/${id}`), { invalidate: ['devices'], success: 'Key revoked' });
  const setScope = (s) => setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));

  return (
    <div>
      <PageHeader title="Devices & API keys" description="Connect gate cameras, RFID readers, boom barriers and meters." actions={<Button icon={Plus} onClick={() => setOpen(true)}>Add device</Button>} />
      <Card>
        <Table loading={isLoading} rows={data} empty="No devices yet" emptyHint="No devices yet. Add one, then give its key to your installer." emptyAction={<Button icon={Plus} onClick={() => setOpen(true)}>Add device</Button>}
          columns={[
            { key: 'name', header: 'Device', render: (d) => <div><p className="font-medium text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{t(TYPE_LABELS[d.type] || d.type)}{d.location ? ` · ${d.location}` : ''}</p></div> },
            {
              key: 'gate',
              header: 'Gate',
              render: (d) =>
                gateDevice(d.type, d.scopes) ? (
                  <Select
                    aria-label={t('Gate for {name}', { name: d.name })}
                    className="min-w-40"
                    placeholder="Not linked"
                    value={d.gate?._id || ''}
                    disabled={setGate.isPending}
                    onChange={(e) => setGate.mutate({ id: d._id, gateId: e.target.value })}
                    options={gateOptions}
                  />
                ) : (
                  '—'
                ),
            },
            { key: 'prefix', header: 'Key', render: (d) => <span className="font-mono text-xs">{d.prefix}…</span> },
            { key: 'scopes', header: 'Permissions', render: (d) => <div className="flex flex-wrap gap-1">{d.scopes.map((s) => <Badge key={s}>{t(SCOPE_SHORT[s] || s)}</Badge>)}</div> },
            { key: 'lastUsedAt', header: 'Last used', render: (d) => (d.lastUsedAt ? timeAgo(d.lastUsedAt) : t('Never')) },
            { key: 'active', header: 'Status', render: (d) => (d.active ? <Badge tone="green">{t('Active')}</Badge> : <Badge>{t('Disabled')}</Badge>) },
            {
              key: 'a', header: '', className: 'text-right', render: (d) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: d._id, active: !d.active })}>{d.active ? t('Disable') : t('Enable')}</Button>
                  <button type="button" onClick={() => window.confirm(t('Revoke the key for {name}? The device stops working immediately.', { name: d.name })) && revoke.mutate(d._id)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label={t('Revoke key for {name}', { name: d.name })} title={t('Revoke key')}><Trash2 className="size-4" /></button>
                </div>
              ),
            },
          ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add device"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!form.name || !form.scopes.length} loading={create.isPending} onClick={() => create.mutate({ ...form, location: form.location || undefined, gateId: gateDevice(form.type, form.scopes) && form.gateId ? form.gateId : undefined })}>Create key</Button></>}>
        <div className="space-y-4">
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{t('Each device gets its own secret key. After you create it, give the key to your installer — they set the device to send it in the {header} header with every request.').split('{header}').map((part, i) => (i ? <span key={i}><code>X-Device-Key</code>{part}</span> : part))}</p>
          <Input label="Name" placeholder="Main gate ANPR camera" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPES.map((v) => ({ value: v, label: TYPE_LABELS[v] }))} />
          {gateDevice(form.type, form.scopes) && (
            <Select label="Gate" placeholder="Not linked to a gate" value={form.gateId} onChange={(e) => setForm({ ...form, gateId: e.target.value })} options={gateOptions}
              hint="Plate reads and tag reads are logged at this gate; a barrier opens when a guard at this gate presses Open." />
          )}
          <Input label="Location" placeholder="Gate 1, Tower B basement…" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t('Permissions')}</p>
            {SCOPES.map((s) => <Checkbox key={s.value} label={s.label} checked={form.scopes.includes(s.value)} onChange={() => setScope(s.value)} className="flex" />)}
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(newKey)} onClose={() => setNewKey(null)} title="Device key created" description="Copy it now — it will not be shown again." footer={<Button onClick={() => setNewKey(null)}>I've saved it</Button>}>
        {newKey && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-300">
              <KeyRound className="size-4 shrink-0" />
              <span className="break-all">{newKey.key}</span>
            </div>
            <Button size="sm" variant="secondary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(newKey.key); toast.success(t('Key copied')); }}>Copy key</Button>
            <p className="text-xs text-slate-500">{t('Configure the device to send {header} with each request to the API ({type}).', { type: t(label(newKey.type)) }).split('{header}').map((part, i) => (i ? <span key={i}><code>X-Device-Key: {newKey.prefix}…</code>{part}</span> : part))}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
