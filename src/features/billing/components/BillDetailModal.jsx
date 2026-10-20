import { Download, Mail } from 'lucide-react';
import { Badge, Button, Modal, Spinner, StatusBadge } from '../../../components/ui';
import { date, label, money, periodLabel } from '../../../lib/format';
import { useBill, useDownload, useEmailBill } from '../api';
import { useT } from '../../../context/LanguageContext';

const periodText = (p, t) => (p === 'OPENING' ? t('Opening balance') : periodLabel(p));

export function BillDetailModal({ billId, onClose, onReceipt, actions }) {
  const { t } = useT();
  const { data: bill, isLoading } = useBill(billId);
  const { download, busy } = useDownload();
  const email = useEmailBill();
  const gst = bill?.tax?.gst > 0;
  const base = bill?.lines.filter((l) => l.kind !== 'gst') || [];
  const taxes = bill?.lines.filter((l) => l.kind === 'gst') || [];

  const footer = bill && (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <Button variant="ghost" size="sm" icon={Download} loading={busy === 'pdf'} onClick={() => download('pdf', `/bills/${bill._id}/pdf`, null, `${bill.billNumber}.pdf`)}>PDF</Button>
      <Button variant="ghost" size="sm" icon={Mail} loading={email.isPending} onClick={() => email.mutate(bill._id)}>Email me</Button>
      {actions?.(bill)}
    </div>
  );

  return (
    <Modal open={Boolean(billId)} onClose={onClose} size="lg" title={bill ? `${bill.billNumber}` : 'Bill'} description={bill ? `${bill.unit.label} · ${periodText(bill.period, t)}` : ''} footer={footer}>
      {isLoading || !bill ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={bill.status} />
              {gst && <Badge tone="blue">{t('Tax invoice')}</Badge>}
            </div>
            <span className="text-slate-500">{t('Due {date}', { date: date(bill.dueDate) })}</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {base.map((l, i) => (
                <tr key={`${l.head}-${i}`}>
                  <td className="py-2 text-slate-600">
                    {l.head}
                    {gst && <span className="ml-2 text-xs text-slate-400">{l.gstRate > 0 ? `GST ${l.gstRate}%` : t('Exempt')}</span>}
                  </td>
                  <td className="py-2 text-right">{money(l.amount)}</td>
                </tr>
              ))}
              {gst && <tr><td className="py-2 text-slate-500">{t('Taxable value')}</td><td className="py-2 text-right text-slate-500">{money(bill.tax.taxable)}</td></tr>}
              {taxes.map((l) => (
                <tr key={l.head}><td className="py-2 text-slate-600">{l.head}</td><td className="py-2 text-right">{money(l.amount)}</td></tr>
              ))}
              {bill.lateFee > 0 && <tr><td className="py-2 text-red-600">{t('Late fee')}</td><td className="py-2 text-right text-red-600">{money(bill.lateFee)}</td></tr>}
              {bill.waived > 0 && <tr><td className="py-2 text-emerald-700">{t('Waived')}</td><td className="py-2 text-right text-emerald-700">− {money(bill.waived)}</td></tr>}
              <tr className="font-semibold"><td className="py-2">{t('Total')}</td><td className="py-2 text-right">{money(bill.total)}</td></tr>
              {bill.creditApplied > 0 && <tr><td className="py-2 text-slate-600">{t('Advance adjusted')}</td><td className="py-2 text-right text-emerald-700">{money(bill.creditApplied)}</td></tr>}
              <tr><td className="py-2 text-slate-600">{t('Paid')}</td><td className="py-2 text-right text-emerald-700">{money(bill.paid - (bill.creditApplied || 0))}</td></tr>
              <tr className="font-semibold"><td className="py-2">{t('Balance')}</td><td className="py-2 text-right">{money(bill.balance)}</td></tr>
            </tbody>
          </table>
          {bill.creditBalance > 0 && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{t('Advance balance on this home: {amount}', { amount: money(bill.creditBalance) })}</p>}

          {bill.meters?.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-slate-700">{t('Meter readings')}</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {bill.meters.map((m) => (
                  <li key={m.meter} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                    <span>{m.serial} · {t(label(m.type))}</span>
                    <span className="text-slate-500">{m.from} → {m.to} ({date(m.toAt)}) = <b className="text-slate-800">{m.consumption}</b></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bill.payments.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-slate-700">{t('Payments')}</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {bill.payments.map((p) => (
                  <li key={p._id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>{date(p.paidAt)} · {t(label(p.method))}{p.reference ? ` · ${p.reference}` : ''}</span>
                    <span className="flex items-center gap-3">
                      {money(p.appliedAmount ?? p.amount)}
                      <Button size="sm" variant="ghost" onClick={() => onReceipt(p._id)}>Receipt</Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bill.bouncedPayments?.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-red-700">{t('Bounced')}</p>
              <ul className="divide-y divide-red-100 rounded-lg border border-red-200 bg-red-50/40">
                {bill.bouncedPayments.map((p) => (
                  <li key={p._id} className="flex justify-between gap-2 px-3 py-2">
                    <span>{t('{date} · cheque {ref} · {reason}', { date: date(p.bouncedAt), ref: p.reference || '', reason: p.bounceReason || '' })}</span>
                    <span className="text-red-700">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bill.adjustments?.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-slate-700">{t('Adjustments')}</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {bill.adjustments.map((a) => (
                  <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="flex items-center gap-2">{t(label(a.type))} <StatusBadge status={a.status} /></span>
                    <span>{money(a.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bill.notes && <p className="text-slate-500">{t('Note: {note}', { note: bill.notes })}</p>}
        </div>
      )}
    </Modal>
  );
}
