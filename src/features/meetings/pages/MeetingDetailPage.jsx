import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, FileText, Megaphone, Plus, Trash2, Users, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, FileUpload, Input, PageLoader, Select, StatusBadge, Tabs, Textarea } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { date, dateTime, label } from '../../../lib/format';
import { downloadPdf } from '../../committee/lib';
import {
  useAddActionItem, useAddAgendaItem, useAddAttachments, useAddResolution, useApproveMinutes, useCancelMeeting, useInvitees, useMarkAttendance,
  useMeeting, useRemoveActionItem, useRemoveAgendaItem, useRemoveAttachment, useRemoveAttendance, useRemoveResolution, useSendNotice,
  useUpdateActionItem, useUpdateAgendaItem, useUpdateMinutes,
} from '../api';
import { ACTION_STATUS, MAJORITY, MEETING_TYPES, MODES } from '../constants';

function QuorumCard({ q }) {
  const { t } = useT();
  if (!q) return null;
  return (
    <Card className={cn('mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 p-4', q.met ? 'border-emerald-200' : 'border-amber-200')}>
      <div className="flex items-center gap-2">
        {q.met ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-amber-600" />}
        <span className="font-medium text-slate-900">{q.met ? t('Quorum present') : t('Quorum not yet met')}</span>
      </div>
      <span className="text-sm text-slate-600">{t('Rule: {rule}', { rule: q.rule })}</span>
      <span className="text-sm text-slate-600">{t('Present')} <b>{q.present}</b> {t('of {eligible} · required', { eligible: q.eligible })} <b>{q.required}</b></span>
      <span className="text-xs text-slate-500">{t('{inPerson} in person · {online} online · {proxy} proxy', { inPerson: q.byMode.in_person, online: q.byMode.online, proxy: q.byMode.proxy })}</span>
    </Card>
  );
}

function AgendaItem({ m, item, index, editable }) {
  const [minutes, setMinutes] = useState(item.minutes || '');
  useEffect(() => setMinutes(item.minutes || ''), [item.minutes]);
  const save = useUpdateAgendaItem();
  const remove = useRemoveAgendaItem();
  const { t } = useT();
  const resolutions = (m.resolutions || []).filter((r) => r.agendaItem === item._id);
  return (
    <div className="border-b border-slate-100 px-5 py-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900">{index + 1}. {item.title}</p>
        {editable && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('Remove agenda item')} onClick={() => remove.mutate({ id: m._id, itemId: item._id })} />}
      </div>
      {item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}
      {editable ? (
        <div className="mt-3 space-y-2">
          <Textarea rows={3} placeholder="Minutes: discussion and decision on this item" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={minutes === (item.minutes || '')} loading={save.isPending} onClick={() => save.mutate({ id: m._id, itemId: item._id, minutes })}>Save minutes</Button>
        </div>
      ) : item.minutes ? <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.minutes}</p> : null}
      {resolutions.map((r) => <p key={r._id} className="mt-2 text-xs text-slate-500">{t('Resolution {number}: {title}', { number: r.number, title: r.title })} — <span className={r.result === 'passed' ? 'text-emerald-700' : 'text-red-600'}>{t(label(r.result))}</span></p>)}
    </div>
  );
}

function AgendaTab({ m, editable }) {
  const [title, setTitle] = useState('');
  const add = useAddAgendaItem({ onSuccess: () => setTitle('') });
  const [summary, setSummary] = useState(m.minutes?.summary || '');
  const saveSummary = useUpdateMinutes();
  const { t } = useT();
  const showMinutes = m.canManage || m.minutes?.status === 'approved';
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Agenda" subtitle={showMinutes ? 'With minutes of each item' : 'Minutes are shared once approved'} />
        {m.agenda.length ? m.agenda.map((item, i) => <AgendaItem key={item._id} m={m} item={item} index={i} editable={editable} />) : <EmptyState title="No agenda items" />}
        {editable && (
          <div className="flex gap-2 border-t border-slate-100 p-4">
            <Input className="flex-1" placeholder="New agenda item" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button icon={Plus} disabled={title.trim().length < 2} loading={add.isPending} onClick={() => add.mutate({ id: m._id, title })}>Add</Button>
          </div>
        )}
      </Card>
      {showMinutes && (editable || m.minutes?.summary) && (
        <Card className="p-5">
          <p className="mb-2 font-medium text-slate-900">{t('Proceedings / general notes')}</p>
          {editable ? (
            <>
              <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Chair, opening remarks, confirmation of previous minutes..." />
              <Button className="mt-2" size="sm" variant="secondary" loading={saveSummary.isPending} onClick={() => saveSummary.mutate({ id: m._id, summary })}>Save</Button>
            </>
          ) : <p className="whitespace-pre-line text-sm text-slate-700">{m.minutes.summary}</p>}
        </Card>
      )}
    </div>
  );
}

