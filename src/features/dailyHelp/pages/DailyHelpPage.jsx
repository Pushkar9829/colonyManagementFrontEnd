import { useState } from 'react';
import { BadgeCheck, CalendarOff, FileText, IndianRupee, Plus, Star, UserCheck } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Checkbox, Card, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { currentPeriod, date as fmtDate, dateTime, label, money, time, toPaise, toRupees, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import {
  useAddLeave,
  useCreateHelp,
  useDailyHelp,
  useHelpAttendance,
  useHelpDocuments,
  useHelpLeaves,
  useHelpReviews,
  useHelpVerification,
  useRateHelp,
  useRemoveHelpFromUnit,
  useRemoveLeave,
  useSalaryPaid,
  useSetEmployment,
  useUpdateHelp,
} from '../api';

const TYPES = ['maid', 'cook', 'driver', 'nanny', 'gardener', 'cleaner', 'other'].map((v) => ({ value: v, label: label(v) }));
const DOC_KINDS = ['id_proof', 'address_proof', 'police_verification', 'photo', 'other'].map((v) => ({ value: v, label: label(v) }));
const VERIFY_TONES = { verified: 'green', submitted: 'amber', rejected: 'red', not_submitted: 'slate' };

function Stars({ value, onChange, size = 'size-6' }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} stars`}>
          <Star className={cn(size, n <= Math.round(value || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  );
}

function AddHelpModal({ open, onClose }) {
  const { values, bind, applyServerErrors, reset } = useForm({ name: '', phone: '', type: 'maid' });
  const create = useCreateHelp({ onSuccess: () => { reset(); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add daily help" description="If they already work in the colony (same phone), they are linked to your home." size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...values, phone: values.phone || undefined }, { onError: applyServerErrors })}>Add</Button></>}>
      <div className="space-y-4">
        <Input label="Name" required {...bind('name')} />
        <Input label="Phone" type="tel" {...bind('phone')} />
        <Select label="Role" options={TYPES} {...bind('type')} />
      </div>
    </Modal>
  );
}

function AttendanceTab({ help }) {
  const { data, isLoading } = useHelpAttendance(help._id);
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!data?.data.length) return <EmptyState title="No visits recorded yet" />;
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {data.data.map((a) => (
        <li key={a._id} className="flex justify-between py-2">
          <span className="text-slate-700">{dateTime(a.inAt)}</span>
          <span className="text-slate-500">{a.outAt ? `left ${time(a.outAt)}` : 'still inside'}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewsTab({ help, canRate }) {
  const { data, isLoading } = useHelpReviews(help._id);
  const [rating, setRating] = useState(help.myReview?.rating || 0);
  const [text, setText] = useState(help.myReview?.text || '');
  const rate = useRateHelp();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Stars value={help.avgRating} size="size-5" />
        <span className="text-sm text-slate-600">{help.avgRating ? `${help.avgRating} / 5 from ${help.ratingCount} home${help.ratingCount === 1 ? '' : 's'}` : 'No ratings yet'}</span>
      </div>
      {canRate && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">{help.myReview ? 'Your review' : 'Rate this helper'}</p>
          <Stars value={rating} onChange={setRating} />
          <Textarea className="mt-2" rows={2} placeholder="Optional comments" value={text} onChange={(e) => setText(e.target.value)} />
          <Button className="mt-2" size="sm" disabled={!rating} loading={rate.isPending} onClick={() => rate.mutate({ id: help._id, rating, text: text || undefined })}>Save review</Button>
        </div>
      )}
      {isLoading ? <Spinner /> : (
        <ul className="divide-y divide-slate-100 text-sm">
          {data?.data.map((r) => (
            <li key={r._id} className="py-2">
              <div className="flex items-center justify-between"><span className="font-medium text-slate-700">{r.unit?.label}</span><Stars value={r.rating} size="size-3.5" /></div>
              {r.text && <p className="text-slate-600">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SalaryTab({ help }) {
  const job = help.myEmployment;
  const [salary, setSalary] = useState(String(toRupees(job?.salary)));
  const [dueDay, setDueDay] = useState(String(job?.dueDay ?? 1));
  const [remindersOn, setRemindersOn] = useState(job?.remindersOn ?? true);
  const save = useSetEmployment();
  const paid = useSalaryPaid();
  const paidThisMonth = job?.lastPaidPeriod === currentPeriod();
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Only your home sees this. We remind you on the due day every month until you mark it paid.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Monthly salary (₹)" type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
        <Input label="Due on day" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} hint="1–28" />
      </div>
      <Checkbox label="Remind me when salary is due" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ id: help._id, salary: toPaise(salary), dueDay: Number(dueDay), remindersOn })}>Save</Button>
        {job && (paidThisMonth ? <Badge tone="green">Paid for this month</Badge> : <Button size="sm" variant="success" icon={IndianRupee} loading={paid.isPending} onClick={() => paid.mutate(help._id)}>Mark {money(job.salary)} paid</Button>)}
      </div>
    </div>
  );
}

function LeaveTab({ help, canMark }) {
  const { data, isLoading } = useHelpLeaves(help._id);
  const [day, setDay] = useState(todayISO());
  const [kind, setKind] = useState('leave');
  const [reason, setReason] = useState('');
  const add = useAddLeave({ onSuccess: () => setReason('') });
  const remove = useRemoveLeave();
  return (
    <div className="space-y-4">
      {canMark && (
        <div className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Input label="Date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          <Select label="Type" options={[{ value: 'leave', label: 'On leave' }, { value: 'absent', label: 'Did not come' }]} value={kind} onChange={(e) => setKind(e.target.value)} />
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button loading={add.isPending} onClick={() => add.mutate({ id: help._id, date: day, kind, reason: reason || undefined })}>Mark</Button>
        </div>
      )}
      {isLoading ? <Spinner /> : !data?.data.length ? <EmptyState icon={CalendarOff} title="No leave or absences recorded" /> : (
        <ul className="divide-y divide-slate-100 text-sm">
          {data.data.map((l) => (
            <li key={l._id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium text-slate-700">{fmtDate(l.date)} · {l.kind === 'leave' ? 'On leave' : 'Absent'}</p>
                <p className="text-xs text-slate-500">{l.source === 'auto' ? 'No gate entry by noon' : `${l.unit?.label || ''}${l.reason ? ` · ${l.reason}` : ''}`}</p>
              </div>
              {canMark && l.source === 'household' && <Button size="sm" variant="ghost" onClick={() => remove.mutate({ id: help._id, leaveId: l._id })}>Remove</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentsTab({ help, canManage }) {
  const [kind, setKind] = useState('id_proof');
  const [files, setFiles] = useState([]);
  const add = useHelpDocuments({ onSuccess: () => setFiles([]) });
  const verify = useHelpVerification();
  const pv = help.policeVerification || { status: 'not_submitted' };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Police verification:</span>
        <Badge tone={VERIFY_TONES[pv.status]}>{label(pv.status)}</Badge>
        {pv.notes && <span className="text-xs text-slate-500">{pv.notes}</span>}
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-2">
          {['verified', 'rejected'].map((s) => (
            <Button key={s} size="sm" variant={s === 'verified' ? 'success' : 'secondary'} onClick={() => { const notes = window.prompt('Notes (optional)') ?? undefined; verify.mutate({ id: help._id, status: s, notes: notes || undefined }); }}>Mark {s}</Button>
          ))}
        </div>
      )}
      {help.documents?.length ? (
        <ul className="space-y-3">
          {help.documents.map((d) => (
            <li key={d._id}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label(d.kind)} · {fmtDate(d.createdAt)}</p>
              <Attachments items={d.files} />
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={FileText} title="No documents yet" />}
      <div className="grid gap-3 rounded-lg bg-slate-50 p-3">
        <Select label="Document" options={DOC_KINDS} value={kind} onChange={(e) => setKind(e.target.value)} />
        <FileUpload folder="documents" files={files} onChange={setFiles} max={4} label="Attach" />
        <Button size="sm" className="justify-self-start" disabled={!files.length} loading={add.isPending} onClick={() => add.mutate({ id: help._id, kind, files: files.map((f) => f._id) })}>Upload</Button>
      </div>
    </div>
  );
}

function HelperModal({ help, onClose, isResident, canManage }) {
  const [tab, setTab] = useState('attendance');
  const tabs = [
    { value: 'attendance', label: 'Attendance' },
    { value: 'reviews', label: 'Reviews' },
    ...(isResident ? [{ value: 'salary', label: 'Salary' }] : []),
    { value: 'leave', label: 'Leave' },
    { value: 'documents', label: 'Documents' },
  ];
  return (
    <Modal open onClose={onClose} title={help.name} description={`${label(help.type)}${help.phone ? ` · ${help.phone}` : ''}`} size="lg">
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'attendance' && <AttendanceTab help={help} />}
      {tab === 'reviews' && <ReviewsTab help={help} canRate={isResident} />}
      {tab === 'salary' && <SalaryTab help={help} />}
      {tab === 'leave' && <LeaveTab help={help} canMark={isResident} />}
      {tab === 'documents' && <DocumentsTab help={help} canManage={canManage} />}
    </Modal>
  );
}

export default function DailyHelpPage() {
  const { user } = useAuth();
  const isResident = user.role === ROLES.RESIDENT;
  const canManage = ['admin', 'facility_manager'].includes(user.role);
  const [filters, setFilters] = useState({ search: '', type: '', page: 1 });
  const [adding, setAdding] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const { data, isLoading } = useDailyHelp({ search: filters.search || undefined, type: filters.type || undefined, page: filters.page });
  const remove = useRemoveHelpFromUnit();
  const update = useUpdateHelp();
  const viewing = data?.data.find((h) => h._id === viewingId);

  return (
    <div>
      <PageHeader
        title="Daily help"
        description={isResident ? 'Maids, cooks and drivers working at your home. Share the passcode with them for gate entry.' : 'All domestic staff registered in the colony.'}
        actions={(isResident || canManage) && <Button icon={Plus} onClick={() => setAdding(true)}>Add helper</Button>}
      />
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
          <Input placeholder="Search name or phone" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
          <Select placeholder="All roles" options={TYPES} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))} />
        </div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon={UserCheck} title="No helpers yet" /> : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((h) => (
              <li key={h._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                {h.photo?.url && <img src={h.photo.url} alt={h.name} className="size-12 shrink-0 rounded-full object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{h.name}</p>
                    <Badge tone="brand">{label(h.type)}</Badge>
                    {h.isInside ? <Badge tone="green">Inside</Badge> : <Badge>Outside</Badge>}
                    {h.awayToday && <Badge tone="amber">{h.awayToday.kind === 'leave' ? 'On leave today' : 'Absent today'}</Badge>}
                    {h.policeVerification?.status === 'verified' && <Badge tone="green"><BadgeCheck className="mr-0.5 size-3" />Police verified</Badge>}
                    {!h.active && <Badge tone="red">Deactivated</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">
                    {h.phone || 'No phone'} · works at {h.units.map((u) => u.label).join(', ') || '—'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {h.avgRating ? <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" />{h.avgRating} ({h.ratingCount})</span> : <span>No ratings</span>}
                    {isResident && h.myEmployment?.salary > 0 && (
                      <span>{money(h.myEmployment.salary)} due on day {h.myEmployment.dueDay}{h.myEmployment.lastPaidPeriod === currentPeriod() ? ' · paid' : ''}</span>
                    )}
                  </div>
                </div>
                {(isResident || canManage) && (
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Passcode</p>
                    <p className="font-mono text-lg font-semibold tracking-widest text-slate-800">{h.passcode}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(isResident || canManage) && <Button size="sm" variant="secondary" onClick={() => setViewingId(h._id)}>Details</Button>}
                  {isResident && <Button size="sm" variant="ghost" onClick={() => window.confirm(`Remove ${h.name} from your home?`) && remove.mutate(h._id)}>Remove</Button>}
                  {canManage && <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: h._id, active: !h.active })}>{h.active ? 'Deactivate' : 'Activate'}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      <AddHelpModal open={adding} onClose={() => setAdding(false)} />
      {viewing && <HelperModal key={viewing._id} help={viewing} onClose={() => setViewingId(null)} isResident={isResident} canManage={canManage} />}
    </div>
  );
}
