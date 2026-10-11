import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ClipboardList, Download, HardHat, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, CardHeader, Checkbox, EmptyState, FileUpload, Input, Modal, PageLoader, Pagination, Select, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime, label, money, toPaise, timeAgo } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { UnitPicker } from '../../units/components/UnitPicker';
import { useDownload } from '../../reports/download';
import {
  HANDOVER_CATEGORIES,
  SNAG_CATEGORIES,
  useAddHandoverItem,
  useCancelPossession,
  useCompletePossession,
  useCreateSnag,
  useDeleteProgress,
  useHandover,
  usePossessions,
  usePostProgress,
  useProgress,
  useRemoveHandoverItem,
  useReopenSnag,
  useSchedulePossession,
  useSignHandover,
  useSignOffSnag,
  useSnag,
  useSnags,
  useSnagSummary,
  useUpdateHandoverItem,
  useUpdatePossession,
  useUpdateSnag,
} from '../api';

const opts = (list) => list.map((v) => ({ value: v, label: label(v) }));
const SNAG_TONES = { open: 'amber', in_progress: 'blue', fixed: 'brand', verified: 'green', reopened: 'red' };

// ---------------- possession ----------------
function ScheduleModal({ onClose }) {
  const [unit, setUnit] = useState('');
  const { values, bind, applyServerErrors, errors } = useForm({ buyerName: '', buyerPhone: '', buyerEmail: '', date: '', startTime: '10:00', endTime: '11:00', notes: '' });
  const create = useSchedulePossession({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Schedule possession" description="The buyer gets an email and (if already a member) an in-app notification."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} disabled={!unit} onClick={() => create.mutate({ unit, ...values, notes: values.notes || undefined }, { onError: applyServerErrors })}>Schedule</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><UnitPicker value={unit} onChange={setUnit} required error={errors.unit} /></div>
        <Input label="Buyer name" required {...bind('buyerName')} />
        <Input label="Buyer phone" {...bind('buyerPhone')} />
        <Input className="sm:col-span-2" label="Buyer email" type="email" {...bind('buyerEmail')} />
        <Input label="Date" type="date" required {...bind('date')} />
        <div className="grid grid-cols-2 gap-2"><Input label="From" type="time" {...bind('startTime')} /><Input label="To" type="time" {...bind('endTime')} /></div>
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
      </div>
    </Modal>
  );
}

function PossessionModal({ p, canManage, onClose }) {
  const update = useUpdatePossession();
  const complete = useCompletePossession({ onSuccess: onClose });
  const cancel = useCancelPossession({ onSuccess: onClose });
  const [current, setCurrent] = useState(p);
  const toggle = (item) =>
    update.mutate({ id: p._id, checklist: [{ _id: item._id, done: !item.done }] }, { onSuccess: (doc) => setCurrent(doc) });
  const editable = canManage && current.status === 'scheduled';
  return (
    <Modal open onClose={onClose} title={`Possession · ${current.unit?.label}`} description={`${current.buyerName} · ${date(current.date)} ${current.startTime}–${current.endTime}`}
      footer={editable && (
        <>
          <Button variant="ghost" loading={cancel.isPending} onClick={() => { const reason = window.prompt('Why is it cancelled?'); if (reason) cancel.mutate({ id: p._id, reason }); }}>Cancel appointment</Button>
          <Button variant="success" icon={CheckCircle2} loading={complete.isPending} onClick={() => complete.mutate({ id: p._id })}>Complete possession</Button>
        </>
      )}>
      <div className="space-y-3 text-sm">
        <StatusBadge status={current.status === 'scheduled' ? 'pending' : current.status === 'completed' ? 'resolved' : 'cancelled'} />
        <ul className="space-y-2">
          {current.checklist.map((c) => (
            <li key={c._id}><Checkbox label={c.item} checked={c.done} disabled={!editable || update.isPending} onChange={() => toggle(c)} /></li>
          ))}
        </ul>
        {current.notes && <p className="whitespace-pre-wrap text-slate-500">{current.notes}</p>}
        {current.completedAt && <p className="text-emerald-700">Completed {dateTime(current.completedAt)}{current.completedBy ? ` by ${current.completedBy.name}` : ''}</p>}
      </div>
    </Modal>
  );
}

function PossessionTab({ canManage }) {
  const [status, setStatus] = useState('scheduled');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const { data, isLoading } = usePossessions({ status: status || undefined, page });
  return (
    <Card>
      <CardHeader title="Possession appointments" action={<div className="flex gap-2"><Select className="w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All" options={opts(['scheduled', 'completed', 'cancelled'])} />{canManage && <Button icon={Plus} onClick={() => setCreating(true)}>Schedule</Button>}</div>} />
      <Table loading={isLoading} rows={data?.data} empty="No appointments" onRowClick={setOpen}
        columns={[
          { key: 'date', header: 'When', render: (p) => <div><p className="font-medium text-slate-900">{date(p.date)}</p><p className="text-xs text-slate-500">{p.startTime}–{p.endTime}</p></div> },
          { key: 'unit', header: 'Unit', render: (p) => p.unit?.label },
          { key: 'buyerName', header: 'Buyer', render: (p) => <div><p>{p.buyerName}</p><p className="text-xs text-slate-500">{p.buyerPhone || p.buyerEmail}</p></div> },
          { key: 'checklist', header: 'Checklist', render: (p) => `${p.checklist.filter((c) => c.done).length}/${p.checklist.length}` },
          { key: 'status', header: 'Status', render: (p) => <Badge tone={p.status === 'completed' ? 'green' : p.status === 'cancelled' ? 'slate' : 'amber'}>{label(p.status)}</Badge> },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {creating && <ScheduleModal onClose={() => setCreating(false)} />}
      {open && <PossessionModal p={open} canManage={canManage} onClose={() => setOpen(null)} />}
    </Card>
  );
}

// ---------------- snags ----------------
function NewSnagModal({ canManage, onClose }) {
  const [unit, setUnit] = useState('');
  const [photos, setPhotos] = useState([]);
  const { values, bind, applyServerErrors } = useForm({ title: '', description: '', category: 'civil', location: '', contractorName: '', contractorPhone: '', targetDate: '' });
  const create = useCreateSnag({ onSuccess: onClose });
  const submit = () =>
    create.mutate(
      {
        unit: canManage ? unit : undefined,
        title: values.title,
        description: values.description || undefined,
        category: values.category,
        location: values.location || undefined,
        targetDate: values.targetDate || undefined,
        photos: photos.length ? photos.map((p) => p._id) : undefined,
        contractor: canManage && values.contractorName ? { name: values.contractorName, phone: values.contractorPhone || undefined } : undefined,
      },
      { onError: applyServerErrors },
    );
  return (
    <Modal open onClose={onClose} title="Record a snag" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} disabled={canManage && !unit} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {canManage && <div className="sm:col-span-2"><UnitPicker value={unit} onChange={setUnit} required /></div>}
        <Input className="sm:col-span-2" label="What is wrong" required placeholder="e.g. Cracked tile near shower" {...bind('title')} />
        <Select label="Category" options={opts(SNAG_CATEGORIES)} {...bind('category')} />
        <Input label="Room / area" placeholder="Master bathroom" {...bind('location')} />
        <Textarea className="sm:col-span-2" label="Details" rows={3} {...bind('description')} />
        {canManage && (
          <>
            <Input label="Contractor" {...bind('contractorName')} />
            <Input label="Contractor phone" {...bind('contractorPhone')} />
            <Input label="Target date" type="date" {...bind('targetDate')} />
          </>
        )}
        <FileUpload className="sm:col-span-2" folder="builder" files={photos} onChange={setPhotos} max={6} label="Photos" />
      </div>
    </Modal>
  );
}

function SnagModal({ id, canManage, onClose }) {
  const { data: s, isLoading } = useSnag(id);
  const update = useUpdateSnag(id);
  const signOff = useSignOffSnag(id);
  const reopen = useReopenSnag(id);
  const [fixPhotos, setFixPhotos] = useState([]);
  const [contractor, setContractor] = useState(null);
  if (isLoading || !s) return <Modal open onClose={onClose} title="Snag"><PageLoader /></Modal>;
  const c = contractor ?? { name: s.contractor?.name || '', phone: s.contractor?.phone || '' };
  const markFixed = () => update.mutate({ status: 'fixed', fixPhotos: fixPhotos.length ? fixPhotos.map((p) => p._id) : undefined }, { onSuccess: () => setFixPhotos([]) });

  return (
    <Modal open onClose={onClose} size="lg" title={`${s.number} · ${s.title}`} description={`${s.unit?.label} · ${label(s.category)}${s.location ? ` · ${s.location}` : ''}`}
      footer={
        <>
          {s.status === 'fixed' && <Button variant="secondary" loading={reopen.isPending} onClick={() => { const note = window.prompt('What is still not right?'); if (note) reopen.mutate({ note }); }}>Not fixed — reopen</Button>}
          {s.status === 'fixed' && <Button variant="success" loading={signOff.isPending} onClick={() => {
            const name = canManage ? window.prompt('Buyer’s name (sign-off recorded on their behalf)') : undefined;
            if (!canManage || name) signOff.mutate({ name: name || undefined });
          }}>Accept & sign off</Button>}
          {canManage && ['open', 'reopened'].includes(s.status) && <Button variant="secondary" loading={update.isPending} onClick={() => update.mutate({ status: 'in_progress' })}>Start work</Button>}
          {canManage && ['open', 'reopened', 'in_progress'].includes(s.status) && <Button loading={update.isPending} onClick={markFixed}>Mark fixed</Button>}
        </>
      }>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2"><Badge tone={SNAG_TONES[s.status]}>{label(s.status)}</Badge>{s.targetDate && <Badge>Target {date(s.targetDate)}</Badge>}</div>
        {s.description && <p className="whitespace-pre-wrap text-slate-700">{s.description}</p>}
        {s.photos.length > 0 && <div><p className="mb-1 text-xs font-medium text-slate-500">Reported</p><Attachments items={s.photos} /></div>}
        {s.fixPhotos.length > 0 && <div><p className="mb-1 text-xs font-medium text-slate-500">After the fix</p><Attachments items={s.fixPhotos} /></div>}
        {canManage && !['verified'].includes(s.status) && (
          <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
            <Input label="Contractor" value={c.name} onChange={(e) => setContractor({ ...c, name: e.target.value })} />
            <Input label="Phone" value={c.phone} onChange={(e) => setContractor({ ...c, phone: e.target.value })} />
            <div className="flex items-end"><Button size="sm" variant="secondary" disabled={!contractor || c.name.length < 2} loading={update.isPending} onClick={() => update.mutate({ contractor: { name: c.name, phone: c.phone || undefined } }, { onSuccess: () => setContractor(null) })}>Assign</Button></div>
            {s.status !== 'fixed' && <FileUpload className="sm:col-span-3" folder="builder" files={fixPhotos} onChange={setFixPhotos} max={6} label="After photos" />}
          </div>
        )}
        {!canManage && s.contractor?.name && <p className="text-slate-500">Contractor: {s.contractor.name}</p>}
        {s.signOff?.at && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Signed off by {s.signOff.name} on {dateTime(s.signOff.at)}{s.signOff.note ? ` — ${s.signOff.note}` : ''}</p>}
        <ul className="space-y-1 text-xs text-slate-500">
          {s.history.map((h) => <li key={`${h.createdAt}-${h.to}`}>{dateTime(h.createdAt)} · {h.by?.name || '—'} · {h.from ? `${label(h.from)} → ` : ''}{label(h.to)}{h.note ? ` — ${h.note}` : ''}</li>)}
        </ul>
      </div>
    </Modal>
  );
}

function SnagsTab({ canManage }) {
  const [f, setF] = useState({ open: 'true', status: '', category: '', page: 1 });
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = useSnags(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')));
  const { data: summary } = useSnagSummary();
  return (
    <div className="space-y-6">
      {canManage && summary?.length > 0 && (
        <Card>
          <CardHeader title="Snags by unit" subtitle="Units with open snags first" />
          <div className="flex flex-wrap gap-2 p-4">
            {summary.slice(0, 40).map((r) => (
              <span key={r.unit._id} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-slate-800">{r.unit.label}</span> · {r.open} open · {r.verified}/{r.total} signed off
              </span>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <CardHeader title={canManage ? 'Snag list' : 'Snags in my home'} action={<Button icon={Plus} onClick={() => setCreating(true)}>Add snag</Button>} />
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <Select value={f.status || (f.open ? 'open_all' : '')} onChange={(e) => setF({ ...f, open: e.target.value === 'open_all' ? 'true' : '', status: e.target.value === 'open_all' ? '' : e.target.value, page: 1 })} placeholder="All snags"
            options={[{ value: 'open_all', label: 'Still open' }, ...opts(['open', 'in_progress', 'fixed', 'verified', 'reopened'])]} />
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, page: 1 })} placeholder="Any category" options={opts(SNAG_CATEGORIES)} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No snags" onRowClick={(s) => setOpenId(s._id)}
          columns={[
            { key: 'title', header: 'Snag', render: (s) => <div><p className="font-medium text-slate-900">{s.title}</p><p className="text-xs text-slate-500">{s.number} · {label(s.category)}{s.location ? ` · ${s.location}` : ''}</p></div> },
            { key: 'unit', header: 'Unit', render: (s) => s.unit?.label },
            { key: 'contractor', header: 'Contractor', render: (s) => s.contractor?.name || '—' },
            { key: 'status', header: 'Status', render: (s) => <Badge tone={SNAG_TONES[s.status]}>{label(s.status)}</Badge> },
            { key: 'createdAt', header: 'Raised', render: (s) => timeAgo(s.createdAt) },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setF({ ...f, page })} />
      </Card>
      {creating && <NewSnagModal canManage={canManage} onClose={() => setCreating(false)} />}
      {openId && <SnagModal id={openId} canManage={canManage} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ---------------- progress ----------------
function ProgressTab({ canManage }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProgress({ page });
  const [photos, setPhotos] = useState([]);
  const { values, bind, reset, applyServerErrors } = useForm({ title: '', body: '', tower: '', milestone: '', percentComplete: '' });
  const post = usePostProgress({ onSuccess: () => { reset(); setPhotos([]); } });
  const remove = useDeleteProgress();
  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader title="Post a construction update" subtitle="Visible to all buyers and members" />
          <div className="grid gap-3 p-5 sm:grid-cols-4">
            <Input className="sm:col-span-4" label="Title" required {...bind('title')} />
            <Input label="Tower / block" {...bind('tower')} />
            <Input label="Milestone" placeholder="Slab casting" {...bind('milestone')} />
            <Input label="% complete" type="number" min={0} max={100} {...bind('percentComplete')} />
            <Textarea className="sm:col-span-4" label="Details" rows={3} {...bind('body')} />
            <FileUpload className="sm:col-span-3" folder="builder" files={photos} onChange={setPhotos} max={10} label="Site photos" />
            <div className="flex items-end sm:justify-end">
              <Button loading={post.isPending} onClick={() => post.mutate({ title: values.title, body: values.body || undefined, tower: values.tower || undefined, milestone: values.milestone || undefined, percentComplete: values.percentComplete === '' ? undefined : Number(values.percentComplete), photos: photos.length ? photos.map((p) => p._id) : undefined }, { onError: applyServerErrors })}>Post</Button>
            </div>
          </div>
        </Card>
      )}
      {isLoading ? <PageLoader /> : !data?.data?.length ? <Card><EmptyState icon={HardHat} title="No construction updates yet" /></Card> : (
        <ul className="space-y-4">
          {data.data.map((u) => (
            <li key={u._id}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{u.title}</h3>
                    <p className="text-xs text-slate-500">{[u.tower, u.milestone].filter(Boolean).join(' · ')}{u.tower || u.milestone ? ' · ' : ''}{dateTime(u.createdAt)} · {u.postedBy?.name}</p>
                  </div>
                  {canManage && <button type="button" className="text-slate-400 hover:text-red-600" aria-label="Delete update" onClick={() => window.confirm('Delete this update?') && remove.mutate(u._id)}><Trash2 className="size-4" /></button>}
                </div>
                {u.percentComplete !== undefined && u.percentComplete !== null && (
                  <div className="mt-3"><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${u.percentComplete}%` }} /></div><p className="mt-1 text-xs text-slate-500">{u.percentComplete}% complete</p></div>
                )}
                {u.body && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{u.body}</p>}
                {u.photos?.length > 0 && <div className="mt-3"><Attachments items={u.photos} /></div>}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </div>
  );
}

// ---------------- handover ----------------
function HandoverTab({ isBuilder }) {
  const { data: h, isLoading } = useHandover();
  const update = useUpdateHandoverItem();
  const remove = useRemoveHandoverItem();
  const sign = useSignHandover();
  const [adding, setAdding] = useState(false);
  const { download, busyKey } = useDownload();
  const { values, bind, reset } = useForm({ category: 'documents', title: '', details: '', amount: '' });
  const add = useAddHandoverItem({ onSuccess: () => { reset(); setAdding(false); } });
  if (isLoading || !h) return <PageLoader />;
  const done = h.status === 'completed';
  const doSign = (side) => {
    const name = window.prompt(side === 'builder' ? 'Sign for the builder as (name):' : 'Sign for the association as (name):');
    if (name) sign.mutate({ side, name });
  };
  const setStatus = (item, status) => {
    const reference = status === 'transferred' && !item.reference ? window.prompt('Reference (document no., cheque / UTR) — optional') : undefined;
    update.mutate({ id: item._id, status, ...(reference ? { reference } : {}) });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Handover to the association" subtitle={`${h.progress.transferred} of ${h.progress.total} items transferred · ${label(h.status)}`}
          action={<Button variant="secondary" icon={Download} loading={busyKey === 'handover'} onClick={() => download('/builder/handover/pdf', null, 'handover.pdf', 'handover')}>PDF</Button>} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {[['builder', 'For the builder', h.builderSignOff], ['association', 'For the association', h.associationSignOff]].map(([side, title, s]) => (
            <div key={side} className="rounded-lg border border-slate-200 p-4 text-sm">
              <p className="font-medium text-slate-800">{title}</p>
              {s?.at ? <p className="mt-1 text-emerald-700">Signed by {s.name}{s.designation ? ` (${s.designation})` : ''} · {dateTime(s.at)}</p> : (
                <>
                  <p className="mt-1 text-slate-500">Not signed</p>
                  {!done && ((side === 'builder') === isBuilder) && <Button className="mt-2" size="sm" loading={sign.isPending} onClick={() => doSign(side)}>Sign</Button>}
                </>
              )}
            </div>
          ))}
          <p className="text-xs text-slate-500 sm:col-span-2">Both sides sign the same list. Changing any item after a signature clears both signatures. Builder staff have the designation “Builder”; the association signs through one of its own admins.</p>
        </div>
      </Card>
      {HANDOVER_CATEGORIES.map((cat) => {
        const items = h.items.filter((i) => i.category === cat);
        if (!items.length) return null;
        return (
          <Card key={cat}>
            <CardHeader title={label(cat)} />
            <ul className="divide-y divide-slate-100">
              {items.map((i) => (
                <li key={i._id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-slate-800">{i.title}</p>
                    <p className="text-xs text-slate-500">{[i.amount ? money(i.amount) : null, i.reference ? `ref ${i.reference}` : null, i.transferredAt ? `transferred ${date(i.transferredAt)}` : null, i.details].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Select className="w-44" disabled={done || update.isPending} value={i.status} onChange={(e) => setStatus(i, e.target.value)} options={opts(['pending', 'transferred', 'not_applicable'])} />
                    {!done && <button type="button" className="text-slate-400 hover:text-red-600" aria-label="Remove item" onClick={() => window.confirm(`Remove “${i.title}”?`) && remove.mutate(i._id)}><Trash2 className="size-4" /></button>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
      {!done && (adding ? (
        <Card className="grid gap-3 p-5 sm:grid-cols-4">
          <Select label="Category" options={opts(HANDOVER_CATEGORIES)} {...bind('category')} />
          <Input className="sm:col-span-2" label="Item" required {...bind('title')} />
          <Input label="Amount (₹, funds)" type="number" min={0} {...bind('amount')} />
          <Input className="sm:col-span-4" label="Details" {...bind('details')} />
          <div className="flex gap-2 sm:col-span-4"><Button loading={add.isPending} onClick={() => add.mutate({ category: values.category, title: values.title, details: values.details || undefined, amount: values.amount ? toPaise(values.amount) : undefined })}>Add item</Button><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
        </Card>
      ) : <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)}>Add item</Button>)}
    </div>
  );
}

export default function BuilderPage() {
  const { user } = useAuth();
  const canManage = user.role === ROLES.ADMIN;
  const isBuilder = canManage && /builder|developer/i.test(user.designation || '');
  const [params, setParams] = useSearchParams();
  const tabs = [
    { value: 'possession', label: 'Possession' },
    { value: 'snags', label: 'Snags' },
    { value: 'progress', label: 'Construction updates' },
    ...(canManage ? [{ value: 'handover', label: 'Handover' }] : []),
  ];
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : user.role === ROLES.RESIDENT ? 'progress' : 'possession';
  // Probe once to show a clear message when the module is not enabled for this society.
  const probe = useProgress({ page: 1, limit: 1 });

  if (probe.error?.code === 'FEATURE_DISABLED') {
    return (
      <div>
        <PageHeader title="Builder handover" />
        <Card><EmptyState icon={HardHat} title="Builder handover is not enabled" description="This module is for new projects before handover. Ask ColonyHub support to switch it on for your society." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Builder handover" description={canManage ? 'Possession scheduling, snag lists, construction updates and the handover to the residents’ association.' : 'Your possession appointment, snags in your home and construction updates.'} />
      <Tabs className="mb-6 w-fit" value={tab} onChange={(v) => setParams({ tab: v })} tabs={tabs.map((t) => ({ ...t, label: t.value === 'possession' ? <span className="inline-flex items-center gap-1"><CalendarClock className="size-4" />{t.label}</span> : t.value === 'snags' ? <span className="inline-flex items-center gap-1"><ClipboardList className="size-4" />{t.label}</span> : t.label }))} />
      {tab === 'possession' && <PossessionTab canManage={canManage} />}
      {tab === 'snags' && <SnagsTab canManage={canManage} />}
      {tab === 'progress' && <ProgressTab canManage={canManage} />}
      {tab === 'handover' && canManage && <HandoverTab isBuilder={isBuilder} />}
    </div>
  );
}
