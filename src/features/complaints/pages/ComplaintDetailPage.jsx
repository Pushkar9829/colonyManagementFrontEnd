import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Star, TrendingUp } from 'lucide-react';
import { Attachments, Badge, Button, Card, CardHeader, Checkbox, ErrorState, FileUpload, Modal, PageLoader, Select, StatusBadge, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/cn';
import { dateTime, label, timeAgo } from '../../../lib/format';
import { isManager, ROLES } from '../../../lib/roles';
import { useAssignComplaint, useAssignees, useComplaint, useComplaintComment, useComplaintStatus, useRateComplaint, useReopenComplaint } from '../api';

const NEXT = {
  open: ['in_progress', 'on_hold', 'resolved', 'closed'],
  assigned: ['in_progress', 'on_hold', 'resolved', 'closed'],
  reopened: ['in_progress', 'on_hold', 'resolved', 'closed'],
  in_progress: ['on_hold', 'resolved', 'closed'],
  on_hold: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

function RateBox({ id }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const rate = useRateComplaint();
  return (
    <Card className="p-5">
      <p className="font-medium text-slate-900">How was the resolution?</p>
      <div className="my-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star className={cn('size-7', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
      </div>
      <Textarea placeholder="Optional feedback" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <Button className="mt-3" disabled={!rating} loading={rate.isPending} onClick={() => rate.mutate({ id, rating, feedback: feedback || undefined })}>Submit rating</Button>
    </Card>
  );
}

// Moving to "resolved": staff attach before/after photos (required for some categories).
function ResolveModal({ c, onClose }) {
  const status = useComplaintStatus();
  const [before, setBefore] = useState([]);
  const [after, setAfter] = useState([]);
  const [note, setNote] = useState('');
  const hasBefore = c.resolutionPhotos?.before?.length > 0 || before.length > 0;
  const hasAfter = c.resolutionPhotos?.after?.length > 0 || after.length > 0;
  const blocked = c.requiresResolutionPhotos && !(hasBefore && hasAfter);
  return (
    <Modal open onClose={onClose} title="Mark as resolved" description={c.requiresResolutionPhotos ? `Before and after photos are required for ${c.categoryName || c.category} complaints.` : 'Photos of the work are optional but help the resident.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" disabled={blocked} loading={status.isPending}
        onClick={() => status.mutate({ id: c._id, status: 'resolved', note: note || undefined, beforePhotos: before.length ? before.map((f) => f._id) : undefined, afterPhotos: after.length ? after.map((f) => f._id) : undefined }, { onSuccess: onClose })}>Resolve</Button></>}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Before{c.resolutionPhotos?.before?.length ? ` (${c.resolutionPhotos.before.length} attached)` : ''}</p>
          <FileUpload folder="complaints" files={before} onChange={setBefore} max={3} camera label="Before photo" />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">After</p>
          <FileUpload folder="complaints" files={after} onChange={setAfter} max={3} camera label="After photo" />
        </div>
        <Textarea label="Resolution note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: c, isLoading, error, refetch } = useComplaint(id);
  const manager = isManager(user);
  const isResident = user.role === ROLES.RESIDENT;
  const canWork = manager || user.role === ROLES.STAFF;
  const { data: assignees = [] } = useAssignees(manager);
  const assign = useAssignComplaint();
  const status = useComplaintStatus();
  const reopen = useReopenComplaint();
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState([]);
  const comment = useComplaintComment({ onSuccess: () => { setText(''); setFiles([]); } });
  const [resolving, setResolving] = useState(false);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const nextStatuses = (NEXT[c.status] || []).filter((s) => manager || s !== 'closed');

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> All complaints
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-slate-500">{c.ticketNumber}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{c.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <StatusBadge status={c.priority} />
            <Badge>{c.categoryName || label(c.category)}</Badge>
            <Badge>{c.area === 'common' ? 'Common area' : c.unit?.label || 'Unit'}</Badge>
            {c.isOverdue && <Badge tone="red">Past deadline</Badge>}
            {c.escalationLevel > 0 && <Badge tone="amber">Escalated · level {c.escalationLevel}</Badge>}
          </div>
        </div>
        {isResident && ['resolved', 'closed'].includes(c.status) && (
          <Button variant="secondary" onClick={() => { const note = window.prompt('Why are you reopening this complaint?'); if (note?.trim()) reopen.mutate({ id, note }); }}>Reopen</Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{c.description || 'No additional details.'}</p>
            {c.attachments?.length > 0 && <div className="mt-3"><Attachments items={c.attachments} /></div>}
            <p className="mt-3 text-xs text-slate-400">Raised by {c.raisedBy?.name} · {dateTime(c.createdAt)}</p>
          </Card>

          {(c.resolutionPhotos?.before?.length > 0 || c.resolutionPhotos?.after?.length > 0) && (
            <Card className="grid gap-4 p-5 sm:grid-cols-2">
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Before</p><Attachments items={c.resolutionPhotos.before} /></div>
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">After</p><Attachments items={c.resolutionPhotos.after} /></div>
            </Card>
          )}

          {isResident && c.status === 'resolved' && !c.rating && <RateBox id={id} />}
          {c.rating && (
            <Card className="p-5">
              <div className="flex items-center gap-1 text-amber-500">{Array.from({ length: c.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}</div>
              {c.feedback && <p className="mt-2 text-sm text-slate-600">“{c.feedback}”</p>}
            </Card>
          )}

          <Card>
            <CardHeader title="Conversation" />
            <ul className="divide-y divide-slate-100">
              {!c.comments.length && <li className="px-5 py-6 text-sm text-slate-500">No comments yet.</li>}
              {c.comments.map((m) => (
                <li key={m._id} className={cn('px-5 py-3', m.internal && 'bg-amber-50/60')}>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{m.by?.name}</span>
                    <span>{label(m.by?.role)}</span>
                    <span>· {timeAgo(m.createdAt)}</span>
                    {m.internal && <span className="flex items-center gap-1 text-amber-700"><Lock className="size-3" /> internal</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.text}</p>
                  {m.attachments?.length > 0 && <div className="mt-2"><Attachments items={m.attachments} /></div>}
                </li>
              ))}
            </ul>
            {c.status !== 'closed' && (
              <div className="space-y-2 border-t border-slate-100 p-4">
                <Textarea placeholder="Write a comment…" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
                <FileUpload folder="complaints" files={files} onChange={setFiles} max={3} label="Photo" />
                <div className="flex items-center justify-between">
                  {canWork ? <Checkbox label="Internal note (hidden from resident)" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> : <span />}
                  <Button size="sm" disabled={!text.trim()} loading={comment.isPending} onClick={() => comment.mutate({ id, text, internal: internal || undefined, attachments: files.length ? files.map((f) => f._id) : undefined })}>Send</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Deadline</p>
              <p className={cn('font-medium', c.isOverdue ? 'text-red-600' : 'text-slate-800')}>{dateTime(c.slaDueAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Assigned to</p>
              <p className="font-medium text-slate-800">{c.assignedTo ? `${c.assignedTo.name}${c.assignedTo.designation ? ` (${c.assignedTo.designation})` : ''}` : 'Not assigned'}</p>
            </div>
            {manager && c.status !== 'closed' && (
              <Select label="Assign" placeholder="Choose staff" value="" onChange={(e) => e.target.value && assign.mutate({ id, assignedTo: e.target.value })}
                options={assignees.map((u) => ({ value: u.user, label: `${u.name}${u.designation ? ` · ${u.designation}` : ''}` }))} />
            )}
            {canWork && nextStatuses.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">Move to</p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s) => (
                    <Button key={s} size="sm" variant={s === 'resolved' ? 'success' : 'secondary'} loading={status.isPending && status.variables?.status === s} onClick={() => (s === 'resolved' ? setResolving(true) : status.mutate({ id, status: s }))}>{label(s)}</Button>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Timeline" />
            <ol className="space-y-3 p-5 text-sm">
              {c.history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  {h.kind === 'escalation' ? <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />}
                  <div>
                    {h.kind === 'escalation'
                      ? <p className="font-medium text-amber-700">Escalated to level {h.level}</p>
                      : <p className="text-slate-700"><span className="font-medium">{label(h.to)}</span>{h.by?.name ? ` by ${h.by.name}` : ''}</p>}
                    {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                    <p className="text-xs text-slate-400">{dateTime(h.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
      {resolving && <ResolveModal c={c} onClose={() => setResolving(false)} />}
    </div>
  );
}
