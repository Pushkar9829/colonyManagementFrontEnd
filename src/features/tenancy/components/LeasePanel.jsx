import { useState } from 'react';
import { FileSignature } from 'lucide-react';
import { Attachments, Badge, Button, Card, CardHeader, EmptyState, FileUpload, Input, Select, Spinner, StatusBadge } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date as fmtDate, label, money } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { useLeaseDocuments, useLeases, useUnitLeaseHistory } from '../api';

const PV_TONE = { verified: 'green', submitted: 'amber', rejected: 'red', not_submitted: 'slate' };

export function LeaseCard({ lease, canUpload = true }) {
  const [kind, setKind] = useState('agreement');
  const [files, setFiles] = useState([]);
  const [reference, setReference] = useState('');
  const add = useLeaseDocuments({ onSuccess: () => { setFiles([]); setReference(''); } });
  const pv = lease.policeVerification || {};
  const { t } = useT();
  return (
    <Card>
      <CardHeader title={`${lease.unit?.label} · ${fmtDate(lease.startDate)} – ${fmtDate(lease.endDate)}`}
        subtitle={t('Tenant {tenant} · Owner {owner}', { tenant: lease.tenantUser?.name || '—', owner: lease.ownerUser?.name || lease.ownerName || '—' })}
        action={<div className="flex flex-wrap gap-1"><StatusBadge status={lease.status} />{lease.moveOutDue && <Badge tone="red">{t('Move-out due')}</Badge>}{lease.status === 'active' && lease.daysLeft >= 0 && lease.daysLeft <= 30 && <Badge tone="amber">{t('{count} days left', { count: lease.daysLeft })}</Badge>}</div>} />
      <div className="grid gap-4 p-5 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          {lease.rent ? <p>{t('Rent:')} <b>{money(lease.rent)}</b> {t('/ month')}</p> : null}
          {lease.securityDeposit ? <p>{t('Security deposit: {amount}', { amount: money(lease.securityDeposit) })}</p> : null}
          <p className="flex items-center gap-2">{t('Police verification:')} <Badge tone={PV_TONE[pv.status || 'not_submitted']}>{t(label(pv.status || 'not_submitted'))}</Badge>{pv.reference && <span className="text-xs text-slate-500">{t('Ref {ref}', { ref: pv.reference })}</span>}</p>
          {lease.emergencyContact?.name && <p>{t('Emergency contact: {contact}', { contact: `${lease.emergencyContact.name} · ${lease.emergencyContact.phone}` })}</p>}
          {lease.status === 'ended' && <p className="text-slate-500">{t('Ended {date}', { date: fmtDate(lease.endedAt) })}{lease.endReason ? ` · ${lease.endReason}` : ''}</p>}
        </div>
        <div className="space-y-3">
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Rental agreement')}</p>{lease.agreement?.length ? <Attachments items={lease.agreement} /> : <p className="text-xs text-slate-400">{t('Not uploaded')}</p>}</div>
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Police verification papers')}</p>{pv.documents?.length ? <Attachments items={pv.documents} /> : <p className="text-xs text-slate-400">{t('Not uploaded')}</p>}</div>
        </div>
        {canUpload && lease.status === 'active' && (
          <div className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:col-span-2 sm:grid-cols-2">
            <Select label="Upload" options={[{ value: 'agreement', label: 'Rental agreement' }, { value: 'police', label: 'Police verification' }]} value={kind} onChange={(e) => setKind(e.target.value)} />
            {kind === 'police' && <Input label="Acknowledgement no. (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />}
            <FileUpload className="sm:col-span-2" folder="documents" files={files} onChange={setFiles} max={5} label="Attach" />
            <Button size="sm" className="justify-self-start" disabled={!files.length} loading={add.isPending} onClick={() => add.mutate({ id: lease._id, kind, files: files.map((f) => f._id), reference: reference || undefined })}>Upload</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Resident view: a tenant's own lease, or an owner's flat leases and past tenants.
export function LeasePanel() {
  const { user } = useAuth();
  const isOwner = user.residentType === 'owner';
  const { data, isLoading } = useLeases({ limit: 20 });
  const history = useUnitLeaseHistory(isOwner ? user.unit?._id : null);
  const { t } = useT();
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  const active = data?.data.filter((l) => l.status === 'active') || [];
  const past = isOwner ? (history.data?.leases || []).filter((l) => l.status !== 'active') : data?.data.filter((l) => l.status !== 'active') || [];
  return (
    <div className="space-y-6">
      {!active.length ? <Card><EmptyState icon={FileSignature} title="No active lease" description={isOwner ? 'When you rent out your flat, the office records the lease here.' : 'The society office records your lease.'} /></Card> : active.map((l) => <LeaseCard key={l._id} lease={l} />)}
      {past.length > 0 && (
        <Card>
          <CardHeader title={isOwner ? 'Past tenants' : 'Past leases'} />
          <ul className="divide-y divide-slate-100 text-sm">
            {past.map((l) => (
              <li key={l._id} className="flex justify-between gap-2 px-5 py-3">
                <span className="font-medium text-slate-800">{l.tenantUser?.name}</span>
                <span className="text-slate-500">{fmtDate(l.startDate)} – {fmtDate(l.endedAt || l.endDate)}{l.movedOut ? ` · ${t('moved out')}` : ''}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
