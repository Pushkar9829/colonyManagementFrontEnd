import { useState } from 'react';
import { AlertTriangle, CalendarClock, CreditCard, Download, IndianRupee, KeyRound, Layers } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, ErrorState, Input, Modal, PageLoader, Pagination, Select, StatCard, StatusBadge, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date, label, money } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useT } from '../../../context/LanguageContext';
import { useDownload } from '../../reports/download';
import { useApplyLicence, usePayInvoice, useSubscription, useSubscriptionInvoice, useSubscriptionInvoices, useUpdateSubscription } from '../api';

// A lifetime licence is "paid until" 2100-01-01 on the server.
const isLifetime = (d) => Boolean(d) && new Date(d).getUTCFullYear() >= 2099;
const until = (d, t) => (isLifetime(d) ? t('Lifetime') : date(d));
const periodText = (i, t) => (i.lifetime ? t('Lifetime from {date}', { date: date(i.periodStart) }) : `${date(i.periodStart)} – ${date(new Date(new Date(i.periodEnd).getTime() - 1))}`);
const CYCLE_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', one_time: 'One-time licence' };

function LicenceKeyCard({ canEdit }) {
  const [key, setKey] = useState('');
  const apply = useApplyLicence({ onSuccess: () => setKey('') });
  if (!canEdit) return null;
  return (
    <Card className="mb-6">
      <CardHeader title="Apply a licence key" subtitle="Got a key from your provider (CH-XXXX-XXXX-XXXX)? It sets your plan and prepays it." />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <Input className="sm:max-w-xs" label="Licence key" placeholder="CH-XXXX-XXXX-XXXX" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
        <Button icon={KeyRound} disabled={key.replace(/[^A-Z0-9]/g, '').length < 12} loading={apply.isPending} onClick={() => apply.mutate(key)}>Apply key</Button>
      </div>
    </Card>
  );
}

