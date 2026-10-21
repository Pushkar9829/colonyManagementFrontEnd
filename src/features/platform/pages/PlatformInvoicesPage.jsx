import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, FilterBar, Input, Modal, PageLoader, Pagination, Select, StatCard, StatusBadge, Table } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { date, dateTime, label, money, todayISO } from '../../../lib/format';
import { useDownload } from '../../reports/download';
import { PermissionGate } from '../components/PermissionGate';
import { useCan } from '../useCan';
import { useInvoiceSummary, useMarkInvoicePaid, usePlatformInvoice, usePlatformInvoices, useRunBilling, useVoidInvoice } from '../billingApi';

function InvoiceModal({ id, onClose }) {
  const { data: inv, isLoading } = usePlatformInvoice(id);
  const [pay, setPay] = useState({ method: 'bank', reference: '', paidAt: todayISO() });
  const markPaid = useMarkInvoicePaid({ onSuccess: onClose });
  const voidIt = useVoidInvoice({ onSuccess: onClose });
  const { download, busyKey } = useDownload();
  const canManage = useCan()('invoices.manage');
  const { t } = useT();
  return (
    <Modal open onClose={onClose} size="lg" title={inv ? `${inv.number} · ${inv.society?.name}` : 'Invoice'}
      footer={inv && (
        <>
          <Button variant="secondary" icon={Download} loading={busyKey === 'pdf'} onClick={() => download(`/platform/invoices/${inv._id}/pdf`, null, `${inv.number}.pdf`, 'pdf')}>PDF</Button>
          {inv.status === 'unpaid' && canManage && <Button variant="danger" loading={voidIt.isPending} onClick={() => { const reason = window.prompt(t('Reason for voiding this invoice?')); if (reason) voidIt.mutate({ id, reason }); }}>Void</Button>}
        </>
      )}>
      {isLoading || !inv ? <PageLoader /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2"><StatusBadge status={inv.status} /><Badge tone="brand">{t(label(inv.plan))} · {t(label(inv.billingCycle))}</Badge><Badge>{t('{n} units', { n: inv.units })}</Badge>{!inv.society?.active && <Badge tone="red">{t('Society suspended')}</Badge>}</div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {inv.lines.map((l) => <li key={l.description} className="flex justify-between gap-3 px-3 py-2"><span className="text-slate-600">{l.description}</span><span className="shrink-0">{money(l.amount)}</span></li>)}
            <li className="flex justify-between px-3 py-2"><span>{t('GST @ {rate}%', { rate: inv.gstRate })}</span><span>{money(inv.gst)}</span></li>
            <li className="flex justify-between px-3 py-2 font-semibold"><span>{t('Total')}</span><span>{money(inv.total)}</span></li>
          </ul>
          <p className="text-slate-500">{t('Period {from} – {to} · due {due}', { from: date(inv.periodStart), to: date(new Date(new Date(inv.periodEnd).getTime() - 1)), due: date(inv.dueDate) })}</p>
          {inv.reminders?.length > 0 && <p className="text-xs text-slate-500">{t('Reminders: {list}', { list: inv.reminders.map((r) => `${t(label(r.stage))} ${dateTime(r.at)}`).join(' · ') })}</p>}
          {inv.payments?.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-700">{t('Payments')}</p>
              <ul className="space-y-1 text-xs text-slate-600">{inv.payments.map((p) => <li key={p._id}>{dateTime(p.paidAt || p.createdAt)} · {money(p.amount)} · {p.method}{p.reference ? ` · ${p.reference}` : ''} · <StatusBadge status={p.status === 'success' ? 'paid' : p.status === 'failed' ? 'rejected' : 'pending'} />{p.notes ? ` · ${p.notes}` : ''}</li>)}</ul>
            </div>
          )}
          {inv.status === 'unpaid' && canManage && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 font-medium text-slate-700">{t('Record an offline payment')}</p>
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
  return (
    <PermissionGate permission="invoices.view">
      <InvoicesList />
    </PermissionGate>
  );
}

function InvoicesList() {
  const [f, setF] = useState({ status: '', overdue: '', page: 1 });
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = usePlatformInvoices(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')));
  const { data: sum } = useInvoiceSummary();
  const run = useRunBilling();
  const canRun = useCan()('billing.run');
  const { t } = useT();
  const invoices = (n) => (n === 1 ? t('{n} invoice', { n }) : t('{n} invoices', { n }));
  const dueSoon = sum ? Math.max(0, sum.unpaid.count - sum.overdue.count) : 0;

  return (
    <div>
      <PageHeader title="Platform invoices" description="Subscription invoices raised to societies. The billing job runs every 6 hours; reminders go out before and after the due date, and societies are suspended after the grace period."
        actions={canRun && <Button variant="secondary" className="whitespace-nowrap" icon={RefreshCw} loading={run.isPending} onClick={() => run.mutate()}>Run billing</Button>} />
      {sum && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
          {/* "Unpaid" from the API includes overdue invoices; split it so the tiles don't overlap */}
          <StatCard icon={CheckCircle2} tone="green" label="Paid" value={money(sum.paid.total)} sub={invoices(sum.paid.count)} />
          <StatCard icon={FileText} tone="amber" label="Due soon" value={money(Math.max(0, sum.unpaid.total - sum.overdue.total))} sub={dueSoon === 1 ? t('{n} invoice not yet due', { n: dueSoon }) : t('{n} invoices not yet due', { n: dueSoon })} />
          <StatCard icon={AlertTriangle} tone="red" label="Overdue" value={money(sum.overdue.total)} sub={sum.overdue.count === 1 ? t('{n} invoice past due date', { n: sum.overdue.count }) : t('{n} invoices past due date', { n: sum.overdue.count })} />
        </div>
      )}
      <Card>
        <FilterBar cols={3} active={[f.status, f.overdue].filter(Boolean).length}>
          <Select aria-label="Status" placeholder="Any status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={['unpaid', 'paid', 'void'].map((s) => ({ value: s, label: label(s) }))} />
          <Checkbox className="sm:h-10" label="Overdue only" checked={f.overdue === 'true'} onChange={(e) => setF({ ...f, overdue: e.target.checked ? 'true' : '', page: 1 })} />
        </FilterBar>
        <Table loading={isLoading} rows={data?.data} empty="No invoices" onRowClick={(i) => setOpenId(i._id)}
          columns={[
            { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium text-slate-900">{i.number}</span> },
            { key: 'society', header: 'Society', render: (i) => <div><p>{i.society?.name}</p><p className="text-xs text-slate-500">{i.society?.code}{i.society && !i.society.active ? ` · ${t('suspended')}` : ''}</p></div> },
            { key: 'plan', header: 'Plan', mobile: false, render: (i) => `${t(label(i.plan))} · ${t(label(i.billingCycle))}` },
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
