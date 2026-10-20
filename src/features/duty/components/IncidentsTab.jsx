import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Attachments, Badge, Button, Card, FileUpload, Input, Modal, Pagination, Select, Spinner, StatusBadge, Table, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { dateTime, label } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useT } from '../../../context/LanguageContext';
import { INCIDENT_TYPES, SEVERITY, useCloseIncident, useCreateIncident, useIncident, useIncidents } from '../api';

const SEVERITY_TONES = { low: 'slate', medium: 'blue', high: 'amber', critical: 'red' };
const opts = (list) => list.map((v) => ({ value: v, label: label(v) }));

export function SeverityBadge({ severity }) {
  const { t } = useT();
  return <Badge tone={SEVERITY_TONES[severity] || 'slate'}>{t(label(severity))}</Badge>;
}

// datetime-local wants local "YYYY-MM-DDTHH:mm" without a zone.
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function IncidentForm({ onClose }) {
  const { values, bind, applyServerErrors } = useForm({ type: 'suspicious', severity: 'medium', title: '', description: '', location: '', occurredAt: nowLocal(), vehicleNumber: '' });
  const { t } = useT();
  const [photos, setPhotos] = useState([]);
  const create = useCreateIncident({ onSuccess: onClose });
  const submit = () =>
    create.mutate(
      {
        type: values.type,
        severity: values.severity,
        title: values.title,
        description: values.description || undefined,
        location: values.location || undefined,
        occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : undefined,
        vehicleNumber: values.vehicleNumber || undefined,
        photos: photos.map((p) => p._id),
      },
      { onError: applyServerErrors },
    );
  return (
    <Modal open onClose={onClose} size="lg" title="Report incident" description="High and critical incidents alert management by SMS."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={create.isPending} onClick={submit}>Report</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Type" options={opts(INCIDENT_TYPES)} {...bind('type')} />
        <Select label="Severity" options={opts(SEVERITY)} {...bind('severity')} />
        <Input className="sm:col-span-2" label="Title" required placeholder="e.g. Unknown person near Tower C parking" {...bind('title')} />
        <Textarea className="sm:col-span-2" label="What happened" rows={4} {...bind('description')} />
        <Input label="Location" placeholder="e.g. Basement 2" {...bind('location')} />
        <Input label="Occurred at" type="datetime-local" max={nowLocal()} {...bind('occurredAt')} />
        <Input label="Vehicle number (optional)" placeholder="MH12AB1234" autoCapitalize="characters" {...bind('vehicleNumber')} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t('Photos')}</p>
          <FileUpload folder="security" files={photos} onChange={setPhotos} max={6} label="Add photos" />
        </div>
      </div>
    </Modal>
  );
}

function IncidentDetail({ id, manager, onClose }) {
  const { t } = useT();
  const { data: inc, isLoading } = useIncident(id);
  const [action, setAction] = useState('');
  const close = useCloseIncident({ onSuccess: () => setAction('') });
  const row = (k, v) => v ? <div className="flex gap-3 py-1.5"><dt className="w-28 shrink-0 text-slate-500">{t(k)}</dt><dd className="min-w-0 text-slate-800">{v}</dd></div> : null;
  return (
    <Modal open onClose={onClose} size="lg" title={inc ? `${inc.number} · ${inc.title}` : t('Incident')}
      footer={manager && inc?.status === 'open' ? <Button loading={close.isPending} disabled={action.trim().length < 3} onClick={() => close.mutate({ id, actionTaken: action.trim() })}>Close incident</Button> : undefined}>
      {isLoading || !inc ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={inc.status} />
            <SeverityBadge severity={inc.severity} />
            <Badge>{t(label(inc.type))}</Badge>
          </div>
          {inc.description && <p className="whitespace-pre-line text-slate-700">{inc.description}</p>}
          <dl className="divide-y divide-slate-100">
            {row('Occurred', dateTime(inc.occurredAt))}
            {row('Location', inc.location)}
            {row('Reported by', inc.reportedBy?.name)}
            {row('Vehicle', inc.vehicleNumber && `${inc.vehicleNumber}${inc.vehicle ? ` · ${[inc.vehicle.make, inc.vehicle.color].filter(Boolean).join(', ')}` : ` · ${t('not registered')}`}`)}
            {row('Unit', inc.unit?.label)}
            {row('Visitor', inc.visitor && `${inc.visitor.name}${inc.visitor.phone ? ` · ${inc.visitor.phone}` : ''}`)}
          </dl>
          {inc.photos?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Photos')}</p>
              <Attachments items={inc.photos} />
            </div>
          )}
          {inc.status === 'closed' ? (
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-wide">{t('Action taken')}</p>
              <p className="whitespace-pre-line">{inc.actionTaken}</p>
              <p className="mt-1 text-xs opacity-80">{t('Closed by {name} on {date}', { name: inc.closedBy?.name || '—', date: dateTime(inc.closedAt) })}</p>
            </div>
          ) : manager && (
            <Textarea label="Action taken" rows={3} placeholder="What was done to resolve this" value={action} onChange={(e) => setAction(e.target.value)} />
          )}
        </div>
      )}
    </Modal>
  );
}

export function IncidentsTab() {
  const { user } = useAuth();
  const { t } = useT();
  const manager = isManager(user);
  const [filters, setFilters] = useState({ status: '', type: '', page: 1 });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const { data, isLoading } = useIncidents(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')));
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <Select placeholder="All statuses" options={opts(['open', 'closed'])} value={filters.status} onChange={set('status')} />
        <Select placeholder="All types" options={opts(INCIDENT_TYPES)} value={filters.type} onChange={set('type')} />
        <Button variant="danger" icon={ShieldAlert} onClick={() => setCreating(true)}>Report incident</Button>
      </div>
      <Table
        loading={isLoading}
        rows={data?.data}
        empty="No incidents"
        onRowClick={(i) => setOpenId(i._id)}
        columns={[
          { key: 'number', header: 'No.', render: (i) => <span className="font-mono text-xs font-semibold text-slate-700">{i.number}</span> },
          { key: 'title', header: 'Incident', className: 'max-w-xs', render: (i) => <div className="truncate"><p className="truncate font-medium text-slate-900">{i.title}</p><p className="text-xs text-slate-500">{t(label(i.type))}{i.location ? ` · ${i.location}` : ''}</p></div> },
          { key: 'severity', header: 'Severity', render: (i) => <SeverityBadge severity={i.severity} /> },
          { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
          { key: 'occurredAt', header: 'Occurred', render: (i) => dateTime(i.occurredAt) },
          { key: 'reportedBy', header: 'Reported by', render: (i) => i.reportedBy?.name || '—' },
        ]}
      />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      {creating && <IncidentForm onClose={() => setCreating(false)} />}
      {openId && <IncidentDetail id={openId} manager={manager} onClose={() => setOpenId(null)} />}
    </Card>
  );
}
