import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FilePlus2, FileUp, HandCoins, IndianRupee, Percent, PiggyBank, Receipt, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, FilterBar, Input, Modal, Pagination, Select, StatCard, StatusBadge, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { currentPeriod, date, label, money, periodLabel, toPaise, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { UnitPicker } from '../../units/components/UnitPicker';
import {
  useApplyLateFees,
  useBillingSummary,
  useBills,
  useCancelBill,
  useDefaulters,
  useGenerateBills,
  usePayOnline,
  usePayments,
  useRecordPayment,
  useStatement,
} from '../api';
import { BillDetailModal } from '../components/BillDetailModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { StatementPanel } from '../components/StatementPanel';
import { WaiverRequestModal, WaiversPanel } from '../components/WaiversPanel';
import { AdvanceModal, CreditsPanel } from '../components/CreditsPanel';
import { AutopayCard, MandatesPanel } from '../components/AutopayPanels';
import { OpeningBalancesModal } from '../components/OpeningBalancesModal';
import { SendOnWhatsApp } from '../../whatsapp/components/SendOnWhatsApp';

const periodText = (p) => (p === 'OPENING' ? 'Opening balance' : periodLabel(p));

// Finance staff: this month's numbers, labelled with the month, plus all-time dues so the tiles
// line up with the dashboard (which shows dues across every month).
function SummaryCards({ period }) {
  const { data: s } = useBillingSummary(period);
  const { data: all } = useBillingSummary(undefined);
  if (!s) return null;
  const rate = s.billed ? Math.round((s.collected / s.billed) * 100) : 0;
  const month = periodLabel(period);
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard icon={Receipt} label={`Billed · ${month}`} value={money(s.billed)} sub={`${s.bills} bills`} />
      <StatCard icon={Wallet} tone="green" label={`Collected · ${month}`} value={money(s.collected)} sub={`${rate}% of this month's bills`} />
      <StatCard icon={IndianRupee} tone="amber" label={`Outstanding · ${month}`} value={money(s.outstanding)} sub="Unpaid on this month's bills" />
      <StatCard icon={AlertTriangle} tone="red" label={`Overdue · ${month}`} value={money(s.overdue)} sub="Past due date" />
      <StatCard icon={IndianRupee} tone={all?.outstanding ? 'red' : 'green'} label="All-time dues" value={all ? money(all.outstanding) : '…'} sub={all?.overdue ? `${money(all.overdue)} overdue, all months` : 'Nothing overdue'} />
    </div>
  );
}

const isOpen = (b) => b.balance > 0 && ['unpaid', 'partial'].includes(b.status);
const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Resident: what is due right now and one big button to pay it (oldest open bill first).
function DueHero({ onPay, paying }) {
  const { data: bills, isLoading } = useBills({ limit: 100 });
  const { data: s } = useBillingSummary(undefined);
  if (isLoading || !bills) return null;
  const open = (bills.data || []).filter(isOpen).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (!open.length) {
    return (
      <Card className="mb-4 flex items-center gap-3 border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="size-8 shrink-0 text-emerald-600" />
        <div>
          <p className="text-lg font-semibold text-emerald-800">You're all paid up</p>
          {s?.advance > 0 && <p className="text-sm text-emerald-700">{money(s.advance)} advance balance · used on your next bills</p>}
        </div>
      </Card>
    );
  }
  const first = open[0];
  const total = open.reduce((sum, b) => sum + b.balance, 0);
  const late = new Date(first.dueDate) < new Date();
  return (
    <Card className="mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {open.length > 1 ? (
          <p className="text-2xl font-bold text-slate-900">{open.length} bills · {money(total)} due</p>
        ) : (
          <p className="text-2xl font-bold text-slate-900">{money(first.balance)} due by {shortDate(first.dueDate)}</p>
        )}
        <p className={late ? 'text-sm font-medium text-red-600' : 'text-sm text-slate-500'}>
          {late ? `Overdue since ${shortDate(first.dueDate)}` : `${periodText(first.period)} · ${first.billNumber}`}
          {open.length > 1 && ` · Pay now pays the oldest (${money(first.balance)})`}
        </p>
      </div>
      <Button size="lg" className="w-full sm:w-auto" loading={paying === first._id} onClick={() => onPay(first._id)}>Pay now</Button>
    </Card>
  );
}