function AttendanceRow({ m, invitee, editable }) {
  const mark = useMarkAttendance();
  const unmark = useRemoveAttendance();
  const toast = useToast();
  const { t } = useT();
  const [proxy, setProxy] = useState(invitee.attendance?.proxyHolder || '');
  const mode = invitee.attendance?.mode || '';
  const change = (next) => {
    if (!next) return unmark.mutate({ id: m._id, membershipId: invitee._id });
    if (next === 'proxy' && !proxy.trim()) return toast.error(t("Enter the proxy holder's name first"));
    return mark.mutate({ id: m._id, entries: [{ membership: invitee._id, mode: next, proxyHolder: next === 'proxy' ? proxy : undefined }] });
  };
  return (
    <tr className={cn(mode && 'bg-emerald-50/40')}>
      <td className="px-4 py-2.5"><p className="font-medium text-slate-900">{invitee.name}</p><p className="text-xs text-slate-500">{invitee.unitLabel || t(label(invitee.role))}</p></td>
      <td className="px-4 py-2.5">
        <select disabled={!editable} value={mode} onChange={(e) => change(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50">
          <option value="">{t('Absent')}</option>
          {MODES.map((x) => <option key={x.value} value={x.value}>{t(x.label)}</option>)}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <input disabled={!editable} value={proxy} onChange={(e) => setProxy(e.target.value)} onBlur={() => mode === 'proxy' && proxy.trim() && proxy !== invitee.attendance?.proxyHolder && change('proxy')}
          placeholder={t('Proxy holder (if any)')} className="w-full min-w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50" />
      </td>
    </tr>
  );
}

function AttendanceTab({ m, editable }) {
  const { data: invitees, isLoading } = useInvitees(m._id, m.canManage);
  const { t } = useT();
  if (!m.canManage) {
    return (
      <Card>
        <ul className="divide-y divide-slate-100">
          {m.attendance.map((a) => <li key={a._id} className="flex justify-between px-5 py-3 text-sm"><span>{a.name} <span className="text-slate-500">{a.unitLabel}</span></span><span className="text-slate-600">{a.mode === 'proxy' ? t('Proxy: {name}', { name: a.proxyHolder }) : t(label(a.mode))}</span></li>)}
        </ul>
      </Card>
    );
  }
  if (isLoading) return <PageLoader />;
  return (
    <Card>
      <CardHeader title="Attendance register" subtitle={m.status === 'draft' ? 'Circulate the notice before taking attendance' : t('{n} invited', { n: invitees?.length || 0 })} />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50"><tr>{['Member', 'Attendance', 'Proxy holder'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t(h)}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{(invitees || []).map((i) => <AttendanceRow key={i._id} m={m} invitee={i} editable={editable && m.status !== 'draft'} />)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function ResolutionsTab({ m, editable }) {
  const { values, bind, applyServerErrors, reset } = useForm({ title: '', text: '', agendaItem: '', proposedBy: '', secondedBy: '', majority: 'simple', votesFor: '0', votesAgainst: '0', abstain: '0' });
  const add = useAddResolution({ onSuccess: () => reset() });
  const remove = useRemoveResolution();
  const { t } = useT();
  const present = m.attendance.map((a) => ({ value: a.membership, label: `${a.name}${a.unitLabel ? ` (${a.unitLabel})` : ''}` }));
  return (
    <div className="space-y-6">
      <Card>
        {m.resolutions.length ? (
          <ul className="divide-y divide-slate-100">
            {m.resolutions.map((r) => (
              <li key={r._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">{r.number}. {r.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.result === 'passed' ? 'green' : 'red'}>{t(label(r.result))}</Badge>
                    {editable && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('Delete resolution')} onClick={() => remove.mutate({ id: m._id, resolutionId: r._id })} />}
                  </div>
                </div>
                <p className="mt-1 text-sm italic text-slate-700">{r.text}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {t('Proposed by {proposer} · seconded by {seconder} · For {for} / Against {against} / Abstain {abstain} · {majority}', { proposer: r.proposedByName || '—', seconder: r.secondedByName || '—', for: r.votesFor, against: r.votesAgainst, abstain: r.abstain, majority: t(MAJORITY.find((x) => x.value === r.majority)?.label || '') })}
                </p>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No resolutions recorded" />}
      </Card>
      {editable && m.status !== 'draft' && (
        <Card className="p-5">
          <p className="mb-3 font-medium text-slate-900">{t('Record a resolution')}</p>
          {!m.quorumState?.met && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t('Quorum is not met yet — mark attendance first.')}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="Title" {...bind('title')} />
            <Textarea className="sm:col-span-2" label="Resolution text" placeholder="Resolved that ..." {...bind('text')} />
            <Select label="Agenda item" placeholder="—" options={m.agenda.map((a, i) => ({ value: a._id, label: `${i + 1}. ${a.title}` }))} {...bind('agendaItem')} />
            <Select label="Majority required" options={MAJORITY} {...bind('majority')} />
            <Select label="Proposed by" placeholder="—" options={present} {...bind('proposedBy')} />
            <Select label="Seconded by" placeholder="—" options={present} {...bind('secondedBy')} />
            <div className="grid grid-cols-3 gap-2 sm:col-span-2">
              <Input type="number" min="0" label="For" {...bind('votesFor')} />
              <Input type="number" min="0" label="Against" {...bind('votesAgainst')} />
              <Input type="number" min="0" label="Abstain" {...bind('abstain')} />
            </div>
          </div>
          <Button className="mt-4" loading={add.isPending} onClick={() => add.mutate({
            id: m._id,
            title: values.title,
            text: values.text,
            agendaItem: values.agendaItem || undefined,
            proposedBy: values.proposedBy || undefined,
            secondedBy: values.secondedBy || undefined,
            majority: values.majority,
            votesFor: Number(values.votesFor),
            votesAgainst: Number(values.votesAgainst),
            abstain: Number(values.abstain),
          }, { onError: applyServerErrors })}>Record resolution</Button>
        </Card>
      )}
    </div>
  );
}

function ActionsTab({ m }) {
  const { data: invitees = [] } = useInvitees(m._id, m.canManage);
  const { values, bind, reset, applyServerErrors } = useForm({ title: '', owner: '', dueDate: '', agendaItem: '' });
  const add = useAddActionItem({ onSuccess: () => reset() });
  const update = useUpdateActionItem();
  const remove = useRemoveActionItem();
  const { t } = useT();
  return (
    <div className="space-y-6">
      <Card>
        {m.actionItems.length ? (
          <ul className="divide-y divide-slate-100">
            {m.actionItems.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.ownerName || t('Unassigned')}{a.dueDate ? ` · ${t('due {date}', { date: date(a.dueDate) })}` : ''}{a.notes ? ` · ${a.notes}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={a.status} onChange={(e) => update.mutate({ id: m._id, actionId: a._id, status: e.target.value })}>
                    {ACTION_STATUS.map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
                  </select>
                  {m.canManage && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('Delete action item')} onClick={() => remove.mutate({ id: m._id, actionId: a._id })} />}
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No action items" />}
      </Card>
      {m.canManage && m.status !== 'cancelled' && (
        <Card className="p-5">
          <p className="mb-3 font-medium text-slate-900">{t('Add action item')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="Action" {...bind('title')} />
            <Select label="Owner" placeholder="—" options={invitees.map((i) => ({ value: i._id, label: `${i.name}${i.unitLabel ? ` (${i.unitLabel})` : ''}` }))} {...bind('owner')} />
            <Input type="date" label="Due date" {...bind('dueDate')} />
            <Select className="sm:col-span-2" label="Agenda item" placeholder="—" options={m.agenda.map((a, i) => ({ value: a._id, label: `${i + 1}. ${a.title}` }))} {...bind('agendaItem')} />
          </div>
          <Button className="mt-4" loading={add.isPending} onClick={() => add.mutate({ id: m._id, title: values.title, owner: values.owner || undefined, dueDate: values.dueDate || undefined, agendaItem: values.agendaItem || undefined }, { onError: applyServerErrors })}>Add</Button>
        </Card>
      )}
    </div>
  );
}

function AttachmentsTab({ m }) {
  const [files, setFiles] = useState([]);
  const attach = useAddAttachments({ onSuccess: () => setFiles([]) });
  const remove = useRemoveAttachment();
  const { t } = useT();
  return (
    <Card className="space-y-4 p-5">
      {m.attachments.length ? (
        <ul className="space-y-2">
          {m.attachments.map((a) => (
            <li key={a._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <a href={a.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-brand-700 hover:underline"><FileText className="size-4 shrink-0" /><span className="truncate">{a.name || t('Attachment')}</span></a>
              {m.canManage && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('Remove attachment')} onClick={() => remove.mutate({ id: m._id, attachmentId: a._id })} />}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">{t('No papers attached.')}</p>}
      {m.canManage && (
        <div className="border-t border-slate-100 pt-4">
          <FileUpload folder="documents" files={files} onChange={setFiles} label="Add papers" />
          {files.length > 0 && <Button className="mt-2" size="sm" loading={attach.isPending} onClick={() => attach.mutate({ id: m._id, uploads: files.map((f) => f._id) })}>{t('Attach {n} file(s)', { n: files.length })}</Button>}
        </div>
      )}
    </Card>
  );
}

export default function MeetingDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: m, isLoading, error, refetch } = useMeeting(id);
  const [tab, setTab] = useState('agenda');
  const [busyPdf, setBusyPdf] = useState(false);
  const notice = useSendNotice();
  const cancel = useCancelMeeting();
  const approve = useApproveMinutes();
  const { t } = useT();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const approved = m.minutes?.status === 'approved';
  const editable = m.canManage && !approved && m.status !== 'cancelled';
  const pdf = async () => {
    setBusyPdf(true);
    try {
      await downloadPdf(`/meetings/${m._id}/minutes/pdf`, `Minutes-${m.number}.pdf`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusyPdf(false);
    }
  };
  const showRecord = m.canManage || approved;
  const tabs = [
    { value: 'agenda', label: 'Agenda & minutes' },
    ...(showRecord ? [{ value: 'attendance', label: 'Attendance', count: m.attendance.length }, { value: 'resolutions', label: 'Resolutions', count: m.resolutions.length }] : []),
    { value: 'actions', label: 'Action items' },
    { value: 'attachments', label: 'Papers' },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/meetings" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('All meetings')}</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-slate-500">{m.number}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{m.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{t(MEETING_TYPES.find((x) => x.value === m.type)?.label || '')} · {dateTime(m.scheduledAt)}{m.venue ? ` · ${m.venue}` : ''}</p>
          {m.onlineLink && <a href={m.onlineLink} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">{t('Join online')}</a>}
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={m.status === 'scheduled' ? 'confirmed' : m.status === 'draft' ? 'pending' : m.status} />
            {approved && <Badge tone="green">{t('Minutes approved {date}', { date: date(m.minutes.approvedAt) })}</Badge>}
            {m.notice?.sentAt && <Badge tone="blue"><Users className="mr-1 size-3" />{t('Notice to {n}', { n: m.notice.recipients })}</Badge>}
          </div>
          {m.cancelledReason && <p className="mt-2 text-sm text-red-600">{t('Cancelled: {reason}', { reason: m.cancelledReason })}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && m.status !== 'completed' && <Button icon={Megaphone} variant="secondary" loading={notice.isPending} onClick={() => notice.mutate(m._id)}>{m.notice?.sentAt ? 'Send reminder' : 'Circulate notice'}</Button>}
          {editable && m.status === 'scheduled' && <Button variant="success" icon={CheckCircle2} loading={approve.isPending} onClick={() => { if (window.confirm(t('Approve the minutes? The record will be locked and shared with members.'))) approve.mutate(m._id); }}>Approve minutes</Button>}
          {showRecord && m.status !== 'draft' && <Button variant="secondary" icon={Download} loading={busyPdf} onClick={pdf}>{approved ? 'Minutes PDF' : 'Draft PDF'}</Button>}
          {editable && m.status !== 'completed' && <Button variant="ghost" onClick={() => { const reason = window.prompt(t('Reason for cancelling')); if (reason?.trim()) cancel.mutate({ id: m._id, reason }); }}>Cancel meeting</Button>}
        </div>
      </div>
      {m.description && <Card className="mb-6 whitespace-pre-line p-4 text-sm text-slate-700">{m.description}</Card>}
      <QuorumCard q={m.quorumState} />
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'agenda' && <AgendaTab m={m} editable={editable} />}
      {tab === 'attendance' && <AttendanceTab m={m} editable={editable} />}
      {tab === 'resolutions' && <ResolutionsTab m={m} editable={editable} />}
      {tab === 'actions' && <ActionsTab m={m} />}
      {tab === 'attachments' && <AttachmentsTab m={m} />}
    </div>
  );
}
