import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Modal, PageLoader, Pagination, Select, StatCard, StatusBadge, Table } from '../../../components/ui';
import { date, dateTime, label, money, todayISO } from '../../../lib/format';
import { useDownload } from '../../reports/download';
import { useInvoiceSummary, useMarkInvoicePaid, usePlatformInvoice, usePlatformInvoices, useRunBilling, useVoidInvoice } from '../billingApi';

function InvoiceModal({ id, onClose }) {
  const { data: inv, isLoading } = usePlatformInvoice(id);
  const [pay, setPay] = useState({ method: 'bank', reference: '', paidAt: todayISO() });
  const markPaid = useMarkInvoicePaid({ onSuccess: onClose });
  const voidIt = useVoidInvoice({ onSuccess: onClose });
  const { download, busyKey } = useDownload();
  return (
    <Modal open onClose={onClose} size="lg" title={inv ? `${inv.number} · ${inv.society?.name}` : 'Invoice'}
      footer={inv && (
        <>
          <Button variant="secondary" icon={Download} loading={busyKey === 'pdf'} onClick={() => download(`/platform/invoices/${inv._id}/pdf`, null, `${inv.number}.pdf`, 'pdf')}>PDF</Button>
          {inv.status === 'unpaid' && <Button variant="danger" loading={voidIt.isPending} onClick={() => { const reason = window.prompt('Reason for voiding this invoice?'); if (reason) voidIt.mutate({ id, reason }); }}>Void</Button>}
        </>
      )}>
      {isLoading || !inv ? <PageLoader /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2"><StatusBadge status={inv.status} /><Badge tone="brand">{label(inv.plan)} · {inv.billingCycle}</Badge><Badge>{inv.units} units</Badge>{!inv.society?.active && <Badge tone="red">Society suspended</Badge>}</div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {inv.lines.map((l) => <li key={l.description} className="flex justify-between gap-3 px-3 py-2"><span className="text-slate-600">{l.description}</span><span className="shrink-0">{money(l.amount)}</span></li>)}
            <li className="flex justify-between px-3 py-2"><span>GST @ {inv.gstRate}%</span><span>{money(inv.gst)}</span></li>
            <li className="flex justify-between px-3 py-2 font-semibold"><span>Total</span><span>{money(inv.total)}</span></li>
          </ul>
          <p className="text-slate-500">Period {date(inv.periodStart)} – {date(new Date(new Date(inv.periodEnd).getTime() - 1))} · due {date(inv.dueDate)}</p>
          {inv.reminders?.length > 0 && <p className="text-xs text-slate-500">Reminders: {inv.reminders.map((r) => `${label(r.stage)} ${dateTime(r.at)}`).join(' · ')}</p>}
          {inv.payments?.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-700">Payments</p>
              <ul className="space-y-1 text-xs text-slate-600">{inv.payments.map((p) => <li key={p._id}>{dateTime(p.paidAt || p.createdAt)} · {money(p.amount)} · {p.method}{p.reference ? ` · ${p.reference}` : ''} · <StatusBadge status={p.status === 'success' ? 'paid' : p.status === 'failed' ? 'rejected' : 'pending'} />{p.notes ? ` · ${p.notes}` : ''}</li>)}</ul>
            </div>
          )}
          {inv.status === 'unpaid' && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 font-medium text-slate-700">Record an offline payment</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <Select label="Method" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} options={['bank', 'upi', 'cheque', 'cash'].map((m) => ({ value: m, label: label(m) }))} />
                <Input label="Reference" placeholder="UTR / cheque no." value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
                <Input label="Paid on" type="date" value={pay.paidAt} onChange={(e) => setPay({ ...pay, paidAt: e.target.value })} />
                <div className="flex items-end"><Button variant="success" icon={CheckCircle2} loading={markPaid.isPending} onClick={() => markPaid.mutate({ id, method: pay.method, reference: pay.reference || undefined, paidAt: new Date(`${pay.paidAt}T12:00:00`).toISOString() })}>Mark paid</Button></div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function PlatformInvoicesPage() {
  const [f, setF] = useState({ status: '', overdue: '', page: 1 });
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = usePlatformInvoices(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')));
  const { data: sum } = useInvoiceSummary();
  const run = useRunBilling();

  return (
    <div>
      <PageHeader title="Platform invoices" description="Subscription invoices raised to societies. The billing job runs every 6 hours; reminders go out before and after the due date, and societies are suspended after the grace period."
        actions={<Button variant="secondary" icon={RefreshCw} loading={run.isPending} onClick={() => run.mutate()}>Run billing now</Button>} />
      {sum && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={CheckCircle2} tone="green" label="Paid" value={money(sum.paid.total)} sub={`${sum.paid.count} invoices`} />
          <StatCard icon={FileText} tone="amber" label="Unpaid" value={money(sum.unpaid.total)} sub={`${sum.unpaid.count} invoices`} />
          <StatCard icon={AlertTriangle} tone="red" label="Overdue" value={money(sum.overdue.total)} sub={`${sum.overdue.count} invoices`} />
        </div>
      )}
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <Select placeholder="Any status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={['unpaid', 'paid', 'void'].map((s) => ({ value: s, label: label(s) }))} />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.overdue === 'true'} onChange={(e) => setF({ ...f, overdue: e.target.checked ? 'true' : '', page: 1 })} /> Overdue only</label>
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No invoices" onRowClick={(i) => setOpenId(i._id)}
          columns={[
            { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium text-slate-900">{i.number}</span> },
            { key: 'society', header: 'Society', render: (i) => <div><p>{i.society?.name}</p><p className="text-xs text-slate-500">{i.society?.code}{i.society && !i.society.active ? ' · suspended' : ''}</p></div> },
            { key: 'plan', header: 'Plan', render: (i) => `${label(i.plan)} · ${i.billingCycle}` },
            { key: 'total', header: 'Total', render: (i) => money(i.total) },
            { key: 'dueDate', header: 'Due', render: (i) => <span className={i.status === 'unpaid' && new Date(i.dueDate) < new Date() ? 'font-medium text-red-600' : ''}>{date(i.dueDate)}</span> },
            { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setF({ ...f, page })} />
      </Card>
      {openId && <InvoiceModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
