import { useState } from 'react';
import { BookOpen, Download, FileBadge, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageLoader, Pagination, Select, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { date, label, money, toPaise } from '../../../lib/format';
import { useGovernance, useMemberOptions } from '../../committee/api';
import { downloadPdf } from '../../committee/lib';
import {
  useAdmitMember, useCancelCertificate, useCeaseMember, useCertificates, useIssueCertificate, useMyRegister, useRecordNomination, useRegisterMember,
  useRegisterMembers, useRegisterNominations, useRevokeNomination, useTransfer, useTransfers, useUnitOptions,
} from '../api';

function usePdf() {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const run = async (path, name) => {
    setBusy(path);
    try {
      await downloadPdf(path, name);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

// ---- dialogs ----

function AdmitModal({ open, onClose, isAdmin }) {
  const { data: members = [] } = useMemberOptions(open && isAdmin, { role: 'resident' });
  const { data: units = [] } = useUnitOptions(open && isAdmin);
  const { values, bind, applyServerErrors, reset, errors } = useForm({ membership: '', name: '', unit: '', address: '', occupation: '', admissionDate: '', entranceFee: '' });
  const admit = useAdmitMember({ onSuccess: () => { reset(); onClose(); } });
  const opt = (v) => v || undefined;
  return (
    <Modal open={open} onClose={onClose} title="Admit a member (I-Form)"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={admit.isPending} onClick={() => admit.mutate({
        membership: opt(values.membership), name: opt(values.name), unit: opt(values.unit), address: opt(values.address), occupation: opt(values.occupation),
        admissionDate: values.admissionDate, entranceFee: values.entranceFee ? toPaise(values.entranceFee) : undefined,
      }, { onError: applyServerErrors })}>Admit</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {isAdmin && <Select className="sm:col-span-2" label="Link to resident account" placeholder="Not linked" options={members.map((m) => ({ value: m._id, label: `${m.name}${m.unit?.label ? ` (${m.unit.label})` : ''}` }))} {...bind('membership')} hint="Linked members can see their own entries." />}
        <Input className="sm:col-span-2" label="Full name" placeholder={values.membership ? 'Taken from the account' : ''} {...bind('name')} />
        {isAdmin && <Select label="Flat" placeholder="—" options={units.map((u) => ({ value: u._id, label: u.label }))} {...bind('unit')} />}
        <Input type="date" label="Date of admission" required {...bind('admissionDate')} />
        <Input label="Occupation" {...bind('occupation')} />
        <Input type="number" min="0" label="Entrance fee (₹)" {...bind('entranceFee')} />
        <Textarea className="sm:col-span-2" label="Address" rows={2} {...bind('address')} error={errors.address} />
      </div>
    </Modal>
  );
}

function IssueModal({ member, onClose }) {
  const { values, bind, applyServerErrors, reset } = useForm({ shareCount: '5', faceValue: '50', issueDate: '', shareFrom: '' });
  const issue = useIssueCertificate({ onSuccess: () => { reset(); onClose(); } });
  const { t } = useT();
  return (
    <Modal open={Boolean(member)} onClose={onClose} title="Issue share certificate" description={member && t('{name} · Member No. {no}', { name: member.name, no: member.memberNo })}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={issue.isPending} onClick={() => issue.mutate({
        member: member._id, shareCount: Number(values.shareCount), faceValue: toPaise(values.faceValue), issueDate: values.issueDate, shareFrom: values.shareFrom ? Number(values.shareFrom) : undefined,
      }, { onError: applyServerErrors })}>Issue</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="number" min="1" label="Number of shares" {...bind('shareCount')} />
        <Input type="number" min="1" label="Face value per share (₹)" {...bind('faceValue')} />
        <Input type="date" label="Issue date" required {...bind('issueDate')} />
        <Input type="number" min="1" label="First share no. (optional)" hint="Leave blank to allot the next numbers automatically" {...bind('shareFrom')} />
      </div>
    </Modal>
  );
}

function NominationModal({ member, onClose }) {
  const [nominees, setNominees] = useState([{ name: '', relation: '', sharePercent: '100' }]);
  const [witness, setWitness] = useState('');
  const [nominationDate, setDate] = useState('');
  const save = useRecordNomination({ onSuccess: onClose });
  const { t } = useT();
  const total = nominees.reduce((s, n) => s + Number(n.sharePercent || 0), 0);
  const setN = (i, patch) => setNominees(nominees.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  return (
    <Modal open={Boolean(member)} onClose={onClose} size="lg" title="Record nomination" description={member ? t('{name} — replaces any earlier nomination', { name: member.name }) : ''}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={Math.abs(total - 100) > 0.001} onClick={() => save.mutate({
        member: member._id, nominationDate, witnesses: witness ? [{ name: witness }] : [], nominees: nominees.map((n) => ({ name: n.name, relation: n.relation || undefined, sharePercent: Number(n.sharePercent) })),
      })}>Save</Button></>}>
      <div className="space-y-3">
        {nominees.map((n, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="grid grid-cols-12 gap-2">
            <Input className="col-span-5" placeholder="Nominee name" value={n.name} onChange={(e) => setN(i, { name: e.target.value })} />
            <Input className="col-span-3" placeholder="Relation" value={n.relation} onChange={(e) => setN(i, { relation: e.target.value })} />
            <Input className="col-span-3" type="number" min="0" max="100" placeholder="%" value={n.sharePercent} onChange={(e) => setN(i, { sharePercent: e.target.value })} />
            <Button className="col-span-1" variant="ghost" icon={Trash2} aria-label={t('Remove nominee')} disabled={nominees.length === 1} onClick={() => setNominees(nominees.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setNominees([...nominees, { name: '', relation: '', sharePercent: '' }])}>Add nominee</Button>
          <span className={Math.abs(total - 100) > 0.001 ? 'text-sm font-medium text-red-600' : 'text-sm text-emerald-700'}>{t('Total {n}%', { n: total })} {Math.abs(total - 100) > 0.001 && t('(must be 100%)')}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Witness" required value={witness} onChange={(e) => setWitness(e.target.value)} />
          <Input type="date" label="Date of nomination" required value={nominationDate} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function TransferModal({ cert, onClose }) {
  const { data: members } = useRegisterMembers({ status: 'active', limit: 100 }, Boolean(cert));
  const { values, bind, applyServerErrors, reset } = useForm({ transferee: '', newName: '', date: '', reason: 'sale', transferFee: '', premium: '', meetingRef: '' });
  const transfer = useTransfer({ onSuccess: () => { reset(); onClose(); } });
  const { t } = useT();
  const options = (members?.data || []).filter((m) => m._id !== cert?.member?._id).map((m) => ({ value: m._id, label: `${m.memberNo}. ${m.name}` }));
  return (
    <Modal open={Boolean(cert)} onClose={onClose} title={t('Transfer certificate No. {no}', { no: cert?.certificateNo })} description={cert && t('Shares {from}-{to} held by {name}', { from: cert.shareFrom, to: cert.shareTo, name: cert.member?.name })}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={transfer.isPending} onClick={() => transfer.mutate({
        certificate: cert._id,
        transferee: values.transferee || undefined,
        newMember: values.transferee ? undefined : { name: values.newName },
        date: values.date,
        reason: values.reason,
        transferFee: values.transferFee ? toPaise(values.transferFee) : 0,
        premium: values.premium ? toPaise(values.premium) : 0,
        meetingRef: values.meetingRef || undefined,
      }, { onError: applyServerErrors })}>Record transfer</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select className="sm:col-span-2" label="Transferee (existing member)" placeholder="New member — enter name below" options={options} {...bind('transferee')} />
        {!values.transferee && <Input className="sm:col-span-2" label="New member's full name" {...bind('newName')} />}
        <Input type="date" label="Date of transfer" required {...bind('date')} />
        <Select label="Reason" options={['sale', 'gift', 'inheritance', 'other'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} {...bind('reason')} />
        <Input type="number" min="0" label="Transfer fee (₹)" {...bind('transferFee')} />
        <Input type="number" min="0" label="Premium (₹)" {...bind('premium')} />
        <Input className="sm:col-span-2" label="Committee resolution ref." placeholder="MC meeting MTG-000012, R-3" {...bind('meetingRef')} />
      </div>
    </Modal>
  );
}

function MemberModal({ id, onClose, onIssue, onNominate }) {
  const { data: m, isLoading } = useRegisterMember(id);
  const cease = useCeaseMember();
  const { busy, run } = usePdf();
  const { t } = useT();
  return (
    <Modal open={Boolean(id)} onClose={onClose} size="lg" title={m ? `${m.memberNo}. ${m.name}` : 'Member'} description={m && t('{flat} · admitted {date}', { flat: m.unitLabel || t('No flat'), date: date(m.admissionDate) })}>
      {isLoading || !m ? <PageLoader /> : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={m.status === 'ceased' ? 'inactive' : 'active'} />
            <Badge tone="brand">{t('{n} shares', { n: m.sharesHeld })}</Badge>
            {m.entranceFee > 0 && <Badge>{t('Entrance fee {amount}', { amount: money(m.entranceFee) })}</Badge>}
          </div>
          {m.cessationReason && <p className="text-slate-600">{t('Ceased {date}: {reason}', { date: date(m.cessationDate), reason: m.cessationReason })}</p>}
          <div>
            <p className="mb-1 font-medium text-slate-900">{t('Share certificates')}</p>
            {m.certificates.length ? m.certificates.map((c) => (
              <div key={c._id} className="flex items-center justify-between border-b border-slate-100 py-1.5">
                <span>{t('No. {no} · shares {from}-{to}', { no: c.certificateNo, from: c.shareFrom, to: c.shareTo })} {c.member !== m._id && <Badge>{t('transferred')}</Badge>} {c.status === 'cancelled' && <Badge tone="red">{t('cancelled')}</Badge>}</span>
                <Button size="sm" variant="ghost" icon={Download} loading={busy === `/registers/certificates/${c._id}/pdf`} onClick={() => run(`/registers/certificates/${c._id}/pdf`, `Share-Certificate-${c.certificateNo}.pdf`)}>PDF</Button>
              </div>
            )) : <p className="text-slate-500">{t('None')}</p>}
          </div>
          <div>
            <p className="mb-1 font-medium text-slate-900">{t('Nominations')}</p>
            {m.nominations.length ? m.nominations.map((n) => (
              <p key={n._id} className="border-b border-slate-100 py-1.5">{n.nominees.map((x) => `${x.name} (${x.sharePercent}%)`).join(', ')} · {date(n.nominationDate)} {n.status === 'revoked' && <Badge>{t('revoked')}</Badge>}</p>
            )) : <p className="text-slate-500">{t('None recorded')}</p>}
          </div>
          {m.transfers.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-900">{t('Transfers')}</p>
              {m.transfers.map((x) => <p key={x._id} className="border-b border-slate-100 py-1.5">{t('No. {no}: {from} → {to} on {date}', { no: x.transferNo, from: x.transferorName, to: x.transfereeName, date: date(x.date) })}</p>)}
            </div>
          )}
          {m.status === 'active' && onIssue && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" icon={FileBadge} onClick={() => onIssue(m)}>Issue certificate</Button>
              <Button size="sm" variant="secondary" onClick={() => onNominate(m)}>Record nomination</Button>
              <Button size="sm" variant="ghost" onClick={() => { const reason = window.prompt(t('Reason for cessation of membership')); if (reason?.trim()) cease.mutate({ id: m._id, reason, date: new Date().toLocaleDateString('en-CA') }); }}>Cease membership</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---- tabs ----

function MembersTab({ isAdmin }) {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const { data, isLoading } = useRegisterMembers(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')));
  const [admitting, setAdmitting] = useState(false);
  const [open, setOpen] = useState(null);
  const [issuing, setIssuing] = useState(null);
  const [nominating, setNominating] = useState(null);
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <Input className="w-full sm:w-64" placeholder="Search name or flat" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <Select className="w-40" placeholder="All" options={[{ value: 'active', label: 'Active' }, { value: 'ceased', label: 'Ceased' }]} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} />
        <Button className="sm:ml-auto" icon={Plus} onClick={() => setAdmitting(true)}>Admit member</Button>
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No members in the register" onRowClick={(m) => setOpen(m._id)}
        columns={[
          { key: 'memberNo', header: 'No.' },
          { key: 'name', header: 'Name', render: (m) => <span className="font-medium text-slate-900">{m.name}</span> },
          { key: 'unitLabel', header: 'Flat', render: (m) => m.unitLabel || '—' },
          { key: 'admissionDate', header: 'Admitted', render: (m) => date(m.admissionDate) },
          { key: 'sharesHeld', header: 'Shares', render: (m) => m.sharesHeld },
          { key: 'certificateNos', header: 'Certificates', render: (m) => m.certificateNos.join(', ') || '—' },
          { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status === 'ceased' ? 'inactive' : 'active'} /> },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters({ ...filters, page })} />
      <AdmitModal open={admitting} onClose={() => setAdmitting(false)} isAdmin={isAdmin} />
      <MemberModal id={open} onClose={() => setOpen(null)} onIssue={(m) => { setOpen(null); setIssuing(m); }} onNominate={(m) => { setOpen(null); setNominating(m); }} />
      <IssueModal member={issuing} onClose={() => setIssuing(null)} />
      <NominationModal member={nominating} onClose={() => setNominating(null)} />
    </Card>
  );
}

function CertificatesTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCertificates({ page });
  const [transferring, setTransferring] = useState(null);
  const cancel = useCancelCertificate();
  const { busy, run } = usePdf();
  const { t } = useT();
  return (
    <Card>
      <Table loading={isLoading} rows={data?.data} empty="No share certificates issued"
        columns={[
          { key: 'certificateNo', header: 'Cert. No.' },
          { key: 'member', header: 'Holder', render: (c) => c.member?.name },
          { key: 'unitLabel', header: 'Flat', render: (c) => c.unitLabel || '—' },
          { key: 'range', header: 'Distinctive nos.', render: (c) => `${c.shareFrom} – ${c.shareTo}` },
          { key: 'shareCount', header: 'Shares', render: (c) => `${c.shareCount} × ${money(c.faceValue)}` },
          { key: 'issueDate', header: 'Issued', render: (c) => date(c.issueDate) },
          { key: 'status', header: '', render: (c) => (c.status === 'cancelled' ? <Badge tone="red">{t('Cancelled')}</Badge> : c.endorsements.length ? <Badge>{t('{n} transfer(s)', { n: c.endorsements.length })}</Badge> : null) },
          { key: 'actions', header: '', render: (c) => (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" icon={Download} loading={busy === `/registers/certificates/${c._id}/pdf`} onClick={() => run(`/registers/certificates/${c._id}/pdf`, `Share-Certificate-${c.certificateNo}.pdf`)} aria-label={t('Download certificate')} />
              {c.status === 'active' && <Button size="sm" variant="secondary" onClick={() => setTransferring(c)}>Transfer</Button>}
              {c.status === 'active' && <Button size="sm" variant="ghost" onClick={() => { const reason = window.prompt(t('Reason for cancelling this certificate (e.g. duplicate issued)')); if (reason?.trim()) cancel.mutate({ id: c._id, reason }); }}>Cancel</Button>}
            </div>
          ) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      <TransferModal cert={transferring} onClose={() => setTransferring(null)} />
    </Card>
  );
}

function TransfersTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransfers({ page });
  const { t } = useT();
  return (
    <Card>
      <Table loading={isLoading} rows={data?.data} empty="No transfers recorded"
        columns={[
          { key: 'transferNo', header: 'No.' },
          { key: 'date', header: 'Date', render: (x) => date(x.date) },
          { key: 'unitLabel', header: 'Flat', render: (x) => x.unitLabel || '—' },
          { key: 'certificateNo', header: 'Cert.', render: (x) => `${x.certificateNo} (${x.shareFrom}-${x.shareTo})` },
          { key: 'transferorName', header: 'Transferor' },
          { key: 'transfereeName', header: 'Transferee' },
          { key: 'reason', header: 'Reason', render: (x) => t(label(x.reason)) },
          { key: 'transferFee', header: 'Fee', render: (x) => money(x.transferFee) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

function NominationsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRegisterNominations({ page });
  const revoke = useRevokeNomination();
  const { t } = useT();
  return (
    <Card>
      <Table loading={isLoading} rows={data?.data} empty="No nominations recorded"
        columns={[
          { key: 'member', header: 'Member', render: (n) => `${n.member?.memberNo}. ${n.member?.name}` },
          { key: 'nominees', header: 'Nominees', className: 'whitespace-normal', render: (n) => n.nominees.map((x) => `${x.name}${x.relation ? ` (${x.relation})` : ''} ${x.sharePercent}%`).join('; ') },
          { key: 'witnesses', header: 'Witness', render: (n) => n.witnesses.map((w) => w.name).join(', ') },
          { key: 'nominationDate', header: 'Date', render: (n) => date(n.nominationDate) },
          { key: 'status', header: '', render: (n) => (n.status === 'active' ? <Button size="sm" variant="ghost" onClick={() => revoke.mutate(n._id)}>Revoke</Button> : <Badge>{t('Revoked')}</Badge>) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

function MyEntries() {
  const { data = [], isLoading } = useMyRegister();
  const { busy, run } = usePdf();
  const { t } = useT();
  if (isLoading) return <PageLoader />;
  if (!data.length) return <Card><EmptyState icon={BookOpen} title="No register entries linked to you" description="The society secretary records members, share certificates and nominations. Contact the office if your entry is missing." /></Card>;
  return (
    <div className="space-y-4">
      {data.map((m) => (
        <Card key={m._id}>
          <CardHeader title={t('Member No. {no} · {name}', { no: m.memberNo, name: m.name })} subtitle={`${m.unitLabel || ''} · ${t('admitted {date}', { date: date(m.admissionDate) })}${m.status === 'ceased' ? ` · ${t('ceased {date}', { date: date(m.cessationDate) })}` : ''}`} action={<Badge tone="brand">{t('{n} shares', { n: m.sharesHeld })}</Badge>} />
          <div className="grid gap-5 p-5 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-slate-900">{t('Share certificates')}</p>
              {m.certificates.length ? m.certificates.map((c) => (
                <div key={c._id} className="flex items-center justify-between py-1">
                  <span>{t('No. {no} · {from}-{to}', { no: c.certificateNo, from: c.shareFrom, to: c.shareTo })}{c.member !== m._id ? ` (${t('transferred')})` : ''}</span>
                  <Button size="sm" variant="ghost" icon={Download} loading={busy === `/registers/certificates/${c._id}/pdf`} onClick={() => run(`/registers/certificates/${c._id}/pdf`, `Share-Certificate-${c.certificateNo}.pdf`)}>PDF</Button>
                </div>
              )) : <p className="text-slate-500">{t('None')}</p>}
            </div>
            <div>
              <p className="mb-1 font-medium text-slate-900">{t('Current nomination')}</p>
              {m.nominations.filter((n) => n.status === 'active').map((n) => <p key={n._id}>{n.nominees.map((x) => `${x.name} — ${x.sharePercent}%`).join(', ')}</p>)}
              {!m.nominations.some((n) => n.status === 'active') && <p className="text-slate-500">{t('No nomination on record')}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function RegistersPage() {
  const { data: access, isLoading } = useGovernance();
  const [tab, setTab] = useState('members');
  const { busy, run } = usePdf();
  if (isLoading) return <PageLoader />;
  const manage = access?.canManage;
  return (
    <div>
      <PageHeader
        title="Statutory registers"
        description={manage ? 'Register of members (I-Form), list of members (J-Form), share certificates, transfers and nominations.' : 'Your entries in the society\'s registers.'}
        actions={manage && <Button variant="secondary" icon={Download} loading={busy === '/registers/j-form/pdf'} onClick={() => run('/registers/j-form/pdf', 'J-Form.pdf')}>J-Form PDF</Button>}
      />
      {manage ? (
        <>
          <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={[
            { value: 'members', label: 'Members (I-Form)' }, { value: 'certificates', label: 'Share certificates' }, { value: 'transfers', label: 'Transfers' }, { value: 'nominations', label: 'Nominations' }, { value: 'mine', label: 'My entries' },
          ]} />
          {tab === 'members' && <MembersTab isAdmin={access.isAdmin} />}
          {tab === 'certificates' && <CertificatesTab />}
          {tab === 'transfers' && <TransfersTab />}
          {tab === 'nominations' && <NominationsTab />}
          {tab === 'mine' && <MyEntries />}
        </>
      ) : <MyEntries />}
    </div>
  );
}
