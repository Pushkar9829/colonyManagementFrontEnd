import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Attachments, Badge, Button, Card, CardHeader, EmptyState, FileUpload, Input, Select, Spinner, StatusBadge } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date as fmtDate, label } from '../../../lib/format';
import { CATEGORY_LABELS, KYC_TYPE_OPTIONS, OWNERSHIP_DOCS, useDeleteKyc, useMyKyc, useSubmitKyc } from '../api';

const STATUS_TONE = { verified: 'green', pending: 'amber', rejected: 'red', missing: 'slate' };

// The member's own KYC documents. Numbers are never shown back: the server keeps only the last 4 digits.
export function KycPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useMyKyc();
  const isOwner = user.residentType === 'owner';
  const types = KYC_TYPE_OPTIONS.filter((t) => isOwner || !OWNERSHIP_DOCS.includes(t.value));
  const [type, setType] = useState('aadhaar');
  const [number, setNumber] = useState('');
  const [nameOnDocument, setNameOnDocument] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const submit = useSubmitKyc({
    onSuccess: () => {
      setNumber('');
      setNameOnDocument('');
      setFiles([]);
      setError(null);
    },
  });
  const remove = useDeleteKyc();
  const needsNumber = ['aadhaar', 'pan', 'passport', 'voter_id', 'driving_licence'].includes(type);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  const completion = data?.completion;
  return (
    <div className="space-y-6">
      {completion && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-slate-900">KYC status</p>
            {completion.complete ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">{completion.done} of {completion.required} verified</Badge>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {completion.items.map((i) => <Badge key={i.category} tone={STATUS_TONE[i.status]}>{CATEGORY_LABELS[i.category]}: {label(i.status)}</Badge>)}
          </div>
        </Card>
      )}
      <Card>
        <CardHeader title="Upload a document" subtitle="Visible only to you and the society admins. For Aadhaar we store just the last 4 digits." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Document" options={types} value={type} onChange={(e) => setType(e.target.value)} />
          {needsNumber && (
            <Input label={type === 'aadhaar' ? 'Aadhaar number (or last 4 digits)' : 'Document number'} value={number} onChange={(e) => setNumber(e.target.value)} autoComplete="off"
              error={error} hint={type === 'aadhaar' ? 'Only the last 4 digits are saved' : 'Only the last 4 characters are saved'} />
          )}
          <Input label="Name on document" value={nameOnDocument} onChange={(e) => setNameOnDocument(e.target.value)} />
          <FileUpload className="sm:col-span-2" folder="documents" files={files} onChange={setFiles} max={4} camera={type === 'photo'} label={type === 'photo' ? 'Take / choose photo' : 'Attach scan'} />
          <Button className="justify-self-start" disabled={!files.length} loading={submit.isPending}
            onClick={() => submit.mutate({ type, number: number || undefined, nameOnDocument: nameOnDocument || undefined, files: files.map((f) => f._id) }, { onError: (e) => setError(e.fieldErrors?.number) })}>
            Submit for verification
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="My documents" />
        {!data?.documents.length ? <EmptyState icon={ShieldCheck} title="No documents yet" /> : (
          <ul className="divide-y divide-slate-100">
            {data.documents.map((d) => (
              <li key={d._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{KYC_TYPE_OPTIONS.find((t) => t.value === d.type)?.label}</p>
                    <StatusBadge status={d.status} />
                    {d.last4 && <span className="font-mono text-xs text-slate-500">•••• {d.last4}</span>}
                  </div>
                  <p className="text-xs text-slate-500">Submitted {fmtDate(d.updatedAt)}{d.status === 'rejected' && d.rejectionReason ? ` · Rejected: ${d.rejectionReason}` : ''}</p>
                  <div className="mt-2"><Attachments items={d.files} /></div>
                </div>
                {d.status !== 'verified' && <Button size="sm" variant="ghost" onClick={() => window.confirm('Delete this document?') && remove.mutate(d._id)}>Delete</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
