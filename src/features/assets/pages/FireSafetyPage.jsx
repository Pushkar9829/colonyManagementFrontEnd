import { useState } from 'react';
import { FileBadge, FireExtinguisher, Plus, RefreshCcw, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, FileUpload, Input, Modal, Pagination, Select, StatCard, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useCreateDrill, useCreateExtinguisher, useCreateNoc, useDrills, useExtinguishers, useFireSummary, useNocs, useRefillExtinguisher, useUpdateExtinguisher } from '../api';
import { EXTINGUISHER_TYPES } from '../constants';
import { DUE_TONES, clean } from '../shared';

const STATE_TEXT = { ok: 'OK', due_soon: 'Due soon', overdue: 'Overdue', none: '—' };

function ExtinguisherModal({ open, onClose }) {
  const { values, bind, reset, applyServerErrors } = useForm({ location: '', type: 'abc_powder', capacityKg: '', installedOn: '', lastRefillDate: '', nextRefillDue: '', expiryDate: '', notes: '' });
  const create = useCreateExtinguisher({ onSuccess: () => { reset(); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add fire extinguisher" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate(clean(values), { onError: applyServerErrors })}>Add</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Location" required placeholder="Tower A, 3rd floor lobby" {...bind('location')} />
        <Select label="Type" options={EXTINGUISHER_TYPES} {...bind('type')} />
        <Input label="Capacity (kg)" type="number" min="0" step="0.5" {...bind('capacityKg')} />
        <Input label="Installed on" type="date" {...bind('installedOn')} />
        <Input label="Last refill" type="date" {...bind('lastRefillDate')} />
        <Input label="Next refill due" type="date" {...bind('nextRefillDue')} />
        <Input label="Cylinder expiry / hydro test" type="date" {...bind('expiryDate')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
      </div>
    </Modal>
  );
}

function RefillModal({ item, onClose }) {
  const { values, bind, applyServerErrors } = useForm({ lastRefillDate: todayISO(), nextRefillDue: '', expiryDate: item?.expiryDate || '' });
  const refill = useRefillExtinguisher({ onSuccess: onClose });
  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Refill ${item?.code}`} description={item?.location} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={refill.isPending} onClick={() => refill.mutate({ id: item._id, ...clean(values) }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Refilled on" type="date" {...bind('lastRefillDate')} />
        <Input label="Next refill due" type="date" required {...bind('nextRefillDue')} />
        <Input label="Cylinder expiry" type="date" {...bind('expiryDate')} />
      </div>
    </Modal>
  );
}

function DrillModal({ open, onClose }) {
  const { values, bind, reset, applyServerErrors } = useForm({ date: todayISO(), time: '', scenario: '', conductedBy: '', attendance: '', evacuationMinutes: '', notes: '' });
  const [files, setFiles] = useState([]);
  const create = useCreateDrill({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Log fire drill" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...clean(values), attachments: files.map((f) => f._id) }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date" type="date" {...bind('date')} />
        <Input label="Time" type="time" {...bind('time')} />
        <Input className="sm:col-span-2" label="Scenario" placeholder="e.g. Kitchen fire, Tower B 5th floor" {...bind('scenario')} />
        <Input label="Conducted by" {...bind('conductedBy')} />
        <Input label="People attended" type="number" min="0" {...bind('attendance')} />
        <Input label="Evacuation time (minutes)" type="number" min="0" step="0.5" {...bind('evacuationMinutes')} />
        <Textarea className="sm:col-span-2" label="Observations" rows={3} {...bind('notes')} />
        <FileUpload className="sm:col-span-2" folder="facility" files={files} onChange={setFiles} label="Photos / attendance sheet" />
      </div>
    </Modal>
  );
}

function NocModal({ open, onClose }) {
  const { values, bind, reset, applyServerErrors } = useForm({ number: '', issuedBy: '', issueDate: '', expiryDate: '', notes: '' });
  const [files, setFiles] = useState([]);
  const create = useCreateNoc({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add fire NOC" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...clean(values), documents: files.map((f) => f._id) }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="NOC number" required {...bind('number')} />
        <Input label="Issued by" placeholder="Fire department" {...bind('issuedBy')} />
        <Input label="Issue date" type="date" {...bind('issueDate')} />
        <Input label="Valid till" type="date" required {...bind('expiryDate')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
        <FileUpload className="sm:col-span-2" folder="documents" files={files} onChange={setFiles} label="Attach certificate" />
      </div>
    </Modal>
  );
}

export default function FireSafetyPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [tab, setTab] = useState('extinguishers');
  const [modal, setModal] = useState(null);
  const [refill, setRefill] = useState(null);
  const [due, setDue] = useState('');
  const [page, setPage] = useState(1);
  const { data: summary } = useFireSummary();
  const ext = useExtinguishers({ page, ...(due !== '' && { dueWithin: due }) });
  const drills = useDrills({ page });
  const nocs = useNocs(manager && tab === 'noc');
  const update = useUpdateExtinguisher();

  return (
    <div>
      <PageHeader
        title="Fire safety"
        description="Extinguisher register, drills and fire NOC — reminders go out 30, 7 and 1 day before anything expires."
        actions={manager && (
          <>
            {tab === 'extinguishers' && <Button icon={Plus} onClick={() => setModal('ext')}>Add extinguisher</Button>}
            {tab === 'drills' && <Button icon={Plus} onClick={() => setModal('drill')}>Log drill</Button>}
            {tab === 'noc' && <Button icon={Plus} onClick={() => setModal('noc')}>Add NOC</Button>}
          </>
        )}
      />
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FireExtinguisher} label="Extinguishers" value={summary.extinguishers} />
          <StatCard icon={RefreshCcw} tone={summary.overdue ? 'red' : 'amber'} label="Refill due / overdue" value={`${summary.refillDue} / ${summary.overdue}`} />
          <StatCard icon={Users} tone="sky" label="Last drill" value={summary.lastDrill ? date(summary.lastDrill.date) : 'None'} sub={summary.lastDrill ? `${summary.lastDrill.attendance} attended` : undefined} />
          <StatCard icon={FileBadge} tone={summary.noc ? (summary.noc.state === 'ok' ? 'green' : 'red') : 'slate'} label="Fire NOC" value={summary.noc ? date(summary.noc.expiryDate) : 'Not recorded'} sub={summary.noc ? (summary.noc.daysLeft < 0 ? 'Expired' : `${summary.noc.daysLeft} days left`) : undefined} />
        </div>
      )}
      <Tabs className="mb-4" value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ value: 'extinguishers', label: 'Extinguishers' }, { value: 'drills', label: 'Drills' }, ...(manager ? [{ value: 'noc', label: 'NOC' }] : [])]} />
      <Card>
        {tab === 'extinguishers' && (
          <>
            <div className="border-b border-slate-100 p-4 sm:w-64">
              <Select placeholder="All" options={[{ value: '0', label: 'Overdue' }, { value: '30', label: 'Due in 30 days' }]} value={due} onChange={(e) => { setDue(e.target.value); setPage(1); }} />
            </div>
            <Table loading={ext.isLoading} rows={ext.data?.data} empty="No extinguishers registered"
              columns={[
                { key: 'code', header: 'Code', render: (e) => <span className="font-mono text-xs font-semibold">{e.code}</span> },
                { key: 'location', header: 'Location', render: (e) => <div><p className="font-medium text-slate-900">{e.location}</p><p className="text-xs text-slate-500">{EXTINGUISHER_TYPES.find((t) => t.value === e.type)?.label}{e.capacityKg ? ` · ${e.capacityKg} kg` : ''}</p></div> },
                { key: 'refill', header: 'Next refill', render: (e) => (e.nextRefillDue ? <span className="flex items-center gap-2">{date(e.nextRefillDue)}<Badge tone={DUE_TONES[e.refillState]}>{STATE_TEXT[e.refillState]}</Badge></span> : '—') },
                { key: 'expiry', header: 'Expiry', render: (e) => (e.expiryDate ? <span className="flex items-center gap-2">{date(e.expiryDate)}{e.expiryState !== 'ok' && <Badge tone={DUE_TONES[e.expiryState]}>{STATE_TEXT[e.expiryState]}</Badge>}</span> : '—') },
                { key: 'active', header: '', render: (e) => (!e.active ? <Badge>Removed</Badge> : null) },
                { key: 'act', header: '', render: (e) => e.active && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setRefill(e)}>Refilled</Button>
                    {manager && <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: e._id, active: false })}>Remove</Button>}
                  </div>
                ) },
              ]} />
            <Pagination meta={ext.data?.meta} onPage={setPage} />
          </>
        )}
        {tab === 'drills' && (
          <>
            <Table loading={drills.isLoading} rows={drills.data?.data} empty="No drills logged"
              columns={[
                { key: 'date', header: 'Date', render: (d) => `${date(d.date)}${d.time ? ` ${d.time}` : ''}` },
                { key: 'scenario', header: 'Scenario', className: 'max-w-xs whitespace-normal', render: (d) => <div><p className="font-medium text-slate-900">{d.scenario || 'Drill'}</p>{d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}</div> },
                { key: 'attendance', header: 'Attended' },
                { key: 'evacuationMinutes', header: 'Evacuation', render: (d) => (d.evacuationMinutes ? `${d.evacuationMinutes} min` : '—') },
                { key: 'conductedBy', header: 'Conducted by', render: (d) => d.conductedBy || d.by?.name || '—' },
                { key: 'files', header: '', render: (d) => <Attachments items={d.attachments} /> },
              ]} />
            <Pagination meta={drills.data?.meta} onPage={setPage} />
          </>
        )}
        {tab === 'noc' && (
          <Table loading={nocs.isLoading} rows={nocs.data} empty="No fire NOC recorded"
            columns={[
              { key: 'number', header: 'NOC no.', render: (n) => <span className="font-medium">{n.number}{n.current && <Badge tone="brand" className="ml-2">Current</Badge>}</span> },
              { key: 'issuedBy', header: 'Issued by', render: (n) => n.issuedBy || '—' },
              { key: 'issueDate', header: 'Issued', render: (n) => (n.issueDate ? date(n.issueDate) : '—') },
              { key: 'expiryDate', header: 'Valid till', render: (n) => <span className="flex items-center gap-2">{date(n.expiryDate)}{n.current && <Badge tone={DUE_TONES[n.state]}>{n.daysLeft < 0 ? 'Expired' : `${n.daysLeft} days`}</Badge>}</span> },
              { key: 'docs', header: '', render: (n) => <Attachments items={n.documents} /> },
            ]} />
        )}
      </Card>
      <ExtinguisherModal open={modal === 'ext'} onClose={() => setModal(null)} />
      <DrillModal open={modal === 'drill'} onClose={() => setModal(null)} />
      <NocModal open={modal === 'noc'} onClose={() => setModal(null)} />
      {refill && <RefillModal item={refill} onClose={() => setRefill(null)} />}
    </div>
  );
}
