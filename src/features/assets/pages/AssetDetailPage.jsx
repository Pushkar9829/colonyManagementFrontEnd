import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ClipboardList, FilePlus2, Pencil, Plus, QrCode, ShieldCheck, Siren, Wrench, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, CardHeader, ErrorState, FileUpload, Input, Modal, PageLoader, Pagination, Select, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime, label, money, toPaise, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useAddAmcVisit, useAddAssetEvent, useAddAssetFiles, useAmcVisits, useAsset, useAssetStatus, useAssetTimeline, useRemoveAssetFile, useSetAmc } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { QrLabelModal } from '../components/QrLabelModal';
import { CATEGORY_LABELS, COVERAGE, STATUSES, STATUS_TONES } from '../constants';
import { DUE_TONES, clean } from '../shared';
import { useBreakdowns, useSchedules } from '../../maintenance/api';
import { BreakdownDetailModal, ReportBreakdownModal, breakdownTone } from '../../maintenance/components/BreakdownModals';
import { ScheduleModal } from '../../maintenance/components/ScheduleModal';
import { CreateWorkOrderModal } from '../../maintenance/components/WorkOrderModals';
import { FREQUENCIES } from '../../maintenance/constants';

const EVENT_TONES = { breakdown_reported: 'red', breakdown_resolved: 'green', ppm_completed: 'green', ppm_missed: 'amber', amc_visit: 'blue', amc_renewed: 'brand', work_order: 'blue', status_changed: 'amber' };

