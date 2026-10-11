import { useEffect, useState } from 'react';
import { Attachments, Badge, Button, Checkbox, FileUpload, Input, Modal, Select, Spinner, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { dateTime, label, money, toPaise } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useAssets } from '../../assets/api';
import { clean, usePeople } from '../../assets/shared';
import { useAssignBreakdown, useBreakdown, useBreakdownStatus, useCreateBreakdown } from '../api';
import { PRIORITIES } from '../constants';

const BD_TONES = { open: 'amber', in_progress: 'blue', resolved: 'green', closed: 'slate' };
export const breakdownTone = (s) => BD_TONES[s] || 'slate';

// Report an equipment failure. `asset` fixes the asset (from its page); otherwise pick one.
export function ReportBreakdownModal({ open, onClose, asset }) {
  const { user } = useAuth();
  const manager = isManager(user);
  const { values, bind, set, reset, applyServerErrors } = useForm({ asset: '', title: '', description: '', priority: 'high', complaint: '', assignedTo: '', markUnderRepair: true });
  const [files, setFiles] = useState([]);
  const { data: assets } = useAssets({ limit: 100 }, open && !asset);
  const { data: people } = usePeople(['staff', 'facility_manager'], open && manager);
  const create = useCreateBreakdown({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  useEffect(() => { if (!open) setFiles([]); }, [open]);

  const submit = () =>
    create.mutate(clean({ ...values, asset: asset?._id || values.asset, attachments: files.length ? files.map((f) => f._id) : undefined, markUnderRepair: values.markUnderRepair }), { onError: applyServerErrors });

  return (
    <Modal open={open} onClose={onClose} title="Report breakdown" description={asset ? `${asset.name} (${asset.code})` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={create.isPending} onClick={submit}>Report</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!asset && <Select className="sm:col-span-2" label="Asset" required placeholder="Choose asset" options={(assets?.data || []).map((a) => ({ value: a._id, label: `${a.code} · ${a.name}` }))} {...bind('asset')} />}
        <Input className="sm:col-span-2" label="What happened?" required placeholder="e.g. Lift stuck between floors" {...bind('title')} />
        <Select label="Priority" options={PRIORITIES} {...bind('priority')} />
        {manager && <Select label="Assign to" placeholder="Later" options={people || []} {...bind('assignedTo')} />}
        <Textarea className="sm:col-span-2" label="Details" rows={3} {...bind('description')} />
        {manager && <Input className="sm:col-span-2" label="Helpdesk complaint id (optional)" hint="Links the breakdown to the resident's complaint" {...bind('complaint')} />}
        <Checkbox className="sm:col-span-2" label="Mark the asset as under repair" checked={values.markUnderRepair} onChange={(e) => set('markUnderRepair', e.target.checked)} />
        <FileUpload className="sm:col-span-2" folder="facility" files={files} onChange={setFiles} label="Add photos" />
      </div>
    </Modal>
  );
}

// Breakdown detail with assign / progress / resolve actions.
export function BreakdownDetailModal({ id, open, onClose, onCreateWorkOrder }) {
  const { user } = useAuth();
  const manager = isManager(user);
  const { data: b, isLoading } = useBreakdown(open ? id : null);
  const { data: people } = usePeople(['staff', 'facility_manager'], open && manager);
  const [resolution, setResolution] = useState('');
  const [cost, setCost] = useState('');
  const [files, setFiles] = useState([]);
  const assign = useAssignBreakdown();
  const status = useBreakdownStatus({ onSuccess: () => { setResolution(''); setCost(''); setFiles([]); } });

  return (
    <Modal open={open} onClose={onClose} title={b ? `${b.number} · ${b.title}` : 'Breakdown'} size="lg" footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {isLoading || !b ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={breakdownTone(b.status)}>{label(b.status)}</Badge>
            <Badge tone={b.priority === 'urgent' ? 'red' : b.priority === 'high' ? 'amber' : 'slate'}>{label(b.priority)}</Badge>
            <span className="text-slate-500">{b.asset?.name} ({b.asset?.code}) · reported {dateTime(b.createdAt)} by {b.reportedBy?.name}</span>
          </div>
          {b.description && <p className="text-slate-700">{b.description}</p>}
          {b.complaint && <p className="text-slate-500">Helpdesk: {b.complaint.ticketNumber} · {b.complaint.title}</p>}
          {b.workOrder && <p className="text-slate-500">Work order {b.workOrder.number} ({label(b.workOrder.status)})</p>}
          <Attachments items={b.attachments} />
          {b.resolution && <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800"><p className="font-medium">Resolution</p><p>{b.resolution}{b.cost ? ` · ${money(b.cost)}` : ''}</p></div>}

          {manager && ['open', 'in_progress'].includes(b.status) && (
            <div className="flex flex-wrap items-end gap-2">
              <Select className="min-w-48 flex-1" label="Assigned to" placeholder="Unassigned" options={people || []} value={b.assignedTo?._id || ''} onChange={(e) => e.target.value && assign.mutate({ id: b._id, assignedTo: e.target.value })} />
              {!b.workOrder && onCreateWorkOrder && <Button variant="secondary" onClick={() => onCreateWorkOrder(b)}>Create work order</Button>}
            </div>
          )}
          {b.status === 'open' && <Button variant="secondary" loading={status.isPending} onClick={() => status.mutate({ id: b._id, status: 'in_progress' })}>Start work</Button>}
          {['open', 'in_progress'].includes(b.status) && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-800">Resolve</p>
              <Textarea label="What was done" rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} />
              <Input label="Cost (₹)" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
              <FileUpload folder="facility" files={files} onChange={setFiles} camera label="Add photo" />
              <Button variant="success" loading={status.isPending} disabled={!resolution.trim()} onClick={() => status.mutate({ id: b._id, status: 'resolved', resolution, cost: cost ? toPaise(cost) : undefined, attachments: files.map((f) => f._id) })}>Mark resolved</Button>
            </div>
          )}
          {manager && b.status === 'resolved' && (
            <div className="flex gap-2">
              <Button loading={status.isPending} onClick={() => status.mutate({ id: b._id, status: 'closed' })}>Close</Button>
              <Button variant="secondary" loading={status.isPending} onClick={() => status.mutate({ id: b._id, status: 'in_progress' })}>Reopen</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
