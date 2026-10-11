import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Badge, Modal, Spinner } from '../../../components/ui';
import { money } from '../../../lib/format';
import { useMyTicket } from '../api';
import { whenText } from '../format';

// The resident's ticket: QR code the organiser scans at the entrance, plus the code to read out.
export function TicketModal({ eventId, open, onClose }) {
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
            {qr ? <img src={qr} alt="Ticket QR code" className="size-full" /> : <Spinner />}
          </div>
          <p className="font-mono text-2xl font-bold tracking-[0.25em] text-slate-900">{ticket.ticketCode}</p>
          <p className="mt-1 text-sm text-slate-600">{ticket.holder?.name} · admits {ticket.headcount}</p>
          <div className="mt-3 flex justify-center gap-2">
            {ticket.checkedInAt && <Badge tone="green">Checked in</Badge>}
            {ticket.paymentStatus === 'paid' && <Badge tone="green">Paid</Badge>}
            {ticket.paymentStatus === 'pending' && <Badge tone="amber">{money(ticket.amountDue)} due {ticket.paymentMode === 'venue' ? 'at the venue' : 'online'}</Badge>}
          </div>
        </div>
      )}
    </Modal>
  );
}
