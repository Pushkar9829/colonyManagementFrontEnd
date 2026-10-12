import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, FilePlus2, IndianRupee, Play, Plus, Receipt, Repeat } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, CardHeader, FilterBar, Input, Modal, Pagination, Select, Spinner, StatCard, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, label, money, todayISO } from '../../../lib/format';
import { DateRange, DownloadButtons } from '../../accounting/components/common';
import { defaultRange } from '../../accounting/lib';
import { useAgeing, useCancelVendorBill, useExpenseReport, useRecurring, useRunRecurring, useUpdateRecurring, useVendorBill, useVendorBills } from '../api';
import { BILL_STATUSES } from '../constants';
import { VendorPicker } from '../components/VendorPicker';
import { RecurringForm, VendorBillForm } from '../components/VendorBillForm';

const overdue = (b) => ['unpaid', 'partial'].includes(b.status) && b.dueDate < todayISO();

function BillDetail({ id, onClose }) {
  const navigate = useNavigate();
  const { data: b, isLoading } = useVendorBill(id);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const cancel = useCancelVendorBill({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} size="lg" title={b ? `${b.number} · ${b.vendor?.name}` : 'Vendor bill'} description={b && `Invoice ${b.billNo} · ${date(b.billDate)} · due ${date(b.dueDate)}`}
      footer={b && b.status !== 'cancelled' && (
        <>
          {b.paid === 0 && (cancelling
            ? <Button variant="danger" disabled={reason.trim().length < 3} loading={cancel.isPending} onClick={() => cancel.mutate({ id: b._id, reason })}>Confirm cancel</Button>
            : <Button variant="ghost" onClick={() => setCancelling(true)}>Cancel bill</Button>)}
          {b.balance > 0 && <Button icon={IndianRupee} onClick={() => navigate(`/expenses/payments?vendor=${b.vendor._id}&bill=${b._id}`)}>Pay {money(b.balance)}</Button>}
        </>
      )}>
      {isLoading || !b ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            {overdue(b) && <Badge tone="red">Overdue</Badge>}
            {b.purchaseRequest && <span className="text-slate-600">Against {b.purchaseRequest.number}</span>}
            {b.recurringPeriod && <Badge tone="blue">Recurring · {b.recurringPeriod}</Badge>}
          </div>
          <table className="min-w-full overflow-hidden rounded-lg border border-slate-200">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {b.lines.map((l, n) => <tr key={n}><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2 font-mono text-xs">{l.account}</td><td className="px-3 py-2 text-right tabular-nums">{money(l.amount)}</td></tr>)}
              <tr><td className="px-3 py-1.5 text-slate-500" colSpan={2}>Subtotal</td><td className="px-3 py-1.5 text-right tabular-nums">{money(b.subtotal)}</td></tr>
              {b.gstAmount > 0 && <tr><td className="px-3 py-1.5 text-slate-500" colSpan={2}>GST {b.claimGst ? '(input credit)' : '(part of cost)'}</td><td className="px-3 py-1.5 text-right tabular-nums">{money(b.gstAmount)}</td></tr>}
              <tr className="font-semibold"><td className="px-3 py-1.5" colSpan={2}>Invoice total</td><td className="px-3 py-1.5 text-right tabular-nums">{money(b.total)}</td></tr>
              {b.tdsAmount > 0 && <tr><td className="px-3 py-1.5 text-slate-500" colSpan={2}>TDS {b.tdsRate}% {b.tdsSection || ''} withheld</td><td className="px-3 py-1.5 text-right tabular-nums">−{money(b.tdsAmount)}</td></tr>}
              <tr className="font-semibold"><td className="px-3 py-1.5" colSpan={2}>Payable · paid {money(b.paid)}</td><td className="px-3 py-1.5 text-right tabular-nums">{money(b.payable)}</td></tr>
            </tbody>
          </table>
          {b.payments.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-900">Payments</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {b.payments.map((p) => <li key={p._id} className={cn('flex justify-between px-3 py-2', p.status === 'cancelled' && 'text-slate-400 line-through')}><span>{p.number} · {date(p.date)} · {label(p.method)}{p.reference ? ` · ${p.reference}` : ''}</span><span className="tabular-nums">{money(p.amount)}</span></li>)}
              </ul>
            </div>
          )}
          {b.notes && <p className="text-slate-600">{b.notes}</p>}
          <Attachments items={b.attachments} />
          {b.cancelReason && <p className="rounded-lg bg-slate-50 px-3 py-2">Cancelled: {b.cancelReason}</p>}
          {cancelling && <Textarea label="Reason for cancelling" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </div>
      )}
    </Modal>
  );
}

function Bills({ initialFilter, onOpen }) {
  const [range, setRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({ vendor: '', status: '', due: initialFilter || '', search: '', page: 1 });
  const params = {
    page: filters.page, vendor: filters.vendor || undefined, status: filters.status || undefined, search: filters.search || undefined,
    open: filters.due === 'open' || undefined, overdue: filters.due === 'overdue' || undefined, from: range.from || undefined, to: range.to || undefined,
  };
  const { data, isLoading } = useVendorBills(params);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e?.target ? e.target.value : e, page: 1 }));
  return (
    <Card>
      <FilterBar cols={5} active={[filters.vendor, filters.status, filters.due, range.from, range.to].filter(Boolean).length}
        search={<Input label="Search" placeholder="Invoice or bill no." value={filters.search} onChange={set('search')} />}>
        <VendorPicker label="Vendor" placeholder="All vendors" includeInactive value={filters.vendor} onChange={set('vendor')} />
        <Select label="Status" placeholder="Any status" options={BILL_STATUSES} value={filters.status} onChange={set('status')} />
        <Select label="Payment" placeholder="Any" options={[{ value: 'open', label: 'Unpaid / partly paid' }, { value: 'overdue', label: 'Overdue' }]} value={filters.due} onChange={set('due')} />
        <Input label="Bill date from" type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <Input label="Bill date to" type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
      </FilterBar>
      <Table loading={isLoading} rows={data?.data} empty="No vendor bills" onRowClick={(b) => onOpen(b._id)}
        columns={[
          { key: 'number', header: 'Bill', render: (b) => <div><p className="font-mono text-xs font-semibold">{b.number}</p><p className="text-xs text-slate-500">{b.billNo}</p></div> },
          { key: 'vendor', header: 'Vendor', render: (b) => b.vendor?.name },
          { key: 'billDate', header: 'Date', mobile: false, render: (b) => date(b.billDate) },
          { key: 'dueDate', header: 'Due', render: (b) => <span className={overdue(b) ? 'font-medium text-red-600' : ''}>{date(b.dueDate)}</span> },
          { key: 'total', header: 'Total', className: 'text-right', mobile: false, render: (b) => <span className="tabular-nums">{money(b.total)}</span> },
          { key: 'balance', header: 'Balance', className: 'text-right', render: (b) => <span className={cn('tabular-nums', b.balance ? 'font-medium text-slate-900' : 'text-slate-400')}>{money(b.balance)}</span> },
          { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}

function Recurring() {
  const { data, isLoading } = useRecurring();
  const [adding, setAdding] = useState(false);
  const update = useUpdateRecurring();
  const run = useRunRecurring();
  return (
    <Card>
      <CardHeader title="Recurring expenses" subtitle="Monthly contracts that raise a vendor bill automatically" action={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Add</Button>} />
      <Table loading={isLoading} rows={data} empty="No recurring expenses"
        columns={[
          { key: 'name', header: 'Name', render: (t) => <div><p className="font-medium text-slate-900">{t.name}</p><p className="text-xs text-slate-500">{t.vendor?.name}</p></div> },
          { key: 'amount', header: 'Amount', className: 'text-right', render: (t) => <span className="tabular-nums">{money(t.lines.reduce((s, l) => s + l.amount, 0) + (t.gstAmount || 0))}</span> },
          { key: 'day', header: 'Bills on', render: (t) => `Day ${t.dayOfMonth}` },
          { key: 'last', header: 'Last bill', render: (t) => (t.lastBill ? `${t.lastBill.number} · ${date(t.lastBill.billDate)}` : '—') },
          { key: 'active', header: 'Status', render: (t) => <StatusBadge status={t.active ? 'active' : 'inactive'} /> },
          { key: 'actions', header: '', className: 'text-right', render: (t) => (
            <div className="flex justify-end gap-1">
              {t.active && <Button size="sm" variant="ghost" icon={Play} loading={run.isPending && run.variables === t._id} onClick={() => run.mutate(t._id)}>Bill now</Button>}
              <Button size="sm" variant="ghost" loading={update.isPending && update.variables?.id === t._id} onClick={() => update.mutate({ id: t._id, active: !t.active })}>{t.active ? 'Pause' : 'Resume'}</Button>
            </div>
          ) },
        ]} />
      {adding && <RecurringForm onClose={() => setAdding(false)} />}
    </Card>
  );
}

function Ageing() {
  const [asOf, setAsOf] = useState(todayISO());
  const { data, isLoading } = useAgeing({ asOf });
  return (
    <Card>
      <CardHeader title="Unpaid vendor bills by age" subtitle="How long each unpaid bill has been waiting, counted from the bill date"
        action={<div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-slate-700">As of</span><Input type="date" aria-label="As of" value={asOf} onChange={(e) => setAsOf(e.target.value)} /><DownloadButtons path="/expenses/reports/ageing" query={{ asOf }} filename={`payables-ageing-${asOf}`} /></div>} />
      {isLoading || !data ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-3 p-4 sm:grid-cols-5">
            {data.buckets.map((b) => <StatCard key={b.key} label={b.label} value={money(data.totals[b.key])} tone={b.key === 'd90_plus' ? 'red' : b.key === 'd61_90' ? 'amber' : 'brand'} />)}
            <StatCard label="Overdue" value={money(data.totals.overdue)} tone="red" icon={AlertTriangle} />
          </div>
          <Table rows={data.rows} rowKey="vendorId" empty="Nothing owed to vendors"
            columns={[
              { key: 'vendor', header: 'Vendor', render: (r) => <span className="font-medium text-slate-900">{r.vendor}</span> },
              ...data.buckets.map((b) => ({ key: b.key, header: b.label, className: 'text-right', render: (r) => (r[b.key] ? <span className="tabular-nums">{money(r[b.key])}</span> : <span className="text-slate-300">—</span>) })),
              { key: 'total', header: 'Total', className: 'text-right', render: (r) => <span className="font-semibold tabular-nums">{money(r.total)}</span> },
              { key: 'overdue', header: 'Overdue', className: 'text-right', render: (r) => (r.overdue ? <span className="tabular-nums text-red-600">{money(r.overdue)}</span> : '—') },
            ]} />
        </>
      )}
    </Card>
  );
}

function ExpenseReport() {
  const [range, setRange] = useState(defaultRange());
  const [groupBy, setGroupBy] = useState('account');
  const query = { ...range, groupBy };
  const { data, isLoading } = useExpenseReport(query);
  const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  return (
    <Card>
      <CardHeader title="Expenses by month" subtitle={groupBy === 'account' ? 'All expense accounts in the books' : 'Vendor bills by vendor category'}
        action={<DownloadButtons path="/expenses/reports/expenses" query={query} filename={`expenses-${range.to}`} />} />
      <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_3fr]">
        <Select label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} options={[{ value: 'account', label: 'By account' }, { value: 'category', label: 'By vendor category' }]} />
        <DateRange value={range} onChange={setRange} />
      </div>
      {isLoading || !data ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="sticky left-0 bg-slate-50 px-4 py-2.5 text-left">{groupBy === 'account' ? 'Account' : 'Category'}</th>{data.months.map((m) => <th key={m} className="px-3 py-2.5 text-right">{monthLabel(m)}</th>)}<th className="px-4 py-2.5 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.key}>
                  <td className="sticky left-0 bg-white px-4 py-2 whitespace-nowrap">{r.label}</td>
                  {data.months.map((m) => <td key={m} className="px-3 py-2 text-right tabular-nums">{r.months[m] ? money(r.months[m]) : <span className="text-slate-300">—</span>}</td>)}
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{money(r.total)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold"><td className="sticky left-0 bg-slate-50 px-4 py-2">Total</td>{data.months.map((m) => <td key={m} className="px-3 py-2 text-right tabular-nums">{money(data.totals[m])}</td>)}<td className="px-4 py-2 text-right tabular-nums">{money(data.total)}</td></tr>
            </tbody>
          </table>
          {!data.rows.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No expenses in this period.</p>}
        </div>
      )}
    </Card>
  );
}

function Stats() {
  const { data } = useAgeing({});
  if (!data) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
      <StatCard icon={Receipt} label="Owed to vendors" value={money(data.totals.total)} sub={`${data.totals.bills} open bills`} />
      <StatCard icon={AlertTriangle} tone="red" label="Overdue" value={money(data.totals.overdue)} />
      <StatCard icon={Repeat} tone="amber" label="Older than 60 days" value={money(data.totals.d61_90 + data.totals.d90_plus)} />
    </div>
  );
}

export default function VendorBillsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('bills');
  const [openId, setOpenId] = useState(null);
  const fromPr = params.get('fromPr');
  const [adding, setAdding] = useState(Boolean(fromPr));
  const closeAdd = () => {
    setAdding(false);
    if (fromPr) setParams((p) => { p.delete('fromPr'); return p; }, { replace: true });
  };
  return (
    <div>
      <PageHeader title="Vendor bills" description="Supplier invoices with GST and TDS, recurring contracts and what the society owes."
        actions={<Button icon={FilePlus2} onClick={() => setAdding(true)}>Record bill</Button>} />
      <Stats />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab}
        tabs={[{ value: 'bills', label: 'Bills' }, { value: 'recurring', label: 'Recurring' }, { value: 'ageing', label: 'Overdue by age' }, { value: 'report', label: 'Expense report' }]} />
      {tab === 'bills' && <Bills initialFilter={params.get('filter') || ''} onOpen={setOpenId} />}
      {tab === 'recurring' && <Recurring />}
      {tab === 'ageing' && <Ageing />}
      {tab === 'report' && <ExpenseReport />}
      {adding && <VendorBillForm onClose={closeAdd} fromPr={fromPr} />}
      {openId && <BillDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
