import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Badge, Modal, Spinner } from '../../../components/ui';
import { money } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { useMyTicket } from '../api';
import { whenText } from '../format';

// The resident's ticket: QR code the organiser scans at the entrance, plus the code to read out.
export function TicketModal({ eventId, open, onClose }) {
  const { t } = useT();
  const { data: ticket, isLoading } = useMyTicket(eventId, open);
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!ticket?.qrPayload) return;
    QRCode.toDataURL(ticket.qrPayload, { width: 260, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [ticket?.qrPayload]);

  return (
    <Modal open={open} onClose={onClose} title="Your ticket" size="sm">
      {isLoading || !ticket ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="text-center">
          <p className="font-semibold text-slate-900">{ticket.event.title}</p>
          <p className="text-sm text-slate-500">{whenText(ticket.event)}{ticket.event.venue ? ` · ${ticket.event.venue}` : ''}</p>
          <div className="mx-auto my-4 flex size-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            {qr ? <img src={qr} alt={t('Ticket QR code')} className="size-full" /> : <Spinner />}
          </div>
          <p className="font-mono text-2xl font-bold tracking-[0.25em] text-slate-900">{ticket.ticketCode}</p>
          <p className="mt-1 text-sm text-slate-600">{t('{name} · admits {n}', { name: ticket.holder?.name || '', n: ticket.headcount })}</p>
          <div className="mt-3 flex justify-center gap-2">
            {ticket.checkedInAt && <Badge tone="green">{t('Checked in')}</Badge>}
            {ticket.paymentStatus === 'paid' && <Badge tone="green">{t('Paid')}</Badge>}
            {ticket.paymentStatus === 'pending' && <Badge tone="amber">{ticket.paymentMode === 'venue' ? t('{amount} due at the venue', { amount: money(ticket.amountDue) }) : t('{amount} due online', { amount: money(ticket.amountDue) })}</Badge>}
          </div>
        </div>
      )}
    </Modal>
  );
}
