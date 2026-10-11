import { useState } from 'react';
import { Button, Card, CardHeader, Input, Modal, Pagination, Select, StatusBadge, Table, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { date, label, money, toPaise, todayISO } from '../../../lib/format';
import { UnitPicker } from '../../units/components/UnitPicker';
import { useAdjustments, useCreditHolders, useIssueCredit, useRecordAdvance, useRefund } from '../api';

const METHODS = ['upi', 'cash', 'cheque', 'bank'].map((m) => ({ value: m, label: label(m) }));
const noon = (d) => (d ? new Date(`${d}T12:00:00`).toISOString() : undefined);

// Money received without a bill; it is used automatically on the unit's next bills.
export function AdvanceModal({ onClose }) {
  const [unit, setUnit] = useState('');
  const { values, bind, errors, applyServerErrors } = useForm({ amount: '', method: 'upi', reference: '', paidAt: todayISO(), notes: '' });
  const rec = useRecordAdvance({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Record advance payment" description="Held as credit and adjusted against the unit's next bills."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!unit} loading={rec.isPending} onClick={() => rec.mutate({ unit, amount: toPaise(values.amount), method: values.method, reference: values.reference || undefined, paidAt: noon(values.paidAt), notes: values.notes || undefined }, { onError: applyServerErrors })}>Save advance</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><UnitPicker value={unit} onChange={(id) => setUnit(id)} error={errors.unit} required /></div>
        <Input label="Amount (₹)" type="number" min={1} required {...bind('amount')} />
        <Select label="Mode" options={METHODS} {...bind('method')} />
        <Input label="Reference" placeholder="UTR / cheque no." {...bind('reference')} />
        <Input label="Received on" type="date" {...bind('paidAt')} />
        <Input className="sm:col-span-2" label="Note" {...bind('notes')} />
      </div>
    </Modal>
  );
}

function RefundModal({ holder, onClose }) {
  const { values, bind, applyServerErrors } = useForm({ amount: String(holder.balance / 100), method: 'bank', reference: '', reason: '' });
  const refund = useRefund({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`Refund advance · ${holder.unit.label}`} description={`Advance balance ${money(holder.balance)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={refund.isPending} onClick={() => refund.mutate({ unit: holder.unit._id, amount: toPaise(values.amount), method: values.method, reference: values.reference || undefined, reason: values.reason || undefined }, { onError: applyServerErrors })}>Record refund</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Amount (₹)" type="number" min={1} required {...bind('amount')} />
        <Select label="Paid back by" options={METHODS} {...bind('method')} />
        <Input className="sm:col-span-2" label="Reference" placeholder="UTR / cheque no." {...bind('reference')} />
        <Textarea className="sm:col-span-2" label="Reason" {...bind('reason')} />
      </div>
    </Modal>
  );
}

function CreditNoteModal({ onClose }) {
  const [unit, setUnit] = useState('');
  const { values, bind, applyServerErrors } = useForm({ amount: '', reason: '' });
  const issue = useIssueCredit({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Issue credit note" description="Adds credit without any money received, e.g. a goodwill credit approved by the committee."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!unit} loading={issue.isPending} onClick={() => issue.mutate({ unit, amount: toPaise(values.amount), reason: values.reason }, { onError: applyServerErrors })}>Issue credit</Button></>}>
      <div className="grid gap-4">
        <UnitPicker value={unit} onChange={(id) => setUnit(id)} required />
        <Input label="Amount (₹)" type="number" min={1} required {...bind('amount')} />
        <Textarea label="Reason" required {...bind('reason')} />
      </div>
    </Modal>
  );
}

const TYPES = ['advance', 'credit', 'credit_applied', 'refund', 'waiver', 'bounce_charge', 'opening_balance'];

export function CreditsPanel() {
  const { data: holders, isLoading } = useCreditHolders();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data: adj, isLoading: adjLoading } = useAdjustments({ type: type || undefined, page });
  const [modal, setModal] = useState(null);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Advance balances" subtitle="Credit held per unit. It is applied automatically when the next bill is generated." action={<Button size="sm" variant="secondary" onClick={() => setModal({ kind: 'credit' })}>Issue credit note</Button>} />
        <Table loading={isLoading} rows={holders} empty="No unit holds an advance"
          columns={[
            { key: 'unit', header: 'Unit', render: (h) => <span className="font-medium text-slate-900">{h.unit?.label}</span> },
            { key: 'balance', header: 'Advance', render: (h) => <span className="font-semibold text-emerald-700">{money(h.balance)}</span> },
            { key: 'updatedAt', header: 'Last change', render: (h) => date(h.updatedAt) },
            { key: 'act', header: '', render: (h) => <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'refund', holder: h })}>Refund</Button> },
          ]} />
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <p className="font-semibold text-slate-900">Adjustments</p>
          <Select className="w-52" placeholder="All types" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} options={TYPES.map((t) => ({ value: t, label: label(t) }))} />
        </div>
        <Table loading={adjLoading} rows={adj?.data} empty="No adjustments"
          columns={[
            { key: 'number', header: 'Ref', render: (a) => <span className="font-medium text-slate-900">{a.number}</span> },
            { key: 'createdAt', header: 'Date', render: (a) => date(a.createdAt) },
            { key: 'unit', header: 'Unit', render: (a) => a.unit?.label },
            { key: 'type', header: 'Type', render: (a) => label(a.type) },
            { key: 'amount', header: 'Amount', render: (a) => money(a.amount) },
            { key: 'bill', header: 'Bill / receipt', render: (a) => a.bill?.billNumber || a.payment?.receiptNumber || '—' },
            { key: 'reason', header: 'Details', className: 'max-w-xs truncate', render: (a) => [a.reason, a.method && `${label(a.method)} ${a.reference || ''}`].filter(Boolean).join(' · ') },
            { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          ]} />
        <Pagination meta={adj?.meta} onPage={setPage} />
      </Card>
      {modal?.kind === 'refund' && <RefundModal holder={modal.holder} onClose={() => setModal(null)} />}
      {modal?.kind === 'credit' && <CreditNoteModal onClose={() => setModal(null)} />}
    </div>
  );
}