// Resident tiles: just the three numbers a household cares about.
function ResidentSummary() {
  const { data: s } = useBillingSummary(undefined);
  const year = todayISO().slice(0, 4);
  const { data: st } = useStatement({ from: `${year}-01-01` });
  if (!s) return null;
  // Money actually paid this year: payments, less any that bounced (waivers and credit notes are not payments).
  const paidThisYear = st ? st.entries.reduce((sum, e) => sum + (e.type === 'payment' ? e.credit : e.type === 'bounce' ? -e.debit : 0), 0) : null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
      <StatCard icon={IndianRupee} tone={s.outstanding ? 'amber' : 'green'} label="Due now" value={money(s.outstanding)} sub={s.overdue ? `${money(s.overdue)} overdue` : undefined} />
      <StatCard icon={Wallet} tone="green" label={`Paid in ${year}`} value={paidThisYear == null ? '…' : money(paidThisYear)} />
      <StatCard icon={PiggyBank} tone="green" label="Advance balance" value={money(s.advance)} sub="Used on your next bills" />
    </div>
  );
}

function GenerateModal({ open, onClose }) {
  const { values, bind, applyServerErrors } = useForm({ period: currentPeriod(), dueDate: '', extraHead: '', extraAmount: '', notes: '' });
  const gen = useGenerateBills({ onSuccess: onClose });
  const submit = () =>
    gen.mutate(
      {
        period: values.period,
        dueDate: values.dueDate || undefined,
        notes: values.notes || undefined,
        extraLines: values.extraHead && values.extraAmount ? [{ head: values.extraHead, amount: toPaise(values.extraAmount) }] : undefined,
      },
      { onError: applyServerErrors },
    );
  return (
    <Modal open={open} onClose={onClose} title="Generate maintenance bills"
      description="One bill per unit using Society Settings and Finance Settings: charge heads, GST, non-occupancy charges, metered utilities and pending bounce charges. Advance credit is adjusted and autopay is charged automatically."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={gen.isPending} onClick={submit}>Generate</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Billing month" type="month" required {...bind('period')} />
        <Input label="Due date" type="date" hint="Default: as per settings" {...bind('dueDate')} />
        <Input label="One-time charge (optional)" placeholder="e.g. Festival fund" {...bind('extraHead')} />
        <Input label="Amount (₹)" type="number" min={0} {...bind('extraAmount')} />
        <Input className="sm:col-span-2" label="Note on bill" {...bind('notes')} />
      </div>
    </Modal>
  );
}

