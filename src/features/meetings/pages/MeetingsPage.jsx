import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, Input, Modal, Pagination, Select, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime } from '../../../lib/format';
import { useGovernance, useMemberOptions } from '../../committee/api';
import { useActionItems, useCreateMeeting, useMeetings, useUpdateActionItem } from '../api';
import { ACTION_STATUS, AUDIENCES, MEETING_TYPES, TYPE_SHORT } from '../constants';

const DEFAULT_AUDIENCE = { agm: 'owners', sgm: 'owners', committee: 'committee', other: 'all_members' };

function MemberPicker({ value, onChange }) {
  const { data: members = [] } = useMemberOptions(true);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
      {members.map((m) => (
        <Checkbox key={m._id} className="flex" checked={value.includes(m._id)} onChange={() => toggle(m._id)} label={`${m.name}${m.unit?.label ? ` · ${m.unit.label}` : ''}`} />
      ))}
    </div>
  );
}

function NewMeetingModal({ open, onClose, isAdmin }) {
  const navigate = useNavigate();
  const { values, bind, set, applyServerErrors, errors } = useForm({
    title: '', type: 'agm', scheduledAt: '', mode: 'in_person', venue: '', onlineLink: '', description: '', audienceType: 'owners', quorumType: 'percent', quorumValue: '33',
  });
  const [agenda, setAgenda] = useState(['']);
  const [members, setMembers] = useState([]);
  const create = useCreateMeeting({ onSuccess: (m) => { onClose(); navigate(`/meetings/${m._id}`); } });
  const submit = () => create.mutate({
    title: values.title,
    type: values.type,
    scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : '',
    mode: values.mode,
    venue: values.venue || undefined,
    onlineLink: values.onlineLink || undefined,
    description: values.description || undefined,
    audience: { type: values.audienceType, memberships: values.audienceType === 'custom' ? members : undefined },
    quorum: { type: values.quorumType, value: Number(values.quorumValue) },
    agenda: agenda.filter((a) => a.trim()).map((title) => ({ title })),
  }, { onError: applyServerErrors });

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Schedule a meeting" description="Saved as a draft. Circulate the notice when the agenda is ready."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Create draft</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" required placeholder="Annual General Meeting 2026" {...bind('title')} />
        <Select label="Type" options={MEETING_TYPES} {...bind('type')} onChange={(e) => { set('type', e.target.value); set('audienceType', DEFAULT_AUDIENCE[e.target.value]); }} />
        <Input type="datetime-local" label="Date & time" required {...bind('scheduledAt')} />
        <Select label="Mode" options={[{ value: 'in_person', label: 'In person' }, { value: 'online', label: 'Online' }, { value: 'hybrid', label: 'Hybrid' }]} {...bind('mode')} />
        <Input label="Venue" placeholder="Clubhouse" {...bind('venue')} />
        {values.mode !== 'in_person' && <Input className="sm:col-span-2" label="Online meeting link" placeholder="https://" {...bind('onlineLink')} />}
        <Select label="Invite" options={AUDIENCES.filter((a) => isAdmin || a.value !== 'custom')} {...bind('audienceType')} error={errors['audience.memberships']} />
        <div className="grid grid-cols-2 gap-2">
          <Select label="Quorum" options={[{ value: 'percent', label: '% of invitees' }, { value: 'count', label: 'Members' }]} {...bind('quorumType')} />
          <Input type="number" min="1" label="Value" {...bind('quorumValue')} error={errors['quorum.value']} />
        </div>
        {values.audienceType === 'custom' && <div className="sm:col-span-2"><MemberPicker value={members} onChange={setMembers} /></div>}
        <Textarea className="sm:col-span-2" label="Notes for members" rows={2} {...bind('description')} />
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Agenda</p>
          {agenda.map((a, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="flex gap-2">
              <span className="mt-2.5 w-5 text-sm text-slate-400">{i + 1}.</span>
              <Input className="flex-1" value={a} placeholder="Agenda item" onChange={(e) => setAgenda(agenda.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button variant="ghost" icon={Trash2} aria-label="Remove item" onClick={() => setAgenda(agenda.filter((_, j) => j !== i))} disabled={agenda.length === 1} />
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAgenda([...agenda, ''])}>Add item</Button>
        </div>
      </div>
    </Modal>
  );
}

function ActionItems({ manage }) {
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(!manage);
  const { data = [], isLoading } = useActionItems({ status: status || undefined, mine: mine || undefined });
  const update = useUpdateActionItem();
  const navigate = useNavigate();
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <Select className="w-44" placeholder="Any status" options={ACTION_STATUS} value={status} onChange={(e) => setStatus(e.target.value)} />
        {manage && <Checkbox label="Only mine" checked={mine} onChange={(e) => setMine(e.target.checked)} />}
      </div>
      <Table
        loading={isLoading}
        rows={data}
        empty="No action items"
        columns={[
          { key: 'title', header: 'Action', className: 'max-w-xs whitespace-normal', render: (a) => <div><p className="font-medium text-slate-900">{a.title}</p><button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => navigate(`/meetings/${a.meeting._id}`)}>{a.meeting.number} · {a.meeting.title}</button></div> },
          { key: 'ownerName', header: 'Owner', render: (a) => a.ownerName || '—' },
          { key: 'dueDate', header: 'Due', render: (a) => <span className={a.isOverdue ? 'font-medium text-red-600' : ''}>{a.dueDate ? date(a.dueDate) : '—'}</span> },
          { key: 'status', header: 'Status', render: (a) => (
            <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={a.status} onChange={(e) => update.mutate({ id: a.meeting._id, actionId: a._id, status: e.target.value })}>
              {ACTION_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) },
        ]}
      />
    </Card>
  );
}

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { data: access } = useGovernance();
  const manage = Boolean(access?.canManage);
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useMeetings({ when: tab === 'actions' ? undefined : tab, page });

  return (
    <div>
      <PageHeader
        title="Meetings"
        description={manage ? 'Schedule meetings, circulate notices, take attendance and approve minutes.' : 'Meetings you are invited to, and their approved minutes.'}
        actions={manage && <Button icon={Plus} onClick={() => setCreating(true)}>New meeting</Button>}
      />
      <Tabs className="mb-4 w-fit" value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'actions', label: 'Action items' }]} />
      {tab === 'actions' ? <ActionItems manage={manage} /> : (
        <Card>
          <Table
            loading={isLoading}
            rows={data?.data}
            empty={tab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
            onRowClick={(m) => navigate(`/meetings/${m._id}`)}
            columns={[
              { key: 'number', header: 'No.', render: (m) => <span className="font-mono text-xs font-semibold text-slate-600">{m.number}</span> },
              { key: 'title', header: 'Meeting', className: 'max-w-xs', render: (m) => <div className="truncate"><p className="truncate font-medium text-slate-900">{m.title}</p><p className="text-xs text-slate-500">{TYPE_SHORT[m.type]}{m.venue ? ` · ${m.venue}` : ''}</p></div> },
              { key: 'scheduledAt', header: 'When', render: (m) => dateTime(m.scheduledAt) },
              { key: 'status', header: 'Status', render: (m) => <div className="flex gap-1.5"><StatusBadge status={m.status === 'scheduled' ? 'confirmed' : m.status === 'draft' ? 'pending' : m.status} />{m.minutes?.status === 'approved' && <Badge tone="green">Minutes</Badge>}</div> },
              { key: 'agendaCount', header: 'Agenda', render: (m) => `${m.agendaCount} item(s)` },
              ...(manage ? [{ key: 'openActionItems', header: '', render: (m) => (m.openActionItems ? <span className="inline-flex items-center gap-1 text-xs text-amber-700"><ListChecks className="size-3.5" />{m.openActionItems} open</span> : null) }] : []),
            ]}
          />
          <Pagination meta={data?.meta} onPage={setPage} />
        </Card>
      )}
      {manage && <NewMeetingModal open={creating} onClose={() => setCreating(false)} isAdmin={access?.isAdmin} />}
    </div>
  );
}
