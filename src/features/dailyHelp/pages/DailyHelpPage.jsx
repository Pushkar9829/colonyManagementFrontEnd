import { useCurrentGate } from '../../gates/useCurrentGate';
import { useState } from 'react';
import { BadgeCheck, CalendarOff, FileText, IndianRupee, LogIn, LogOut, Plus, Star, UserCheck } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Checkbox, Card, EmptyState, FileUpload, FilterBar, Input, Modal, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { currentPeriod, date as fmtDate, dateTime, label, money, time, toPaise, toRupees, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { GateMultiSelect } from '../../gates/components/GateMultiSelect';
import { useT } from '../../../context/LanguageContext';
import {
  useAddLeave,
  useCreateHelp,
  useDailyHelp,
  useGateScan,
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
  const { t } = useT();
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={t('{n} stars', { n })}>
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
  const { t } = useT();
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!data?.data.length) return <EmptyState title="No visits recorded yet" />;
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {data.data.map((a) => (
        <li key={a._id} className="flex justify-between py-2">
          <span className="text-slate-700">{dateTime(a.inAt)}{a.inGateName ? ` · ${a.inGateName}` : ''}</span>
          <span className="text-right text-slate-500">{a.outAt ? `${t('left {time}', { time: time(a.outAt) })}${a.outGateName && a.outGateName !== a.inGateName ? ` · ${a.outGateName}` : ''}` : t('still inside')}</span>
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
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Stars value={help.avgRating} size="size-5" />
        <span className="text-sm text-slate-600">{help.avgRating ? (help.ratingCount === 1 ? t('{rating} / 5 from {count} home', { rating: help.avgRating, count: help.ratingCount }) : t('{rating} / 5 from {count} homes', { rating: help.avgRating, count: help.ratingCount })) : t('No ratings yet')}</span>
      </div>
      {canRate && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">{help.myReview ? t('Your review') : t('Rate this helper')}</p>
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
  const { t } = useT();
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t('Only your home sees this. We remind you on the due day every month until you mark it paid.')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Monthly salary (₹)" type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
        <Input label="Due on day" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} hint="1–28" />
      </div>
      <Checkbox label="Remind me when salary is due" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ id: help._id, salary: toPaise(salary), dueDay: Number(dueDay), remindersOn })}>Save</Button>
        {job && (paidThisMonth ? <Badge tone="green">{t('Paid for this month')}</Badge> : <Button size="sm" variant="success" icon={IndianRupee} loading={paid.isPending} onClick={() => paid.mutate(help._id)}>{t('Mark {amount} paid', { amount: money(job.salary) })}</Button>)}
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
  const { t } = useT();
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
                <p className="font-medium text-slate-700">{fmtDate(l.date)} · {l.kind === 'leave' ? t('On leave') : t('Absent')}</p>
                <p className="text-xs text-slate-500">{l.source === 'auto' ? t('No gate entry by noon') : `${l.unit?.label || ''}${l.reason ? ` · ${l.reason}` : ''}`}</p>
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
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">{t('Police verification:')}</span>
        <Badge tone={VERIFY_TONES[pv.status]}>{t(label(pv.status))}</Badge>
        {pv.notes && <span className="text-xs text-slate-500">{pv.notes}</span>}
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-2">
          {['verified', 'rejected'].map((s) => (
            <Button key={s} size="sm" variant={s === 'verified' ? 'success' : 'secondary'} onClick={() => { const notes = window.prompt(t('Notes (optional)')) ?? undefined; verify.mutate({ id: help._id, status: s, notes: notes || undefined }); }}>{s === 'verified' ? t('Mark verified') : t('Mark rejected')}</Button>
          ))}
        </div>
      )}
      {help.documents?.length ? (
        <ul className="space-y-3">
          {help.documents.map((d) => (
            <li key={d._id}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t(label(d.kind))} · {fmtDate(d.createdAt)}</p>
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

// Management decides which gates a helper may come in by (e.g. the service gate only).
function GatesTab({ help }) {
  const [gates, setGates] = useState(() => (help.allowedGates || []).map((g) => g._id || g));
  const update = useUpdateHelp();
  const { t } = useT();
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t('The guard is told to send {name} to an allowed gate when they arrive at another one. Leaving is possible by any gate.', { name: help.name })}</p>
      <GateMultiSelect label="May enter by" value={gates} onChange={setGates} anyLabel="Any staff gate" />
      <Button size="sm" loading={update.isPending} onClick={() => update.mutate({ id: help._id, allowedGates: gates })}>Save</Button>
    </div>
  );
}

function HelperModal({ help, onClose, isResident, canManage }) {
  const [tab, setTab] = useState('attendance');
  const { t } = useT();
  const tabs = [
    { value: 'attendance', label: 'Attendance' },
    { value: 'reviews', label: 'Reviews' },
    ...(isResident ? [{ value: 'salary', label: 'Salary' }] : []),
    { value: 'leave', label: 'Leave' },
    { value: 'documents', label: 'Documents' },
    ...(canManage ? [{ value: 'gates', label: 'Gates' }] : []),
  ];
  return (
    <Modal open onClose={onClose} title={help.name} description={`${t(label(help.type))}${help.phone ? ` · ${help.phone}` : ''}`} size="lg">
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'attendance' && <AttendanceTab help={help} />}
      {tab === 'reviews' && <ReviewsTab help={help} canRate={isResident} />}
      {tab === 'salary' && <SalaryTab help={help} />}
      {tab === 'leave' && <LeaveTab help={help} canMark={isResident} />}
      {tab === 'documents' && <DocumentsTab help={help} canManage={canManage} />}
      {tab === 'gates' && <GatesTab help={help} />}
    </Modal>
  );
}

export default function DailyHelpPage() {
  const { user } = useAuth();
  const { t } = useT();
  const isResident = user.role === ROLES.RESIDENT;
  const canManage = ['admin', 'facility_manager'].includes(user.role);
  const [filters, setFilters] = useState({ search: '', type: '', page: 1 });
  const [adding, setAdding] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const { data, isLoading } = useDailyHelp({ search: filters.search || undefined, type: filters.type || undefined, page: filters.page });
  const remove = useRemoveHelpFromUnit();
  const update = useUpdateHelp();
  // Guards mark helpers in / out from the list (the same toggle as typing their gate code).
  const canMarkGate = [ROLES.GUARD, ROLES.ADMIN].includes(user.role);
  const gateScan = useGateScan();
  // Guards record the entry at the gate they are standing at (chosen in the gate console).
  const { gate: currentGate } = useCurrentGate();
  const viewing = data?.data.find((h) => h._id === viewingId);

  return (
    <div>
      <PageHeader
        title="Daily help"
        description={isResident ? 'Each helper gets a 6-digit gate code. Tap a helper to see and share it.' : user.role === ROLES.GUARD ? 'Tap Mark in / Mark out as a helper passes the gate.' : 'All domestic staff registered in the colony.'}
        actions={(isResident || canManage) && <Button icon={Plus} onClick={() => setAdding(true)}>Add helper</Button>}
      />
      <Card>
        <FilterBar cols={2} active={filters.type ? 1 : 0} search={<Input aria-label="Search" placeholder="Search name or phone" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />}>
          <Select label="Role" placeholder="All roles" options={TYPES} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))} />
        </FilterBar>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
          <EmptyState icon={UserCheck} title="No helpers yet"
            description={isResident && !filters.search && !filters.type ? 'Add the people who work at your home so the gate can let them in with their code.' : undefined}
            action={isResident && !filters.search && !filters.type ? <Button icon={Plus} onClick={() => setAdding(true)}>Add your maid, cook or driver</Button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((h) => (
              <li key={h._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                {h.photo?.url && <img src={h.photo.url} alt={h.name} className="size-12 shrink-0 rounded-full object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{h.name}</p>
                    <Badge tone="brand">{t(label(h.type))}</Badge>
                    {h.isInside ? <Badge tone="green">{t('Inside')}</Badge> : <Badge>{t('Outside')}</Badge>}
                    {h.awayToday && <Badge tone="amber">{h.awayToday.kind === 'leave' ? t('On leave today') : t('Absent today')}</Badge>}
                    {h.policeVerification?.status === 'verified' && <Badge tone="green"><BadgeCheck className="mr-0.5 size-3" />{t('Police verified')}</Badge>}
                    {!h.active && <Badge tone="red">{t('Deactivated')}</Badge>}
                    {h.allowedGates?.length > 0 && <Badge tone="blue">{t('Only at {gates}', { gates: h.allowedGates.map((g) => g.name).join(' / ') })}</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">
                    {h.phone || t('No phone')} · {t('works at {units}', { units: h.units.map((u) => u.label).join(', ') || '—' })}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {h.avgRating ? <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" />{h.avgRating} ({h.ratingCount})</span> : <span>{t('No ratings')}</span>}
                    {isResident && h.myEmployment?.salary > 0 && (
                      <span>{t('{amount} due on day {day}', { amount: money(h.myEmployment.salary), day: h.myEmployment.dueDay })}{h.myEmployment.lastPaidPeriod === currentPeriod() ? ` · ${t('paid')}` : ''}</span>
                    )}
                  </div>
                </div>
                {(isResident || canManage) && (
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{t('Gate code')}</p>
                    <p className="font-mono text-lg font-semibold tracking-widest text-slate-800">{h.passcode}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {canMarkGate && h.active && (
                    <Button size="lg" variant={h.isInside ? 'secondary' : 'success'} icon={h.isInside ? LogOut : LogIn} className="w-full sm:w-auto"
                      loading={gateScan.isPending && (gateScan.variables?.passcode ?? gateScan.variables) === h.passcode} onClick={() => gateScan.mutate(currentGate?._id ? { passcode: h.passcode, gateId: currentGate._id } : h.passcode)}>
                      {h.isInside ? 'Mark out' : 'Mark in'}
                    </Button>
                  )}
                  {(isResident || canManage) && <Button size="sm" variant="secondary" onClick={() => setViewingId(h._id)}>Details</Button>}
                  {isResident && <Button size="sm" variant="ghost" onClick={() => window.confirm(t('Remove {name} from your home?', { name: h.name })) && remove.mutate(h._id)}>Remove</Button>}
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