function RecordPaymentModal({ open, onClose, presetBill }) {
  const [unit, setUnit] = useState('');
  const [keepExcess, setKeepExcess] = useState(true);
  const { values, bind, set, applyServerErrors, errors } = useForm({ bill: '', amount: presetBill ? String(presetBill.balance / 100) : '', method: 'upi', reference: '', paidAt: todayISO() });
  const { data: bills } = useBills({ unit: unit || undefined, status: undefined, limit: 50 });
  const openBills = presetBill ? [presetBill] : (bills?.data || []).filter((b) => unit && ['unpaid', 'partial'].includes(b.status));
  const record = useRecordPayment({ onSuccess: onClose });
  const billId = presetBill?._id || values.bill;
  const selected = openBills.find((b) => b._id === billId);
  const excess = selected ? toPaise(values.amount) - selected.balance : 0;

  return (
    <Modal open={open} onClose={onClose} title="Record offline payment"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!billId} loading={record.isPending}
        onClick={() => record.mutate({ bill: billId, amount: toPaise(values.amount), method: values.method, reference: values.reference || undefined, paidAt: values.paidAt ? new Date(`${values.paidAt}T12:00:00`).toISOString() : undefined, excessAsAdvance: excess > 0 && keepExcess ? true : undefined }, { onError: applyServerErrors })}>Save payment</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!presetBill && <div className="sm:col-span-2"><UnitPicker value={unit} onChange={(id) => { setUnit(id); set('bill', ''); }} /></div>}
        <Select className="sm:col-span-2" label="Bill" required placeholder={unit || presetBill ? 'Select bill' : 'Pick a unit first'} error={errors.bill}
          options={openBills.map((b) => ({ value: b._id, label: `${b.billNumber} · ${periodText(b.period)} · due ${money(b.balance)}` }))}
          value={billId} onChange={(e) => { set('bill', e.target.value); const b = openBills.find((x) => x._id === e.target.value); if (b) set('amount', String(b.balance / 100)); }} disabled={Boolean(presetBill)} />
        <Input label="Amount (₹)" type="number" min={1} required hint={selected ? `Balance ${money(selected.balance)}` : undefined} {...bind('amount')} />
        <Select label="Mode" options={['upi', 'cash', 'cheque', 'bank'].map((m) => ({ value: m, label: label(m) }))} {...bind('method')} />
        <Input label="Reference" placeholder="UTR / cheque no." {...bind('reference')} />
        <Input label="Paid on" type="date" {...bind('paidAt')} />
        {excess > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
            <Checkbox label={`Keep the extra ${money(excess)} as advance for future bills`} checked={keepExcess} onChange={(e) => setKeepExcess(e.target.checked)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function PayAdvanceModal({ onClose }) {
  const [amount, setAmount] = useState('');
  const pay = usePayOnline({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Pay in advance" description="The amount is kept as credit and adjusted against your next bills."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!(Number(amount) >= 1)} loading={pay.isPending} onClick={() => pay.mutate({ advance: toPaise(amount) })}>Pay {amount ? money(toPaise(amount)) : ''}</Button></>}>
      <Input label="Amount (₹)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
    </Modal>
  );
}

function BillsTable({ finance, onOpen, onPay, payingId }) {
  const [filters, setFilters] = useState({ period: '', status: '', overdue: '', page: 1 });
  const { data, isLoading } = useBills({ period: filters.period || undefined, status: filters.status || undefined, overdue: filters.overdue || undefined, page: filters.page });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      {finance && (
        <FilterBar cols={3} active={[filters.period, filters.status, filters.overdue].filter(Boolean).length}>
          <Input label="Bill month" type="month" value={filters.period} onChange={set('period')} />
          <Select label="Status" placeholder="All statuses" value={filters.status} onChange={set('status')} options={['unpaid', 'partial', 'paid', 'cancelled'].map((s) => ({ value: s, label: label(s) }))} />
          <Select label="Due date" placeholder="Any due date" value={filters.overdue} onChange={set('overdue')} options={[{ value: 'true', label: 'Overdue only' }]} />
        </FilterBar>
      )}
      <Table
        loading={isLoading}
        rows={data?.data}
        empty="No bills yet"
        emptyHint={finance ? "Generate this month's maintenance bills to get started." : 'Your maintenance bills will appear here when the society raises them.'}
        onRowClick={(b) => onOpen(b._id)}
        columns={[
          { key: 'billNumber', header: 'Bill', render: (b) => <span className="font-medium text-slate-900">{b.billNumber}</span> },
          ...(finance ? [{ key: 'unit', header: 'Unit', render: (b) => b.unit?.label }] : []),
          { key: 'period', header: 'Month', render: (b) => periodText(b.period) },
          { key: 'total', header: 'Total', render: (b) => money(b.total) },
          { key: 'balance', header: 'Balance', render: (b) => <span className={b.balance ? 'font-medium text-slate-900' : 'text-slate-400'}>{money(b.balance)}</span> },
          { key: 'dueDate', header: 'Due', render: (b) => <span className={b.balance && new Date(b.dueDate) < new Date() ? 'text-red-600' : ''}>{date(b.dueDate)}</span> },
          { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
          ...(!finance
            ? [{ key: 'pay', header: '', render: (b) => b.balance > 0 && b.status !== 'cancelled' && <Button size="sm" loading={payingId === b._id} onClick={(e) => { e.stopPropagation(); onPay(b._id); }}>Pay {money(b.balance)}</Button> }]
            : []),
        ]}
      />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}

function PaymentsTable({ finance, onReceipt }) {
  const [filters, setFilters] = useState({ page: 1, status: '', purpose: '', method: '' });
  const { data, isLoading } = usePayments({ page: filters.page, status: filters.status || undefined, purpose: filters.purpose || undefined, method: filters.method || undefined });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      {finance && (
        <FilterBar cols={3} active={[filters.status, filters.purpose, filters.method].filter(Boolean).length}>
          <Select label="Status" placeholder="Received & bounced" value={filters.status} onChange={set('status')} options={[{ value: 'success', label: 'Received' }, { value: 'bounced', label: 'Bounced' }, { value: 'failed', label: 'Failed' }]} />
          <Select label="Type" placeholder="Bills & advances" value={filters.purpose} onChange={set('purpose')} options={[{ value: 'bill', label: 'Against bills' }, { value: 'advance', label: 'Advances' }]} />
          <Select label="Mode" placeholder="Any mode" value={filters.method} onChange={set('method')} options={['upi', 'cash', 'cheque', 'bank', 'online', 'autopay'].map((m) => ({ value: m, label: label(m) }))} />
        </FilterBar>
      )}
      <Table loading={isLoading} rows={data?.data} empty="No payments yet" onRowClick={(p) => p.receiptNumber && onReceipt(p._id)}
        columns={[
          { key: 'receiptNumber', header: 'Receipt', render: (p) => <span className="font-medium text-slate-900">{p.receiptNumber || '—'}</span> },
          ...(finance ? [{ key: 'unit', header: 'Unit', render: (p) => p.unit?.label }] : []),
          { key: 'bill', header: 'Against', render: (p) => p.bill?.billNumber || <Badge tone="green">Advance</Badge> },
          { key: 'amount', header: 'Amount', render: (p) => <span>{money(p.amount)}{p.bill && p.advanceAmount > 0 && <span className="ml-1 text-xs text-emerald-700">({money(p.advanceAmount)} adv.)</span>}</span> },
          { key: 'method', header: 'Mode', render: (p) => `${label(p.method)}${p.reference ? ` · ${p.reference}` : ''}` },
          { key: 'paidAt', header: 'Date', render: (p) => date(p.paidAt) },
          { key: 'status', header: 'Status', render: (p) => (p.status === 'bounced' ? <Badge tone="red">Bounced</Badge> : <StatusBadge status={p.status === 'success' ? 'paid' : p.status} />) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}

function DefaultersTable() {
  const { data, isLoading } = useDefaulters();
  return (
    <Card>
      <Table loading={isLoading} rows={data?.map((d) => ({ ...d, _id: d.unit._id }))} empty="No overdue dues 🎉"
        columns={[
          { key: 'unit', header: 'Unit', render: (d) => <span className="font-medium text-slate-900">{d.unit.label}</span> },
          { key: 'outstanding', header: 'Overdue', render: (d) => money(d.outstanding) },
          { key: 'advance', header: 'Advance held', render: (d) => (d.advance ? <span className="text-emerald-700">{money(d.advance)}</span> : '—') },
          { key: 'net', header: 'Net due', render: (d) => <span className="font-semibold text-red-600">{money(d.net)}</span> },
          { key: 'bills', header: 'Overdue bills' },
          { key: 'oldestDue', header: 'Oldest due', render: (d) => date(d.oldestDue) },
          // Click-to-chat societies send reminders themselves (the button renders only in that mode).
          { key: 'remind', header: '', mobile: false, render: (d) => <SendOnWhatsApp label="Remind" text={`Reminder from the society office: maintenance dues of ${money(d.net)} for ${d.unit.label} are overdue since ${date(d.oldestDue)}. Please pay in the ColonyHub app. Thank you.`} /> },
        ]} />
    </Card>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const finance = user.role !== ROLES.RESIDENT;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'bills';
  const setTab = (t) => setParams(t === 'bills' ? {} : { tab: t }, { replace: true });
  const [modal, setModal] = useState(null);
  const [billId, setBillId] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [presetBill, setPresetBill] = useState(null);
  const [waiverBill, setWaiverBill] = useState(null);
  const pay = usePayOnline();
  const lateFees = useApplyLateFees();
  const cancel = useCancelBill();

  const tabs = [
    { value: 'bills', label: 'Bills' },
    { value: 'payments', label: 'Payments' },
    { value: 'statement', label: 'Statement' },
    ...(finance
      ? [
          { value: 'waivers', label: 'Waivers' },
          { value: 'credits', label: 'Advances & refunds' },
          { value: 'mandates', label: 'Autopay' },
          { value: 'defaulters', label: 'Defaulters' },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={finance ? 'Billing & collections' : 'My bills'}
        description={finance ? 'Generate maintenance bills, record payments and follow up on dues.' : 'Pay maintenance online, see your statement and download receipts.'}
        actions={finance ? (
          <>
            <Button variant="secondary" icon={Percent} loading={lateFees.isPending} onClick={() => window.confirm('Apply late fee to all overdue bills (once per bill)?') && lateFees.mutate()}>Apply late fees</Button>
            <Button variant="secondary" icon={FileUp} onClick={() => setModal('opening')}>Opening balances</Button>
            <Button variant="secondary" icon={HandCoins} onClick={() => setModal('advance')}>Record advance</Button>
            <Button variant="secondary" icon={Wallet} onClick={() => { setPresetBill(null); setModal('pay'); }}>Record payment</Button>
            <Button icon={FilePlus2} onClick={() => setModal('generate')}>Generate bills</Button>
          </>
        ) : (
          <Button variant="secondary" icon={PiggyBank} onClick={() => setModal('payAdvance')}>Pay in advance</Button>
        )}
      />
      {finance ? <SummaryCards period={currentPeriod()} /> : <><DueHero onPay={(id) => pay.mutate(id)} paying={pay.isPending ? pay.variables : null} /><ResidentSummary /></>}
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'bills' && <BillsTable finance={finance} onOpen={setBillId} onPay={(id) => pay.mutate(id)} payingId={pay.isPending ? pay.variables : null} />}
      {!finance && tab === 'bills' && <AutopayCard />}
      {tab === 'payments' && <PaymentsTable finance={finance} onReceipt={setReceiptId} />}
      {tab === 'statement' && <StatementPanel finance={finance} />}
      {finance && tab === 'waivers' && <WaiversPanel />}
      {finance && tab === 'credits' && <CreditsPanel />}
      {finance && tab === 'mandates' && <MandatesPanel />}
      {finance && tab === 'defaulters' && <DefaultersTable />}

      <BillDetailModal
        billId={billId}
        onClose={() => setBillId(null)}
        onReceipt={setReceiptId}
        actions={(bill) =>
          bill && bill.balance > 0 && bill.status !== 'cancelled' ? (
            finance ? (
              <>
                {bill.paid === 0 && <Button variant="ghost" onClick={() => window.confirm('Cancel this bill?') && cancel.mutate(bill._id, { onSuccess: () => setBillId(null) })}>Cancel bill</Button>}
                <Button variant="secondary" onClick={() => { setWaiverBill(bill); setBillId(null); }}>Request waiver</Button>
                <Button onClick={() => { setPresetBill(bill); setBillId(null); setModal('pay'); }}>Record payment</Button>
              </>
            ) : (
              <Button loading={pay.isPending} onClick={() => pay.mutate(bill._id, { onSuccess: () => setBillId(null) })}>Pay {money(bill.balance)}</Button>
            )
          ) : null
        }
      />
      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} canBounce={finance} />
      {finance && <GenerateModal open={modal === 'generate'} onClose={() => setModal(null)} />}
      {finance && modal === 'pay' && <RecordPaymentModal open onClose={() => setModal(null)} presetBill={presetBill} />}
      {finance && modal === 'advance' && <AdvanceModal onClose={() => setModal(null)} />}
      {finance && modal === 'opening' && <OpeningBalancesModal onClose={() => setModal(null)} />}
      {finance && waiverBill && <WaiverRequestModal bill={waiverBill} onClose={() => setWaiverBill(null)} />}
      {!finance && modal === 'payAdvance' && <PayAdvanceModal onClose={() => setModal(null)} />}
    </div>
  );
}
