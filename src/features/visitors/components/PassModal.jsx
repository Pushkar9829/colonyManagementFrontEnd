import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Input, Modal, Select, Tabs } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { dateTime } from '../../../lib/format';
import { useCreatePass } from '../api';
import { QrImage, qrDataUrl } from './QrImage';
import { GateMultiSelect } from '../../gates/components/GateMultiSelect';

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toLocalInput = (d) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export const passWindow = (p) => (p.kind === 'recurring' && p.recurrence ? `${p.recurrence.days.map((d) => DAY_NAMES[d]).join(', ')} · ${p.recurrence.startTime}–${p.recurrence.endTime}` : null);

// QR + code + share buttons for a pass. The QR carries a signed token the guard scans.
export function PassCard({ pass }) {
  const win = passWindow(pass);
  const share = `You're invited! Show this code at the gate: ${pass.code}.${win ? ` Valid ${win}` : ''} Until ${dateTime(pass.validTo)}.`;
  const download = async () => {
    const a = document.createElement('a');
    a.href = await qrDataUrl(pass.qrToken, 600);
    a.download = `pass-${pass.guestName.replace(/\s+/g, '-')}.png`;
    a.click();
  };
  return (
    <div className="text-center">
      <p className="text-sm text-slate-500">Share this with {pass.guestName}</p>
      {pass.qrToken && <QrImage value={pass.qrToken} size={200} className="mx-auto my-3 rounded-lg border border-slate-200 p-2" label={`Pass QR for ${pass.guestName}`} />}
      <p className="font-mono text-3xl font-bold tracking-[0.3em] text-brand-700">{pass.code}</p>
      <p className="mt-2 text-xs text-slate-500">
        {win ? `${win} · ` : ''}
        {dateTime(pass.validFrom)} – {dateTime(pass.validTo)}
        {pass.kind !== 'recurring' ? ` · ${pass.maxUses} entr${pass.maxUses > 1 ? 'ies' : 'y'}` : ''}
      </p>
      {pass.gates?.length > 0 && pass.gates[0]?.name && <p className="mt-1 text-xs font-medium text-slate-600">Only at {pass.gates.map((g) => g.name).join(' or ')}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(share)}>Copy message</Button>
        {pass.qrToken && <Button size="sm" variant="secondary" icon={Download} onClick={download}>Save QR</Button>}
        <a className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

export function PassModal({ open, onClose, initial }) {
  const now = new Date();
  const [created, setCreated] = useState(null);
  const [kind, setKind] = useState('one_time');
  const [days, setDays] = useState([1, 3]);
  const [gates, setGates] = useState([]); // [] = any gate
  const { values, bind, applyServerErrors, reset, errors } = useForm({
    guestName: initial?.name || '',
    phone: initial?.phone || '',
    purpose: initial?.purpose || 'guest',
    validFrom: toLocalInput(now),
    validTo: toLocalInput(new Date(now.getTime() + 6 * 3600000)),
    maxUses: '1',
    startTime: '17:00',
    endTime: '19:00',
    untilDate: toLocalInput(new Date(now.getTime() + 30 * 86400000)).slice(0, 10),
  });
  const create = useCreatePass({ onSuccess: setCreated });

  const close = () => {
    setCreated(null);
    reset();
    setKind('one_time');
    setGates([]);
    onClose();
  };

  const submit = () => {
    const base = { guestName: values.guestName, phone: values.phone || undefined, purpose: values.purpose, gates };
    const body =
      kind === 'recurring'
        ? { ...base, validFrom: new Date().toISOString(), validTo: new Date(`${values.untilDate}T23:59:00`).toISOString(), recurrence: { days, startTime: values.startTime, endTime: values.endTime } }
        : { ...base, validFrom: new Date(values.validFrom).toISOString(), validTo: new Date(values.validTo).toISOString(), maxUses: values.maxUses };
    create.mutate(body, { onError: applyServerErrors });
  };

  if (created) {
    return (
      <Modal open={open} onClose={close} title="Pass created" size="sm" footer={<Button onClick={close}>Done</Button>}>
        <PassCard pass={created} />
      </Modal>
    );
  }

  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  return (
    <Modal open={open} onClose={close} title="Pre-approve a guest" description="The guard scans the QR or types the 6-digit code — no call needed."
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={create.isPending} disabled={kind === 'recurring' && !days.length} onClick={submit}>Create pass</Button></>}>
      <Tabs className="mb-4 w-fit" value={kind} onChange={setKind} tabs={[{ value: 'one_time', label: 'One visit' }, { value: 'recurring', label: 'Recurring (e.g. tutor)' }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Guest name" required {...bind('guestName')} />
        <Input label="Phone" type="tel" {...bind('phone')} />
        <Select label="Purpose" options={[{ value: 'guest', label: 'Guest' }, { value: 'delivery', label: 'Delivery' }, { value: 'cab', label: 'Cab' }, { value: 'service', label: 'Service' }]} {...bind('purpose')} />
        {kind === 'one_time' ? (
          <>
            <Input label="Valid from" type="datetime-local" {...bind('validFrom')} />
            <Input label="Valid until" type="datetime-local" {...bind('validTo')} />
            <Input label="Number of entries" type="number" min={1} max={100} {...bind('maxUses')} />
          </>
        ) : (
          <>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Days</p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((n, d) => (
                  <button key={n} type="button" onClick={() => toggleDay(d)}
                    className={cn('h-9 w-12 rounded-lg border text-sm font-medium', days.includes(d) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                    {n}
                  </button>
                ))}
              </div>
              {errors['recurrence.days'] && <p className="mt-1 text-xs text-red-600">{errors['recurrence.days']}</p>}
            </div>
            <Input label="From time" type="time" {...bind('startTime')} />
            <Input label="To time" type="time" {...bind('endTime')} error={errors['recurrence.endTime']} />
            <Input label="Repeat until" type="date" {...bind('untilDate')} error={errors.validTo} />
          </>
        )}
        <div className="sm:col-span-2">
          <GateMultiSelect label="Valid at" value={gates} onChange={setGates} hint={gates.length ? 'The guard at any other gate will send your guest to one of these.' : undefined} />
        </div>
      </div>
    </Modal>
  );
}
