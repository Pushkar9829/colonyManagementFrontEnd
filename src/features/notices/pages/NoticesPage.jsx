import { useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, ClipboardCheck, Mail, Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, Checkbox, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { dateTime, label } from '../../../lib/format';
import { isManager, ROLE_LABELS } from '../../../lib/roles';
import { AudienceFields, cleanAudience } from '../../community/AudienceFields';
import { SendOnWhatsApp } from '../../whatsapp/components/SendOnWhatsApp';
import { useAckNotice, useCreateNotice, useDeleteNotice, useMarkNoticeRead, useNoticeAcks, useNotices, useRemindAcks, useUpdateNotice } from '../api';

const CATEGORIES = ['general', 'maintenance', 'event', 'meeting', 'emergency'];
const TONES = { general: 'slate', maintenance: 'amber', event: 'brand', meeting: 'blue', emergency: 'red' };

function NoticeModal({ open, onClose }) {
  const [audience, setAudience] = useState({ type: 'all', blocks: [], roles: [] });
  const [files, setFiles] = useState([]);
  const { values, bind, applyServerErrors, reset, errors } = useForm({
    title: '', body: '', category: 'general', pinned: false, expiresAt: '', sendEmail: false, requiresAck: false, schedule: false, publishAt: '',
  });
  const create = useCreateNotice({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  const submit = () => {
    const { schedule, publishAt, expiresAt, ...rest } = values;
    create.mutate(
      {
        ...rest,
        audience: cleanAudience(audience),
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
        publishAt: schedule && publishAt ? new Date(publishAt).toISOString() : undefined,
        attachments: files.length ? files.map((f) => f._id) : undefined,
      },
      { onError: applyServerErrors },
    );
  };
  return (
    <Modal open={open} onClose={onClose} title="New notice" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>{values.schedule ? 'Schedule' : 'Publish'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" required {...bind('title')} />
        <Textarea className="sm:col-span-2" label="Message" rows={6} required {...bind('body')} />
        <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} {...bind('category')} />
        <Input label="Show until" type="date" hint="Optional" {...bind('expiresAt')} />
        <div className="sm:col-span-2"><AudienceFields value={audience} onChange={setAudience} />{errors['audience.blocks'] || errors['audience.roles'] ? <p className="mt-1 text-xs text-red-600">{errors['audience.blocks'] || errors['audience.roles']}</p> : null}</div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">Attachments</p>
          <FileUpload folder="notices" files={files} onChange={setFiles} label="Add images or PDF" />
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Checkbox label="Pin to top" checked={values.pinned} onChange={bind('pinned').onChange} />
          <Checkbox label="Also email this notice" checked={values.sendEmail} onChange={bind('sendEmail').onChange} />
          <Checkbox label={'Residents must acknowledge ("I\'ve read this")'} checked={values.requiresAck} onChange={bind('requiresAck').onChange} />
          <Checkbox label="Publish later" checked={values.schedule} onChange={bind('schedule').onChange} />
          {values.schedule && <Input type="datetime-local" label="Publish at" error={errors.publishAt} {...bind('publishAt')} />}
        </div>
      </div>
    </Modal>
  );
}

function AckModal({ notice, onClose }) {
  const { data, isLoading } = useNoticeAcks(notice?._id);
  const remind = useRemindAcks();
  const [tab, setTab] = useState('pending');
  const rows = data?.[tab] || [];
  return (
    <Modal open={Boolean(notice)} onClose={onClose} title="Acknowledgements" description={notice?.title}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button>{data?.pending.length > 0 && <Button icon={BellRing} loading={remind.isPending} onClick={() => remind.mutate(notice._id)}>Remind {data.pending.length}</Button>}</>}>
      {isLoading || !data ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500" style={{ width: `${data.total ? (data.acknowledged.length / data.total) * 100 : 0}%` }} />
          </div>
          <Tabs className="mb-3 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'pending', label: `Not yet (${data.pending.length})` }, { value: 'acknowledged', label: `Acknowledged (${data.acknowledged.length})` }]} />
          {!rows.length ? <EmptyState icon={CheckCircle2} title={tab === 'pending' ? 'Everyone has acknowledged' : 'No acknowledgements yet'} /> : (
            <ul className="divide-y divide-slate-100">
              {rows.map((p) => (
                <li key={p.user} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.units.length ? p.units.join(', ') : ROLE_LABELS[p.role]}</p>
                  </div>
                  {p.at && <span className="shrink-0 text-xs text-slate-400">{dateTime(p.at)}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

export default function NoticesPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [acksFor, setAcksFor] = useState(null);
  const { data, isLoading } = useNotices({ category: category || undefined, page, pendingAck: filter === 'ack' || undefined, scheduled: filter === 'scheduled' || undefined });
  // Count for the "To acknowledge (n)" tab; residents only.
  const { data: pendingAck } = useNotices(manager ? { scheduled: true, limit: 1 } : { pendingAck: true, limit: 1 });
  const ackCount = manager ? 0 : pendingAck?.meta?.total || 0;
  const markRead = useMarkNoticeRead();
  const ack = useAckNotice();
  const update = useUpdateNotice();
  const remove = useDeleteNotice();

  const needsAck = (n) => n.requiresAck && !n.isAcknowledged && !n.scheduled && n.createdBy?._id !== user._id;
  const open = (n) => {
    setExpanded(expanded === n._id ? null : n._id);
    if (!n.isRead && !n.scheduled) markRead.mutate(n._id);
  };

  return (
    <div>
      <PageHeader title="Notice board" description="Announcements from the society management." actions={manager && <Button icon={Plus} onClick={() => setCreating(true)}>New notice</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs className="w-fit max-w-full" value={category} onChange={(v) => { setCategory(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c, label: label(c) }))]} />
        <Tabs className="w-fit" value={filter} onChange={(v) => { setFilter(v); setPage(1); }}
          tabs={[{ value: '', label: 'All notices' }, manager ? { value: 'scheduled', label: 'Scheduled' } : { value: 'ack', label: `To acknowledge${ackCount ? ` (${ackCount})` : ''}` }]} />
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
        <Card><EmptyState icon={Megaphone} title={filter === 'ack' ? 'Nothing to acknowledge' : filter === 'scheduled' ? 'No scheduled notices' : 'No notices'} description={filter ? undefined : 'Announcements from the committee will appear here.'} /></Card>
      ) : (
        <div className="space-y-3">
          {data.data.map((n) => (
            <Card key={n._id} className={cn('p-4 sm:p-5', !n.isRead && !n.scheduled && 'border-l-4 border-l-brand-500', n.requiresAck && !n.isAcknowledged && !manager && 'border-l-4 border-l-amber-500')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open(n)} className="block w-full text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.pinned && <Pin className="size-4 text-brand-600" />}
                      <h3 className="font-semibold text-slate-900">{n.title}</h3>
                      <Badge tone={TONES[n.category]}>{label(n.category)}</Badge>
                      {n.scheduled && <Badge tone="blue"><CalendarClock className="mr-1 size-3" />Scheduled {dateTime(n.publishAt)}</Badge>}
                      {!n.isRead && !n.scheduled && <Badge tone="brand">New</Badge>}
                      {n.requiresAck && <Badge tone={n.isAcknowledged ? 'green' : 'amber'}>{n.isAcknowledged ? 'Acknowledged' : 'Please acknowledge'}</Badge>}
                      {n.sendEmail && manager && <Badge><Mail className="mr-1 size-3" />Emailed</Badge>}
                      {n.audience?.type !== 'all' && <Badge>{n.audience.type === 'roles' ? n.audience.roles.map(label).join(', ') : 'Selected blocks'}</Badge>}
                    </div>
                  </button>
                  {/* Phones: the acknowledge button sits right under the title so it is seen without scrolling. */}
                  {needsAck(n) && (
                    <Button size="sm" className="mt-2 w-full sm:hidden" icon={CheckCircle2} loading={ack.isPending && ack.variables === n._id} onClick={() => ack.mutate(n._id)}>I&apos;ve read this</Button>
                  )}
                  <button type="button" onClick={() => open(n)} className="block w-full text-left">
                    <p className={cn('mt-2 whitespace-pre-wrap break-words text-sm text-slate-600', expanded !== n._id && 'line-clamp-2')}>{n.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {n.createdBy?.name}{n.createdBy?.designation ? ` (${n.createdBy.designation})` : ''} · {dateTime(n.publishAt || n.createdAt)}
                      {manager && n.readCount !== undefined ? ` · Seen by ${n.readCount}` : ''}
                    </p>
                  </button>
                </div>
                {manager && (
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {n.requiresAck && (
                      <button type="button" title="Who has acknowledged" onClick={() => setAcksFor(n)} className="flex min-h-10 items-center gap-1 rounded-md px-3 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:min-h-0 sm:p-1.5"><ClipboardCheck className="size-4" />{n.ackCount} acknowledged</button>
                    )}
                    <button type="button" title={n.pinned ? 'Unpin' : 'Pin to top'} onClick={() => update.mutate({ id: n._id, pinned: !n.pinned })} className="flex min-h-10 items-center gap-1 rounded-md px-3 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:min-h-0 sm:p-1.5"><Pin className="size-4" />{n.pinned ? 'Unpin' : 'Pin'}</button>
                    <SendOnWhatsApp text={`*${n.title}*\n\n${n.body}\n\n— ${user.society?.name || 'Society management'}`} label="Share on WhatsApp" className="self-center" />
                    <button type="button" title="Delete" onClick={() => window.confirm('Delete this notice?') && remove.mutate(n._id)} className="flex min-h-10 items-center gap-1 rounded-md px-3 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 sm:min-h-0 sm:p-1.5"><Trash2 className="size-4" />Delete</button>
                  </div>
                )}
              </div>
              {n.attachments?.length > 0 && <div className="mt-3"><Attachments items={n.attachments} /></div>}
              {needsAck(n) && (
                <div className="mt-3 hidden gap-2 rounded-lg bg-amber-50 p-3 sm:flex sm:items-center sm:justify-between">
                  <p className="text-sm text-amber-800">The committee asks everyone to confirm they have read this notice.</p>
                  <Button size="sm" icon={CheckCircle2} loading={ack.isPending && ack.variables === n._id} onClick={() => ack.mutate(n._id)}>I&apos;ve read this</Button>
                </div>
              )}
              {n.requiresAck && n.isAcknowledged && <p className="mt-2 text-xs text-emerald-700">You acknowledged this on {dateTime(n.acknowledgedAt)}</p>}
            </Card>
          ))}
          <Pagination meta={data.meta} onPage={setPage} />
        </div>
      )}
      {manager && <NoticeModal open={creating} onClose={() => setCreating(false)} />}
      {manager && <AckModal notice={acksFor} onClose={() => setAcksFor(null)} />}
    </div>
  );
}
