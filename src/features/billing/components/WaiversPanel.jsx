import { useState } from 'react';
import { Button, Card, Input, Modal, Pagination, Select, StatusBadge, Table, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, label, money, toPaise } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useDecideWaiver, useRequestWaiver, useWaivers } from '../api';
import { useT } from '../../../context/LanguageContext';

// Accountant (maker) asks for a waiver on one bill.
export function WaiverRequestModal({ bill, onClose }) {
  const { t } = useT();
  const { values, bind, applyServerErrors } = useForm({ amount: bill.lateFee ? String(bill.lateFee / 100) : '', reason: '' });
  const req = useRequestWaiver({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={t('Waiver on {bill}', { bill: bill.billNumber })} description="Waivers above the late fee or full balance are refused. An admin approves before the bill changes."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={req.isPending} onClick={() => req.mutate({ bill: bill._id, amount: toPaise(values.amount), reason: values.reason }, { onError: applyServerErrors })}>Send for approval</Button></>}>
      <div className="grid gap-4">
        <Input label="Amount (₹)" type="number" min={1} required hint={t('Late fee {fee} · balance {balance}', { fee: money(bill.lateFee), balance: money(bill.balance) })} {...bind('amount')} />
        <Textarea label="Reason" required placeholder="e.g. Paid on time, bank credited late" {...bind('reason')} />
      </div>
    </Modal>
  );
}

function DecideModal({ waiver, decision, onClose }) {
  const { t } = useT();
  const [note, setNote] = useState('');
  const decide = useDecideWaiver();
  return (
    <Modal open onClose={onClose} title={t(decision === 'approve' ? 'Approve waiver {number}' : 'Reject waiver {number}', { number: waiver.number })} description={t('{amount} on {bill} · {unit}', { amount: money(waiver.amount), bill: waiver.bill?.billNumber, unit: waiver.unit?.label })}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={decision === 'approve' ? 'success' : 'danger'} loading={decide.isPending} onClick={() => decide.mutate({ id: waiver._id, decision, note: note || undefined }, { onSuccess: onClose })}>{decision === 'approve' ? t('Approve') : t('Reject')}</Button></>}>
      <p className="mb-3 text-sm text-slate-600">{t('Requested by {name}: “{reason}”', { name: waiver.requestedBy?.name, reason: waiver.reason })}</p>
      <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

export function WaiversPanel() {
  const { t } = useT();
  const { user } = useAuth();
  const isAdmin = user.role === ROLES.ADMIN;
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState(null);
  const { data, isLoading } = useWaivers({ status: status || undefined, page });
  const mine = (w) => String(w.requestedBy?._id) === String(user._id);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <p className="text-sm text-slate-500">{isAdmin ? t('Approve or reject waivers requested by the accountant. You cannot decide waivers you requested.') : t('Waivers you requested and their approval status.')}</p>
        <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All" options={['pending', 'approved', 'rejected'].map((s) => ({ value: s, label: label(s) }))} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No waivers"
        columns={[
          { key: 'number', header: 'Ref', render: (w) => <span className="font-medium text-slate-900">{w.number}</span> },
          { key: 'unit', header: 'Unit', render: (w) => w.unit?.label },
          { key: 'bill', header: 'Bill', render: (w) => w.bill?.billNumber },
          { key: 'amount', header: 'Amount', render: (w) => money(w.amount) },
          { key: 'reason', header: 'Reason', className: 'max-w-xs truncate', render: (w) => w.reason },
          { key: 'requestedBy', header: 'Requested', render: (w) => `${w.requestedBy?.name || ''} · ${date(w.createdAt)}` },
          { key: 'status', header: 'Status', render: (w) => <StatusBadge status={w.status} /> },
          ...(isAdmin
            ? [{ key: 'act', header: '', render: (w) => w.status === 'pending' && !mine(w) && (
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => setDeciding({ waiver: w, decision: 'approve' })}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeciding({ waiver: w, decision: 'reject' })}>Reject</Button>
              </div>
            ) }]
            : []),
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {deciding && <DecideModal {...deciding} onClose={() => setDeciding(null)} />}
    </Card>
  );
}
