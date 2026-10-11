import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Download } from 'lucide-react';
import { Button, Card, EmptyState, PageLoader, StatusBadge } from '../../../components/ui';
import { date, money } from '../../../lib/format';
import { usePayByLink, usePayLink } from '../api';

// Opened from the link in invoice / reminder emails. Works even when the society is suspended,
// because it talks to the token endpoints rather than the society session.
export default function PayInvoicePage() {
  const { token } = useParams();
  const { data, isLoading, error, refetch } = usePayLink(token);
  const [done, setDone] = useState(null);
  const pay = usePayByLink(token);

  if (isLoading) return <PageLoader />;
  if (error) return <EmptyState title="This payment link is not valid" description="Ask your society admin for the latest invoice link." />;
  const { invoice, society } = data;
  const paid = invoice.status === 'paid' || done;

  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ColonyHub subscription</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{society.name}</h1>
        {!society.active && !done?.reactivated && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{society.suspendedReason || 'This society is suspended.'}</p>}
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Invoice</dt><dd className="font-medium">{invoice.number}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Period</dt><dd>{date(invoice.periodStart)} – {date(new Date(new Date(invoice.periodEnd).getTime() - 1))}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(invoice.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">GST @ {invoice.gstRate}%</dt><dd>{money(invoice.gst)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{money(invoice.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Due</dt><dd>{date(invoice.dueDate)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={paid ? 'paid' : invoice.status} /></dd></div>
        </dl>
        <div className="mt-6">
          {paid ? (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
              <p className="font-medium text-slate-800">{done?.reactivated ? 'Paid — the society is active again.' : 'This invoice is paid.'}</p>
              <p className="text-sm text-slate-500">Members may need to sign in again. <Link className="text-brand-600 hover:underline" to="/">Go to ColonyHub</Link></p>
            </div>
          ) : invoice.status === 'void' ? (
            <p className="text-center text-sm text-slate-500">This invoice was cancelled and does not need to be paid.</p>
          ) : (
            <Button className="w-full" size="lg" icon={CreditCard} loading={pay.isPending} onClick={() => pay.mutate(undefined, { onSuccess: (r) => { setDone(r); refetch(); } })}>Pay {money(invoice.total)}</Button>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-400"><Download className="size-3" /> A GST invoice PDF is in your email and under Admin › Subscription.</p>
      </Card>
    </div>
  );
}
