import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HandCoins } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, FilterBar, Input, Modal, Pagination, Select, Spinner, StatusBadge, Table, Textarea } from '../../../components/ui';
import { date, label, money, toPaise, todayISO } from '../../../lib/format';
import { AccountSelect } from '../../accounting/components/common';
import { useCancelVendorPayment, useCreateVendorPayment, useVendorBills, useVendorPayment, useVendorPayments } from '../api';
import { PAYMENT_METHODS } from '../constants';
import { VendorPicker } from '../components/VendorPicker';
import { useT } from '../../../context/LanguageContext';
import { errorText } from '../../../lib/errorText';

function PaymentForm({ onClose, presetVendor, presetBill }) {
  const [vendor, setVendor] = useState(presetVendor || '');
  const [v, setV] = useState({ date: todayISO(), method: 'bank', account: '', reference: '', notes: '' });
  const [alloc, setAlloc] = useState({});
  const [error, setError] = useState('');
  const { data, isLoading } = useVendorBills({ vendor: vendor || undefined, open: true, limit: 100 });
  const bills = vendor ? data?.data || [] : [];
  const create = useCreateVendorPayment({ onSuccess: onClose });
  const { t } = useT();
  // Pre-fill the bill we came from with its full balance.
  if (presetBill && bills.length && alloc.__seeded !== presetBill) {
    const b = bills.find((x) => x._id === presetBill);
    if (b) setAlloc({ __seeded: presetBill, [b._id]: String(b.balance / 100) });
  }
  const allocations = bills.map((b) => ({ bill: b._id, amount: toPaise(alloc[b._id]) })).filter((a) => a.amount > 0);
  const amount = allocations.reduce((s, a) => s + a.amount, 0);
  const over = bills.find((b) => toPaise(alloc[b._id]) > b.balance);
  const submit = () => {
    setError('');
    create.mutate({ vendor, date: v.date, amount, method: v.method, account: v.account || undefined, reference: v.reference || undefined, notes: v.notes || undefined, allocations }, { onError: (e) => setError(errorText(e, t)) });
  };
  return (
    <Modal open onClose={onClose} size="lg" title="Pay vendor" description="Allocate the payment to one or more open bills. A bill cannot be overpaid."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!amount || Boolean(over)} loading={create.isPending} onClick={submit}>{t('Pay {amount}', { amount: money(amount) })}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <VendorPicker className="sm:col-span-2" required value={vendor} onChange={(id) => { setVendor(id); setAlloc({}); }} includeInactive />
        <Input label="Payment date" type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        <Select label="Mode" options={PAYMENT_METHODS} value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })} />
        <AccountSelect label="Paid from" bankOnly placeholder={v.method === 'cash' ? 'Cash in hand (default)' : 'Bank account (default 1000)'} value={v.account} onChange={(account) => setV({ ...v, account })} />
        <Input label="Reference" placeholder="UTR / cheque no." value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-slate-700">{t('Open bills')}</p>
        {!vendor ? <p className="text-sm text-slate-500">{t('Choose a vendor to see their unpaid bills.')}</p> : isLoading ? <Spinner /> : !bills.length ? <p className="text-sm text-slate-500">{t('No unpaid bills for this vendor.')}</p> : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {bills.map((b) => (
              <div key={b._id} className="grid grid-cols-[1fr_8rem] items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{t('{number} · invoice {billNo}', { number: b.number, billNo: b.billNo })}</p>
                  <p className="text-xs text-slate-500">{t('{date} · due {due} · balance {amount}', { date: date(b.billDate), due: date(b.dueDate), amount: money(b.balance) })}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" min={0} step="0.01" aria-label={t('Pay {number}', { number: b.number })} placeholder="₹" value={alloc[b._id] || ''} onChange={(e) => setAlloc({ ...alloc, [b._id]: e.target.value })}
                    error={toPaise(alloc[b._id]) > b.balance ? 'More than due' : undefined} />
                  <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setAlloc({ ...alloc, [b._id]: String(b.balance / 100) })}>{t('Full')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Textarea className="mt-4" rows={2} label="Notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function PaymentDetail({ id, onClose }) {
  const { data: p, isLoading } = useVendorPayment(id);
  const [reason, setReason] = useState('');
  const cancel = useCancelVendorPayment({ onSuccess: onClose });
  const { t } = useT();
  return (
    <Modal open onClose={onClose} title={p ? `${p.number} · ${p.vendor?.name}` : 'Vendor payment'} description={p && `${date(p.date)} · ${t('{method} from {account}', { method: t(label(p.method)), account: p.account })}${p.reference ? ` · ${p.reference}` : ''}`}
      footer={p?.status === 'posted' && <Button variant="danger" disabled={reason.trim().length < 3} loading={cancel.isPending} onClick={() => cancel.mutate({ id: p._id, reason })}>Cancel payment</Button>}>
      {isLoading || !p ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between"><StatusBadge status={p.status === 'posted' ? 'paid' : 'cancelled'} /><span className="text-lg font-semibold">{money(p.amount)}</span></div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {p.allocations.map((a) => <li key={a.bill?._id} className="flex justify-between px-3 py-2"><span>{t('{number} · invoice {billNo}', { number: a.bill?.number, billNo: a.bill?.billNo })}</span><span className="tabular-nums">{money(a.amount)}</span></li>)}
          </ul>
          {p.notes && <p className="text-slate-600">{p.notes}</p>}
          {p.cancelReason && <p className="rounded-lg bg-slate-50 px-3 py-2">{t('Cancelled: {reason}', { reason: p.cancelReason })}</p>}
          {p.status === 'posted' && <Textarea label="Reason to cancel (e.g. cheque not issued)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </div>
      )}
    </Modal>
  );
}

export default function VendorPaymentsPage() {
  const [params, setParams] = useSearchParams();
  const presetVendor = params.get('vendor');
  const presetBill = params.get('bill');
  const [adding, setAdding] = useState(Boolean(presetVendor));
  const [openId, setOpenId] = useState(null);
  const [filters, setFilters] = useState({ vendor: '', method: '', status: '', from: '', to: '', search: '', page: 1 });
  const { data, isLoading } = useVendorPayments(Object.fromEntries(Object.entries(filters).filter(([, x]) => x !== '')));
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e?.target ? e.target.value : e, page: 1 }));
  const { t } = useT();
  const closeAdd = () => {
    setAdding(false);
    if (presetVendor) setParams((p) => { p.delete('vendor'); p.delete('bill'); return p; }, { replace: true });
  };
  return (
    <div>
      <PageHeader title="Vendor payments" description="Money paid to vendors against their bills." actions={<Button icon={HandCoins} onClick={() => setAdding(true)}>Pay vendor</Button>} />
      <Card>
        <FilterBar cols={3} active={[filters.vendor, filters.method, filters.status, filters.from, filters.to].filter(Boolean).length}
          search={<Input label="Search" placeholder="Payment no. or reference" value={filters.search} onChange={set('search')} />}>
          <VendorPicker label="Vendor" placeholder="All vendors" includeInactive value={filters.vendor} onChange={set('vendor')} />
          <Select label="Mode" placeholder="Any mode" options={PAYMENT_METHODS} value={filters.method} onChange={set('method')} />
          <Select label="Status" placeholder="Posted and cancelled" options={[{ value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }]} value={filters.status} onChange={set('status')} />
          <Input label="From" type="date" value={filters.from} max={filters.to || undefined} onChange={set('from')} />
          <Input label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} />
        </FilterBar>
        <Table loading={isLoading} rows={data?.data} empty="No vendor payments" onRowClick={(p) => setOpenId(p._id)}
          columns={[
            { key: 'number', header: 'Payment', render: (p) => <span className="font-mono text-xs font-semibold">{p.number}</span> },
            { key: 'vendor', header: 'Vendor', render: (p) => p.vendor?.name },
            { key: 'date', header: 'Date', render: (p) => date(p.date) },
            { key: 'method', header: 'Mode', render: (p) => <div><p>{t(label(p.method))}</p>{p.reference && <p className="text-xs text-slate-500">{p.reference}</p>}</div> },
            { key: 'bills', header: 'Bills', render: (p) => <span className="text-xs">{p.allocations.map((a) => a.bill?.number).join(', ')}</span> },
            { key: 'amount', header: 'Amount', className: 'text-right', render: (p) => <span className="tabular-nums font-medium">{money(p.amount)}</span> },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status === 'posted' ? 'paid' : 'cancelled'} /> },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {adding && <PaymentForm onClose={closeAdd} presetVendor={presetVendor} presetBill={presetBill} />}
      {openId && <PaymentDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