function BillingDetails({ sub, canEdit, cycleOptions = [] }) {
  const { t } = useT();
  const [form, setForm] = useState(null);
  const update = useUpdateSubscription({ onSuccess: () => setForm(null) });
  const v = form ?? { billingCycle: sub.billingCycle, billingEmail: sub.billingEmail || '', gstin: sub.gstin || '' };
  const set = (k) => (e) => setForm({ ...v, [k]: e.target.value });
  const [errors, setErrors] = useState({});
  return (
    <Card>
      <CardHeader title="Billing details" subtitle="Used on your platform invoices. A cycle change applies from the next invoice." />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Select label="Billing cycle" disabled={!canEdit} value={v.billingCycle} onChange={set('billingCycle')}
          options={(cycleOptions.length ? cycleOptions : Object.keys(CYCLE_LABELS).map((c) => ({ cycle: c, available: true })))
            .filter((c) => c.available || c.cycle === sub.billingCycle)
            .map((c) => ({ value: c.cycle, label: `${t(CYCLE_LABELS[c.cycle])}${c.total ? ` · ${money(c.total)}` : ''}${c.discountPercent ? ` ${t('({n}% off)', { n: c.discountPercent })}` : ''}` }))} />
        <Input label="Invoice email" type="email" disabled={!canEdit} placeholder="accounts@society.in" value={v.billingEmail} onChange={set('billingEmail')} error={errors.billingEmail} />
        <Input label="GSTIN" disabled={!canEdit} placeholder="27ABCDE1234F1Z5" value={v.gstin} onChange={set('gstin')} error={errors.gstin} />
        {canEdit && (
          <div className="sm:col-span-3">
            <Button disabled={!form} loading={update.isPending} onClick={() => update.mutate(v, { onError: (e) => setErrors(e.fieldErrors || {}) })}>Save</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function InvoiceModal({ id, onClose }) {
  const { t } = useT();
  const { data: inv, isLoading } = useSubscriptionInvoice(id);
  const pay = usePayInvoice();
  const { download, busyKey } = useDownload();
  return (
    <Modal open onClose={onClose} title={inv ? t('Invoice {number}', { number: inv.number }) : 'Invoice'} description={inv ? periodText(inv, t) : undefined}
      footer={inv && (
        <>
          <Button variant="secondary" icon={Download} loading={busyKey === 'pdf'} onClick={() => download(`/subscription/invoices/${inv._id}/pdf`, null, `${inv.number}.pdf`, 'pdf')}>PDF</Button>
          {inv.status === 'unpaid' && <Button icon={CreditCard} loading={pay.isPending} onClick={() => pay.mutate(inv._id, { onSuccess: onClose })}>{t('Pay {amount}', { amount: money(inv.total) })}</Button>}
        </>
      )}>
      {isLoading || !inv ? <PageLoader /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2"><StatusBadge status={inv.status} /><Badge tone="brand">{t(label(inv.plan))} · {t(CYCLE_LABELS[inv.billingCycle] || inv.billingCycle)}</Badge><Badge>{t('{n} units', { n: inv.units })}</Badge></div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {inv.lines.map((l) => <li key={l.description} className="flex justify-between gap-3 px-3 py-2"><span className="text-slate-600">{l.description}</span><span className="shrink-0 font-medium">{money(l.amount)}</span></li>)}
            <li className="flex justify-between px-3 py-2"><span>{t('Subtotal')}</span><span>{money(inv.subtotal)}</span></li>
            <li className="flex justify-between px-3 py-2"><span>{t('GST @ {rate}%', { rate: inv.gstRate })}</span><span>{money(inv.gst)}</span></li>
            <li className="flex justify-between px-3 py-2 font-semibold"><span>{t('Total')}</span><span>{money(inv.total)}</span></li>
          </ul>
          <p className="text-slate-500">{inv.paidAt ? t('Due {due} · paid {paid}', { due: date(inv.dueDate), paid: date(inv.paidAt) }) : t('Due {date}', { date: date(inv.dueDate) })}</p>
          {inv.payLink && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t('Pay link — share with your treasurer. It also works if the account gets suspended.')}</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-700">{inv.payLink}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { t } = useT();
  const { data, isLoading, error, refetch } = useSubscription();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState(null);
  const invoices = useSubscriptionInvoices({ page, status: status || undefined });
  const pay = usePayInvoice();
  const { download, busyKey } = useDownload();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { subscription: sub, price, nextInvoice, outstanding, overdueInvoices, suspendsOn, society, units, cycleOptions } = data;
  const lifetime = isLifetime(sub.paidUntil);

  return (
    <div>
      <PageHeader title="Subscription & invoices" description="Your society’s ColonyHub plan and the platform’s invoices to you." />
      {overdueInvoices > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{t(overdueInvoices > 1 ? '{n} invoices are overdue. Access for all members will be suspended on {date} unless paid.' : '{n} invoice is overdue. Access for all members will be suspended on {date} unless paid.', { n: overdueInvoices, date: date(suspendsOn) })}</p>
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Plan" value={t(label(society.plan?.name || 'free'))} sub={society.plan?.unitLimit ? t('{n} units · limit {limit}', { n: units, limit: society.plan.unitLimit }) : t('{n} units · no unit limit', { n: units })} />
        <StatCard icon={CalendarClock} tone="green" label="Paid until" value={sub.paidUntil ? until(sub.paidUntil, t) : '—'} sub={sub.licenceKey ? 'Licence key' : label(sub.status)} />
        <StatCard icon={IndianRupee} tone={outstanding ? 'amber' : 'slate'} label="Outstanding" value={money(outstanding)} />
        <StatCard icon={CreditCard} tone="sky" label={t('Next invoice ({cycle})', { cycle: t(CYCLE_LABELS[nextInvoice.cycle || sub.billingCycle] || '').toLowerCase() })} value={lifetime ? t('None') : nextInvoice.total ? money(nextInvoice.total) : t('Free')} sub={lifetime ? 'lifetime licence' : nextInvoice.total ? t('from {date} incl. GST', { date: date(nextInvoice.startsOn) }) : 'no charge on this plan'} />
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Your price" subtitle="Set by ColonyHub for your plan" />
          <dl className="space-y-2 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t('Per unit per month')}</dt><dd>{money(price.perUnitMonthly)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('Platform fee per month')}</dt><dd>{money(price.flatMonthly)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('Quarterly discount')}</dt><dd>{price.quarterlyDiscountPercent || 0}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('Yearly discount')}</dt><dd>{price.yearlyDiscountPercent || 0}%</dd></div>
            {price.oneTimePrice > 0 && <div className="flex justify-between"><dt className="text-slate-500">{t('One-time licence')}</dt><dd>{money(price.oneTimePrice)} · {price.oneTimeValidityMonths ? t('{n} months', { n: price.oneTimeValidityMonths }) : t('lifetime')}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">GST</dt><dd>18%</dd></div>
          </dl>
        </Card>
        <div className="lg:col-span-2"><BillingDetails sub={sub} cycleOptions={cycleOptions} canEdit={user.role === ROLES.ADMIN} /></div>
      </div>
      <LicenceKeyCard canEdit={user.role === ROLES.ADMIN} />
      <Card>
        <CardHeader title="Invoices" action={<Select className="w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All" options={[{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' }]} />} />
        <Table loading={invoices.isLoading} rows={invoices.data?.data} empty="No invoices yet" onRowClick={(i) => setOpenId(i._id)}
          columns={[
            { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium text-slate-900">{i.number}</span> },
            { key: 'period', header: 'Period', render: (i) => periodText(i, t) },
            { key: 'total', header: 'Amount', render: (i) => money(i.total) },
            { key: 'dueDate', header: 'Due', render: (i) => <span className={i.status === 'unpaid' && new Date(i.dueDate) < new Date() ? 'font-medium text-red-600' : ''}>{date(i.dueDate)}</span> },
            { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            {
              key: 'actions',
              header: '',
              render: (i) => (
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" icon={Download} loading={busyKey === i._id} onClick={() => download(`/subscription/invoices/${i._id}/pdf`, null, `${i.number}.pdf`, i._id)}>PDF</Button>
                  {i.status === 'unpaid' && <Button size="sm" loading={pay.isPending && pay.variables === i._id} onClick={() => pay.mutate(i._id)}>Pay</Button>}
                </div>
              ),
            },
          ]} />
        <Pagination meta={invoices.data?.meta} onPage={setPage} />
      </Card>
      {openId && <InvoiceModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
