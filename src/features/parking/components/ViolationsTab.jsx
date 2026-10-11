import { useEffect, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Attachments, Badge, Button, Card, CardHeader, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { dateTime, label } from '../../../lib/format';
import { TONES, VIOLATION_STATUSES, VIOLATION_TYPES, violationTypeLabel } from '../constants';
import { useDisputeViolation, useParkingSlots, useReportViolation, useResolveViolation, useViolations } from '../api';

function ReportModal({ onClose }) {
  const { values, bind, set, applyServerErrors } = useForm({ vehicleNumber: '', type: 'wrong_slot', slot: '', location: '', description: '', fine: '' });
  const [photos, setPhotos] = useState([]);
  const [slotSearch, setSlotSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(slotSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [slotSearch]);
  const { data: slots } = useParkingSlots({ search: debounced, limit: 30 });
  const report = useReportViolation({ onSuccess: onClose });
  const save = () =>
    report.mutate(
      {
        vehicleNumber: values.vehicleNumber,
        type: values.type,
        slot: values.slot || undefined,
        location: values.location || undefined,
        description: values.description || undefined,
        fine: values.fine || undefined,
        photos: photos.map((p) => p._id),
      },
      { onError: applyServerErrors },
    );
  return (
    <Modal open onClose={onClose} title="Report a parking violation" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={report.isPending} disabled={!values.vehicleNumber} onClick={save}>Report</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Vehicle number" required placeholder="MH12AB1234" autoCapitalize="characters" {...bind('vehicleNumber')} onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())} />
        <Select label="Type" options={VIOLATION_TYPES} {...bind('type')} />
        <Input label="Find slot (optional)" placeholder="Type slot number" value={slotSearch} onChange={(e) => setSlotSearch(e.target.value)} />
        <Select label="Slot" placeholder="No specific slot" options={(slots?.data || []).map((s) => ({ value: s._id, label: `${s.number}${s.unit ? ` · ${s.unit.label}` : s.pool === 'visitor' ? ' · visitor' : ''}` }))} {...bind('slot')} />
        <Input className="sm:col-span-2" label="Location" placeholder="e.g. Near Tower B ramp" {...bind('location')} />
        <Textarea className="sm:col-span-2" label="Description" rows={3} {...bind('description')} />
        <Input className="sm:col-span-2" label="Fine" placeholder="e.g. ₹500 as per bye-law 12" hint="Shown to the household; billing is raised separately" {...bind('fine')} />
        <FileUpload className="sm:col-span-2" folder="security" files={photos} onChange={setPhotos} max={6} label="Add photos" />
      </div>
    </Modal>
  );
}

function ResolveModal({ violation, onClose }) {
  const [status, setStatus] = useState('resolved');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState();
  const resolve = useResolveViolation({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`Close ${violation.number}`} description={`${violation.vehicleNumber} · ${violationTypeLabel(violation.type)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={resolve.isPending} disabled={resolution.trim().length < 2} onClick={() => resolve.mutate({ id: violation._id, status, resolution }, { onError: (e) => setError(e.fieldErrors?.resolution) })}>Save</Button></>}>
      <div className="space-y-4">
        {violation.disputeNote && (
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
            <p className="font-medium">Resident's dispute</p>
            <p>{violation.disputeNote}</p>
          </div>
        )}
        <Select label="Outcome" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'resolved', label: 'Resolved (violation upheld)' }, { value: 'dismissed', label: 'Dismissed' }]} />
        <Textarea label="Resolution" required rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} error={error} />
      </div>
    </Modal>
  );
}

function DisputeModal({ violation, onClose }) {
  const [note, setNote] = useState('');
  const dispute = useDisputeViolation({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`Dispute ${violation.number}`} description="Tell the management why this is not correct."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={dispute.isPending} disabled={note.trim().length < 3} onClick={() => dispute.mutate({ id: violation._id, note })}>Send</Button></>}>
      <Textarea label="Your note" required rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

export function ViolationRow({ v, actions }) {
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">
            <span className="font-mono">{v.vehicleNumber}</span> · {violationTypeLabel(v.type)}
          </p>
          <p className="text-xs text-slate-500">
            {v.number} · {dateTime(v.createdAt)}
            {v.unit?.label ? ` · ${v.unit.label}` : ' · unregistered vehicle'}
            {v.slot?.number ? ` · slot ${v.slot.number}` : ''}
            {v.location ? ` · ${v.location}` : ''}
          </p>
        </div>
        <Badge tone={TONES[v.status]}>{label(v.status)}</Badge>
      </div>
      {v.description && <p className="text-sm text-slate-700">{v.description}</p>}
      {v.fine && <p className="text-sm font-medium text-amber-700">Fine: {v.fine}</p>}
      <Attachments items={v.photos} />
      {v.disputeNote && <p className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">Dispute: {v.disputeNote}</p>}
      {v.resolution && <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">Resolution: {v.resolution}{v.resolvedBy?.name ? ` — ${v.resolvedBy.name}` : ''}</p>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

export function ViolationsTab({ canReport, canResolve, resident }) {
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });
  const { data, isLoading } = useViolations({ ...filters, limit: 20 });
  const [reporting, setReporting] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [disputing, setDisputing] = useState(null);
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  return (
    <Card>
      <CardHeader
        title={resident ? 'Violations on my vehicles' : 'Parking violations'}
        action={canReport && <Button size="sm" icon={Plus} onClick={() => setReporting(true)}>Report</Button>}
      />
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Select placeholder="All statuses" options={VIOLATION_STATUSES} value={filters.status} onChange={setF('status')} />
        {!resident && <Input placeholder="Search vehicle number" value={filters.search} onChange={setF('search')} />}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !data?.data.length ? (
        <EmptyState icon={AlertTriangle} title="No violations" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((v) => {
            const canClose = canResolve && ['open', 'disputed'].includes(v.status);
            const canDispute = resident && v.status === 'open';
            return (
              <ViolationRow
                key={v._id}
                v={v}
                actions={(canClose || canDispute) && (
                  <>
                    {canClose && <Button size="sm" variant="secondary" onClick={() => setResolving(v)}>Resolve / dismiss</Button>}
                    {canDispute && <Button size="sm" variant="secondary" onClick={() => setDisputing(v)}>Dispute</Button>}
                  </>
                )}
              />
            );
          })}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      {reporting && <ReportModal onClose={() => setReporting(false)} />}
      {resolving && <ResolveModal violation={resolving} onClose={() => setResolving(null)} />}
      {disputing && <DisputeModal violation={disputing} onClose={() => setDisputing(null)} />}
    </Card>
  );
}
