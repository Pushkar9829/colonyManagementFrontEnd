import { useState } from 'react';
import { MailCheck, Plus, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, PageLoader, Select, Tabs } from '../../../components/ui';
import { dateTime, label } from '../../../lib/format';
import { useCreateSchedule, useDeleteSchedule, useSchedulePreview, useSchedules, useSendScheduleNow, useUpdateSchedule } from '../api';

const SECTIONS = ['collections', 'dues', 'complaints', 'visitors'];
const parseEmails = (text) => text.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);

function SectionPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-4">
      {SECTIONS.map((s) => (
        <Checkbox key={s} label={label(s)} checked={value.includes(s)} onChange={(e) => onChange(e.target.checked ? [...value, s] : value.filter((x) => x !== s))} />
      ))}
    </div>
  );
}

function NewScheduleModal({ existing, onClose }) {
  const free = ['weekly', 'monthly'].filter((f) => !existing.includes(f));
  const [form, setForm] = useState({ frequency: free[0], sections: SECTIONS, recipients: '' });
  const [error, setError] = useState(null);
  const create = useCreateSchedule({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Schedule a summary email" description="Weekly summaries go out on Mondays, monthly ones on the 1st, at 8 AM, with an Excel file attached."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ frequency: form.frequency, sections: form.sections, recipients: parseEmails(form.recipients) }, { onError: (e) => setError(e.message) })}>Schedule</Button></>}>
      <div className="space-y-4">
        <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} options={free.map((f) => ({ value: f, label: label(f) }))} />
        <div><p className="mb-2 text-sm font-medium text-slate-700">Include</p><SectionPicker value={form.sections} onChange={(sections) => setForm({ ...form, sections })} /></div>
        <Input label="Recipients" placeholder="treasurer@society.in, secretary@society.in" hint="Blank = all society admins" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} error={error} />
      </div>
    </Modal>
  );
}

function ScheduleCard({ s }) {
  const update = useUpdateSchedule();
  const remove = useDeleteSchedule();
  const send = useSendScheduleNow();
  const [recipients, setRecipients] = useState(null);
  return (
    <Card>
      <CardHeader title={`${label(s.frequency)} summary`} subtitle={s.enabled ? `Next: ${dateTime(s.nextRunAt)}` : 'Paused'}
        action={<Badge tone={s.enabled ? 'green' : 'slate'}>{s.enabled ? 'On' : 'Paused'}</Badge>} />
      <div className="space-y-4 p-5 text-sm">
        <SectionPicker value={s.sections} onChange={(sections) => sections.length && update.mutate({ id: s._id, sections })} />
        <div className="flex flex-wrap items-end gap-2">
          <Input className="min-w-64 flex-1" label="Recipients" hint="Blank = all society admins" value={recipients ?? s.recipients.join(', ')} onChange={(e) => setRecipients(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={recipients === null} loading={update.isPending} onClick={() => update.mutate({ id: s._id, recipients: parseEmails(recipients) }, { onSuccess: () => setRecipients(null) })}>Save</Button>
        </div>
        <p className="text-xs text-slate-500">{s.lastSentAt ? `Last sent ${dateTime(s.lastSentAt)}` : 'Not sent yet'}{s.lastError ? ` · last error: ${s.lastError}` : ''}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={Send} loading={send.isPending} onClick={() => send.mutate(s._id)}>Send now</Button>
          <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: s._id, enabled: !s.enabled })}>{s.enabled ? 'Pause' : 'Resume'}</Button>
          <Button size="sm" variant="ghost" icon={Trash2} loading={remove.isPending} onClick={() => window.confirm('Remove this scheduled email?') && remove.mutate(s._id)}>Remove</Button>
        </div>
      </div>
    </Card>
  );
}

function Preview() {
  const [frequency, setFrequency] = useState('monthly');
  const { data } = useSchedulePreview(frequency);
  return (
    <Card>
      <CardHeader title="What the email says" subtitle={data ? `Preview for ${data.range.label}` : undefined} action={<Tabs value={frequency} onChange={setFrequency} tabs={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />} />
      <ul className="space-y-1 p-5 text-sm text-slate-700">{data?.lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </Card>
  );
}

export default function ScheduledReportsPage() {
  const { data, isLoading } = useSchedules();
  const [creating, setCreating] = useState(false);
  if (isLoading) return <PageLoader />;
  const existing = data.map((s) => s.frequency);
  return (
    <div>
      <PageHeader title="Scheduled reports" description="Summary emails for the committee: collections, dues, complaints and visitors, with the details in Excel."
        actions={existing.length < 2 && <Button icon={Plus} onClick={() => setCreating(true)}>New schedule</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.length ? data.map((s) => <ScheduleCard key={s._id} s={s} />) : <Card className="lg:col-span-2"><EmptyState icon={MailCheck} title="No summary emails yet" description="Set up a weekly or monthly email to the committee." action={<Button icon={Plus} onClick={() => setCreating(true)}>New schedule</Button>} /></Card>}
        <div className="lg:col-span-2"><Preview /></div>
      </div>
      {creating && <NewScheduleModal existing={existing} onClose={() => setCreating(false)} />}
    </div>
  );
}
