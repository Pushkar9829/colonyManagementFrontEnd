import { useState } from 'react';
import { CheckCircle2, FileClock, Percent } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, Checkbox, Modal, Pagination, Select, StatCard, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { date as fmtDate, label } from '../../../lib/format';
import { CATEGORY_LABELS, KYC_TYPE_OPTIONS, useKycCompletion, useKycQueue, useRejectKyc, useVerifyKyc } from '../api';

const TONE = { verified: 'green', pending: 'amber', rejected: 'red', missing: 'slate' };
const typeLabel = (t) => KYC_TYPE_OPTIONS.find((o) => o.value === t)?.label || label(t);

function ReviewModal({ doc, onClose }) {
  const verify = useVerifyKyc();
  const reject = useRejectKyc();
  const [reason, setReason] = useState('');
  const done = { onSuccess: onClose };
  return (
    <Modal open onClose={onClose} title={`${typeLabel(doc.type)} · ${doc.user?.name}`} description={`${doc.unit?.label || 'No unit'} · submitted ${fmtDate(doc.updatedAt)}`} size="lg"
      footer={doc.status === 'pending' || doc.status === 'rejected' ? (
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {doc.status === 'pending' && <Button variant="danger" disabled={reason.trim().length < 3} loading={reject.isPending} onClick={() => reject.mutate({ id: doc._id, reason }, done)}>Reject</Button>}
          <Button variant="success" loading={verify.isPending} onClick={() => verify.mutate(doc._id, done)}>Verify</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="danger" disabled={reason.trim().length < 3} loading={reject.isPending} onClick={() => reject.mutate({ id: doc._id, reason }, done)}>Revoke (reject)</Button>
        </>
      )}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-4">
          <p>Status: <StatusBadge status={doc.status} /></p>
          {doc.last4 && <p>Number ends with <span className="font-mono font-semibold">{doc.last4}</span></p>}
          {doc.nameOnDocument && <p>Name on document: <b>{doc.nameOnDocument}</b></p>}
        </div>
        <Attachments items={doc.files} />
        <p className="text-xs text-slate-500">Match the name, photo and last digits with the member before verifying. Full ID numbers are never stored.</p>
        <Textarea label="Reason (needed to reject)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}

function Queue() {
  const [filters, setFilters] = useState({ status: 'pending', type: '', page: 1 });
  const { data, isLoading } = useKycQueue(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')));
  const [open, setOpen] = useState(null);
  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
        <Select placeholder="All statuses" options={['pending', 'verified', 'rejected'].map((s) => ({ value: s, label: label(s) }))} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
        <Select placeholder="All documents" options={KYC_TYPE_OPTIONS} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="Nothing to review" onRowClick={setOpen}
        columns={[
          { key: 'who', header: 'Member', render: (d) => <div><p className="font-medium text-slate-900">{d.user?.name}</p><p className="text-xs text-slate-500">{d.unit?.label || '—'}</p></div> },
          { key: 'type', header: 'Document', render: (d) => `${typeLabel(d.type)}${d.last4 ? ` ••••${d.last4}` : ''}` },
          { key: 'date', header: 'Submitted', render: (d) => fmtDate(d.updatedAt) },
          { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          { key: 'by', header: 'Reviewed', render: (d) => (d.reviewedBy ? `${d.reviewedBy.name} · ${fmtDate(d.reviewedAt)}` : '—') },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      {open && <ReviewModal doc={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function Completion() {
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useKycCompletion({ incompleteOnly: incompleteOnly || undefined, page });
  const summary = data?.meta?.summary;
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Percent} label="Overall completion" value={`${summary.percent}%`} />
          <StatCard icon={CheckCircle2} tone="green" label="Complete homes" value={`${summary.completeUnits} / ${summary.occupiedUnits}`} />
          <StatCard icon={FileClock} tone="amber" label="Awaiting review" value={summary.pendingDocuments} />
        </div>
      )}
      <Card>
        <div className="border-b border-slate-100 p-4"><Checkbox label="Only incomplete homes" checked={incompleteOnly} onChange={(e) => { setIncompleteOnly(e.target.checked); setPage(1); }} /></div>
        <Table loading={isLoading} rows={data?.data?.map((r) => ({ ...r, key: r.unit._id }))} rowKey="key" empty="No units"
          columns={[
            { key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-900">{r.unit.label}</span> },
            { key: 'pct', header: 'Completion', render: (r) => (r.percent == null ? <span className="text-slate-400">No residents</span> : <Badge tone={r.complete ? 'green' : r.percent ? 'amber' : 'red'}>{r.percent}%</Badge>) },
            {
              key: 'people', header: 'Residents', className: 'whitespace-normal', render: (r) => (
                <div className="space-y-1">
                  {r.residents.map((p) => (
                    <div key={p.membership} className="flex flex-wrap items-center gap-1 text-xs">
                      <span className="font-medium text-slate-700">{p.name}</span>
                      <span className="text-slate-400">({label(p.residentType)})</span>
                      {p.items.map((i) => <Badge key={i.category} tone={TONE[i.status]}>{CATEGORY_LABELS[i.category]}</Badge>)}
                    </div>
                  ))}
                </div>
              ),
            },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}

export default function KycQueuePage() {
  const [tab, setTab] = useState('queue');
  return (
    <div>
      <PageHeader title="KYC verification" description="Review members' ID, photo and ownership documents. Only admins can see them." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'queue', label: 'Documents' }, { value: 'completion', label: 'Completion by unit' }]} />
      {tab === 'queue' ? <Queue /> : <Completion />}
    </div>
  );
}