function AmcModal({ asset, open, onClose, renew }) {
  const a = renew ? {} : asset.amc || {};
  const { values, bind, applyServerErrors } = useForm({
    vendorName: a.vendorName || asset.amc?.vendorName || '',
    contractNumber: a.contractNumber || '',
    startDate: a.startDate || (renew && asset.amc?.endDate ? asset.amc.endDate : todayISO()),
    endDate: a.endDate || '',
    cost: a.cost ? String(a.cost / 100) : '',
    coverage: a.coverage || 'comprehensive',
    visitsPerYear: String(a.visitsPerYear ?? 4),
    contactPhone: a.contactPhone || '',
    notes: a.notes || '',
  });
  const [docs, setDocs] = useState([]);
  const save = useSetAmc({ onSuccess: onClose });
  const submit = () => save.mutate({ id: asset._id, ...clean({ ...values, cost: values.cost ? toPaise(values.cost) : 0, visitsPerYear: Number(values.visitsPerYear || 0) }), renew, documents: docs.map((d) => d._id) }, { onError: applyServerErrors });
  return (
    <Modal open={open} onClose={onClose} title={renew ? 'Renew AMC' : asset.amc ? 'Edit AMC' : 'Add AMC'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Vendor" required {...bind('vendorName')} />
        <Input label="Contract number" {...bind('contractNumber')} />
        <Input label="Start date" type="date" required {...bind('startDate')} />
        <Input label="End date" type="date" required {...bind('endDate')} />
        <Input label="Contract cost (₹)" type="number" min="0" step="0.01" {...bind('cost')} />
        <Select label="Coverage" options={COVERAGE} {...bind('coverage')} />
        <Input label="Visits per year" type="number" min="0" {...bind('visitsPerYear')} />
        <Input label="Vendor phone" {...bind('contactPhone')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
        <FileUpload className="sm:col-span-2" folder="documents" files={docs} onChange={setDocs} label="Attach contract" />
      </div>
    </Modal>
  );
}

function VisitModal({ asset, open, onClose }) {
  const { values, bind, reset, applyServerErrors } = useForm({ date: todayISO(), type: 'preventive', technician: '', findings: '' });
  const [files, setFiles] = useState([]);
  const add = useAddAmcVisit({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Log AMC visit" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={add.isPending} onClick={() => add.mutate({ id: asset._id, ...clean(values), attachments: files.map((f) => f._id) }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Visit date" type="date" {...bind('date')} />
        <Select label="Type" options={[{ value: 'preventive', label: 'Preventive' }, { value: 'breakdown', label: 'Breakdown call' }, { value: 'inspection', label: 'Inspection' }]} {...bind('type')} />
        <Input className="sm:col-span-2" label="Technician" {...bind('technician')} />
        <Textarea className="sm:col-span-2" label="Findings / work done" rows={3} {...bind('findings')} />
        <FileUpload className="sm:col-span-2" folder="facility" files={files} onChange={setFiles} label="Service report" />
      </div>
    </Modal>
  );
}

function EventModal({ asset, open, onClose }) {
  const { values, bind, reset, applyServerErrors } = useForm({ title: '', notes: '', cost: '', date: todayISO() });
  const [files, setFiles] = useState([]);
  const add = useAddAssetEvent({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add to service history" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={add.isPending} onClick={() => add.mutate({ id: asset._id, type: 'service', ...clean({ ...values, cost: values.cost ? toPaise(values.cost) : '' }), attachments: files.map((f) => f._id) }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="What was done" required {...bind('title')} />
        <Input label="Date" type="date" {...bind('date')} />
        <Input label="Cost (₹)" type="number" min="0" step="0.01" {...bind('cost')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
        <FileUpload className="sm:col-span-2" folder="facility" files={files} onChange={setFiles} camera label="Add photo" />
      </div>
    </Modal>
  );
}

function Row({ k, v }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v || '—'}</dd></div>;
}

export default function AssetDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const manager = isManager(user);
  const { data: asset, isLoading, error, refetch } = useAsset(id);
  const [modal, setModal] = useState(null); // edit | qr | amc | renew | visit | event | breakdown | schedule | wo
  const [page, setPage] = useState(1);
  const [breakdownId, setBreakdownId] = useState(null);
  const [woPreset, setWoPreset] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const { data: timeline } = useAssetTimeline(id, page);
  const { data: visits } = useAmcVisits(id, manager);
  const { data: schedules } = useSchedules({ asset: id, limit: 50 }, manager);
  const { data: breakdowns } = useBreakdowns({ asset: id, limit: 10 });
  const status = useAssetStatus();
  const addFiles = useAddAssetFiles({ onSuccess: () => setNewFiles([]) });
  const removeFile = useRemoveAssetFile();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const close = () => setModal(null);

  return (
    <div>
      <Link to="/assets" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" />Assets</Link>
      <PageHeader
        title={asset.name}
        description={`${asset.code}${asset.tag ? ` · tag ${asset.tag}` : ''} · ${CATEGORY_LABELS[asset.category]}${asset.location ? ` · ${asset.location}` : ''}`}
        actions={
          <>
            <Button variant="secondary" icon={QrCode} onClick={() => setModal('qr')}>QR label</Button>
            <Button variant="danger" icon={Siren} onClick={() => setModal('breakdown')}>Report breakdown</Button>
            {manager && <Button variant="secondary" icon={Pencil} onClick={() => setModal('edit')}>Edit</Button>}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" action={manager ? (
              <Select className="w-40" options={STATUSES} value={asset.status} onChange={(e) => status.mutate({ id: asset._id, status: e.target.value })} />
            ) : <Badge tone={STATUS_TONES[asset.status]}>{label(asset.status)}</Badge>} />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
              <Row k="Make" v={asset.make} />
              <Row k="Model" v={asset.model} />
              <Row k="Serial no." v={asset.serialNumber} />
              <Row k="Capacity" v={asset.capacity} />
              <Row k="Purchased" v={asset.purchaseDate ? date(asset.purchaseDate) : null} />
              <Row k="Cost" v={asset.purchaseCost ? money(asset.purchaseCost) : null} />
              <div>
                <dt className="text-xs text-slate-500">Warranty</dt>
                <dd>{asset.warrantyExpiry ? <Badge tone={DUE_TONES[asset.warrantyStatus]}>{asset.warrantyStatus === 'expired' ? 'Expired' : 'Till'} {date(asset.warrantyExpiry)}</Badge> : '—'}</dd>
              </div>
            </dl>
            {asset.notes && <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">{asset.notes}</p>}
          </Card>

          <Card>
            <CardHeader title="Service history" action={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setModal('event')}>Add entry</Button>} />
            <ol className="divide-y divide-slate-100">
              {(timeline?.data || []).map((e) => (
                <li key={e._id} className="flex gap-3 px-5 py-3 text-sm">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${EVENT_TONES[e.type] === 'red' ? 'bg-red-500' : EVENT_TONES[e.type] === 'green' ? 'bg-emerald-500' : EVENT_TONES[e.type] === 'amber' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{e.title}</p>
                    {e.notes && <p className="text-slate-600">{e.notes}</p>}
                    <p className="text-xs text-slate-400">{e.date ? date(e.date) : dateTime(e.createdAt)} · {e.by?.name || 'System'}{e.cost ? ` · ${money(e.cost)}` : ''}</p>
                    {e.attachments?.length > 0 && <div className="mt-2"><Attachments items={e.attachments} /></div>}
                  </div>
                </li>
              ))}
              {!timeline?.data?.length && <li className="px-5 py-6 text-center text-sm text-slate-500">No history yet</li>}
            </ol>
            <Pagination meta={timeline?.meta} onPage={setPage} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="AMC" subtitle={asset.amc ? `${asset.amc.vendorName}${asset.amc.contractNumber ? ` · ${asset.amc.contractNumber}` : ''}` : 'No contract on record'}
              action={manager && <div className="flex gap-1">{asset.amc && <Button size="sm" variant="secondary" onClick={() => setModal('renew')}>Renew</Button>}<Button size="sm" variant="secondary" icon={asset.amc ? Pencil : Plus} onClick={() => setModal('amc')}>{asset.amc ? 'Edit' : 'Add'}</Button></div>} />
            {asset.amc && (
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-slate-400" /><span>{date(asset.amc.startDate)} – {date(asset.amc.endDate)}</span><Badge tone={DUE_TONES[asset.amcStatus]}>{asset.amcStatus === 'expired' ? 'Expired' : asset.amcStatus === 'expiring' ? `${asset.amcDaysLeft} days left` : 'Active'}</Badge></div>
                <p className="text-slate-600">{label(asset.amc.coverage)} · {money(asset.amc.cost)}{asset.amc.contactPhone ? ` · ${asset.amc.contactPhone}` : ''}</p>
                {asset.amcVisits && (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium text-slate-800">Visits: {asset.amcVisits.done} done of {asset.amcVisits.total}</p>
                    <p className={asset.amcVisits.behind ? 'text-amber-700' : 'text-slate-500'}>{asset.amcVisits.dueToDate} due so far{asset.amcVisits.behind ? ` · ${asset.amcVisits.behind} behind` : ''}</p>
                  </div>
                )}
                {asset.amc.documents?.length > 0 && <Attachments items={asset.amc.documents} />}
                {manager && <Button size="sm" variant="secondary" icon={ClipboardList} onClick={() => setModal('visit')}>Log visit</Button>}
                {manager && visits?.length > 0 && (
                  <ul className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    {visits.slice(0, 6).map((v) => <li key={v._id}>{date(v.date)} · {label(v.type)}{v.technician ? ` · ${v.technician}` : ''}{v.findings ? ` — ${v.findings}` : ''}</li>)}
                  </ul>
                )}
              </div>
            )}
          </Card>

          {manager && (
            <Card>
              <CardHeader title="PPM schedules" action={<Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => setModal('schedule')}>Add</Button>} />
              <ul className="divide-y divide-slate-100 text-sm">
                {(schedules?.data || []).map((s) => (
                  <li key={s._id} className="flex items-center justify-between px-5 py-2.5">
                    <span className="font-medium text-slate-800">{s.title}</span>
                    <span className="text-xs text-slate-500">{FREQUENCIES.find((f) => f.value === s.frequency)?.label}{s.frequency === 'every_n_days' ? ` (${s.intervalDays}d)` : ''}{!s.active && ' · paused'}</span>
                  </li>
                ))}
                {!schedules?.data?.length && <li className="px-5 py-4 text-slate-500">No preventive maintenance planned</li>}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Breakdowns" action={manager && <Button size="sm" variant="secondary" icon={Wrench} onClick={() => { setWoPreset({ asset: asset._id, title: '' }); setModal('wo'); }}>Work order</Button>} />
            <ul className="divide-y divide-slate-100 text-sm">
              {(breakdowns?.data || []).map((b) => (
                <li key={b._id}>
                  <button type="button" className="flex w-full items-center justify-between gap-2 px-5 py-2.5 text-left hover:bg-slate-50" onClick={() => setBreakdownId(b._id)}>
                    <span className="min-w-0 truncate"><span className="font-mono text-xs text-slate-500">{b.number}</span> {b.title}</span>
                    <Badge tone={breakdownTone(b.status)}>{label(b.status)}</Badge>
                  </button>
                </li>
              ))}
              {!breakdowns?.data?.length && <li className="px-5 py-4 text-slate-500">None reported</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Photos & documents" />
            <div className="space-y-3 p-5">
              {[...asset.photos.map((f) => ({ ...f, kind: 'photos' })), ...asset.documents.map((f) => ({ ...f, kind: 'documents' }))].length === 0 && <p className="text-sm text-slate-500">Nothing attached</p>}
              <div className="flex flex-wrap gap-2">
                {[...asset.photos.map((f) => ({ ...f, kind: 'photos' })), ...asset.documents.map((f) => ({ ...f, kind: 'documents' }))].map((f) => (
                  <div key={f.url} className="relative">
                    <Attachments items={[f]} />
                    {manager && <button type="button" aria-label="Remove file" className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-500 shadow hover:text-red-600" onClick={() => removeFile.mutate({ id: asset._id, kind: f.kind, url: f.url })}><X className="size-3" /></button>}
                  </div>
                ))}
              </div>
              {manager && (
                <>
                  <FileUpload folder="facility" files={newFiles} onChange={setNewFiles} label="Upload" />
                  {newFiles.length > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" icon={FilePlus2} loading={addFiles.isPending} onClick={() => addFiles.mutate({ id: asset._id, kind: newFiles.every((f) => f.mimetype?.startsWith('image/')) ? 'photos' : 'documents', uploads: newFiles.map((f) => f._id) })}>Save {newFiles.length} file(s)</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AssetFormModal open={modal === 'edit'} onClose={close} asset={asset} />
      <QrLabelModal open={modal === 'qr'} onClose={close} asset={asset} />
      {(modal === 'amc' || modal === 'renew') && <AmcModal open asset={asset} renew={modal === 'renew'} onClose={close} />}
      <VisitModal open={modal === 'visit'} onClose={close} asset={asset} />
      <EventModal open={modal === 'event'} onClose={close} asset={asset} />
      <ReportBreakdownModal open={modal === 'breakdown'} onClose={close} asset={asset} />
      <ScheduleModal open={modal === 'schedule'} onClose={close} assetId={asset._id} />
      <CreateWorkOrderModal open={modal === 'wo'} onClose={close} preset={woPreset} />
      <BreakdownDetailModal id={breakdownId} open={Boolean(breakdownId)} onClose={() => setBreakdownId(null)} onCreateWorkOrder={(b) => { setBreakdownId(null); setWoPreset({ asset: b.asset?._id, breakdown: b._id, title: b.title }); setModal('wo'); }} />
    </div>
  );
}
