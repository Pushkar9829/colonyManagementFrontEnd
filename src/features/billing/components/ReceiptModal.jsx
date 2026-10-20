import { useState } from 'react';
import { Ban, Download, Mail } from 'lucide-react';
import { Badge, Button, Checkbox, Input, Modal, Spinner } from '../../../components/ui';
import { date, label, money, periodLabel } from '../../../lib/format';
import { useBouncePayment, useDownload, useEmailReceipt, useReceipt } from '../api';
import { useT } from '../../../context/LanguageContext';

function BounceForm({ payment, onDone }) {
  const [reason, setReason] = useState('');
  const [charge, setCharge] = useState(true);
  const bounce = useBouncePayment({ onSuccess: onDone });
  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3">
      <p className="font-medium text-red-800">Mark cheque {payment.reference || ''} as bounced</p>
      <Input label="Reason" placeholder="e.g. Insufficient funds" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Checkbox label="Add the society's cheque bounce charge to the next bill" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
      <Button variant="danger" size="sm" disabled={reason.trim().length < 3} loading={bounce.isPending} onClick={() => bounce.mutate({ id: payment._id, reason: reason.trim(), charge })}>Confirm bounce</Button>
    </div>
  );
}

export function ReceiptModal({ paymentId, onClose, canBounce = false }) {
  const { t } = useT();
  const { data, isLoading } = useReceipt(paymentId);
  const { download, busy } = useDownload();
  const email = useEmailReceipt();
  const [bouncing, setBouncing] = useState(false);
  const p = data?.payment;
  const bounceable = canBounce && p?.status === 'success' && p?.method === 'cheque';

  const close = () => {
    setBouncing(false);
    onClose();
  };

  return (
    <Modal
      open={Boolean(paymentId)}
      onClose={close}
      title="Payment receipt"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          {bounceable && !bouncing && <Button variant="ghost" size="sm" icon={Ban} onClick={() => setBouncing(true)}>Cheque bounced</Button>}
          <Button variant="ghost" size="sm" icon={Mail} disabled={!data} loading={email.isPending} onClick={() => email.mutate(paymentId)}>Email me</Button>
          <Button size="sm" icon={Download} disabled={!data} loading={busy === 'pdf'} onClick={() => download('pdf', `/payments/${paymentId}/receipt.pdf`, null, `${p?.receiptNumber || 'receipt'}.pdf`)}>Download PDF</Button>
        </div>
      }
    >
      {isLoading || !data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{data.society.name}</h2>
              <p className="text-slate-500">{[data.society.address, data.society.city, data.society.state, data.society.pincode].filter(Boolean).join(', ')}</p>
            </div>
            {p.status === 'bounced' && <Badge tone="red">{t('Bounced')}</Badge>}
          </div>
          <div className="flex justify-between rounded-lg bg-slate-50 p-3">
            <div>
              <p className="text-xs text-slate-500">{t('Receipt no.')}</p>
              <p className="font-semibold">{p.receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{t('Date')}</p>
              <p className="font-semibold">{date(p.paidAt)}</p>
            </div>
          </div>
          <table className="w-full">
            <tbody>
              <tr><td className="py-1.5 text-slate-500">{t('Unit')}</td><td className="text-right font-medium">{p.unit.label}</td></tr>
              <tr><td className="py-1.5 text-slate-500">{t('Against')}</td><td className="text-right">{data.bill ? `${data.bill.billNumber} (${data.bill.period === 'OPENING' ? t('Opening balance') : periodLabel(data.bill.period)})` : t('Advance payment')}</td></tr>
              <tr><td className="py-1.5 text-slate-500">{t('Mode')}</td><td className="text-right">{t(label(p.method))}{p.reference ? ` · ${p.reference}` : ''}</td></tr>
              <tr><td className="py-1.5 text-slate-500">{t('Amount received')}</td><td className="text-right text-base font-semibold">{money(p.amount)}</td></tr>
              {data.bill && p.advanceAmount > 0 && <tr><td className="py-1.5 text-slate-500">{t('Held as advance')}</td><td className="text-right">{money(p.advanceAmount)}</td></tr>}
              {data.bill && <tr><td className="py-1.5 text-slate-500">{t('Balance on bill')}</td><td className="text-right">{money(data.bill.balance)}</td></tr>}
              <tr><td className="py-1.5 text-slate-500">{t('Advance balance')}</td><td className="text-right">{money(data.creditBalance)}</td></tr>
              {p.status === 'bounced' && <tr><td className="py-1.5 text-red-600">{t('Bounced on')}</td><td className="text-right text-red-600">{date(p.bouncedAt)} · {p.bounceReason}</td></tr>}
            </tbody>
          </table>
          {bouncing && <BounceForm payment={p} onDone={close} />}
          <p className="text-xs text-slate-400">{t('This is a computer-generated receipt. Cheques are subject to realisation.')}</p>
        </div>
      )}
    </Modal>
  );
}
