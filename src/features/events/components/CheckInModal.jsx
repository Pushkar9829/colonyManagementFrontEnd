import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { CheckCircle2, Keyboard, XCircle } from 'lucide-react';
import { Button, Input, Modal } from '../../../components/ui';
import { money } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { useCheckIn } from '../api';

// Organiser check-in: scan the ticket QR with the camera, or type the 8-character code.
// When the attendee still owes money, offers to record it as collected (cash / UPI) and check in.
export function CheckInModal({ eventId, open, onClose }) {
  const { t } = useT();
  const video = useRef(null);
  const last = useRef({ code: '', at: 0 });
  const [camError, setCamError] = useState('');
  const [manual, setManual] = useState('');
  const [result, setResult] = useState(null); // { ok, title, sub, pending? }
  const checkIn = useCheckIn();
  const { mutate } = checkIn;

  const submit = (code, collect) => {
    mutate(
      { id: eventId, code, collect },
      {
        onSuccess: (r) => setResult({ ok: true, title: r.user?.name || t('Checked in'), sub: `${r.attendedCount === 1 ? t('{n} person', { n: r.attendedCount }) : t('{n} people', { n: r.attendedCount })}${r.user?.units?.length ? ` · ${r.user.units.join(', ')}` : ''}` }),
        onError: (err) =>
          setResult(err.code === 'PAYMENT_PENDING'
            ? { ok: false, title: t('Payment pending'), sub: t('{amount} to collect', { amount: money(err.details?.amountDue) }), pending: code }
            : { ok: false, title: t('Not checked in'), sub: err.message }),
      },
    );
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!open || !video.current) return undefined;
    const scanner = new QrScanner(
      video.current,
      (r) => {
        const code = r.data?.trim();
        const now = Date.now();
        // the camera reads the same QR many times a second
        if (!code || (code === last.current.code && now - last.current.at < 4000)) return;
        last.current = { code, at: now };
        submitRef.current(code);
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, maxScansPerSecond: 4 },
    );
    scanner.start().catch(() => setCamError('Camera not available. Type the ticket code instead.'));
    return () => scanner.destroy();
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Check in attendees" description="Point the camera at the ticket QR code.">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
          {camError && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">{t(camError)}</p>}
        </div>
        {result && (
          <div className={`flex items-start gap-3 rounded-lg p-3 ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {result.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <XCircle className="mt-0.5 size-5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{result.title}</p>
              <p className="text-sm">{result.sub}</p>
              {result.pending && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="success" loading={checkIn.isPending} onClick={() => submit(result.pending, 'cash')}>Collected cash</Button>
                  <Button size="sm" variant="secondary" loading={checkIn.isPending} onClick={() => submit(result.pending, 'upi')}>Collected UPI</Button>
                </div>
              )}
            </div>
          </div>
        )}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) submit(manual.trim()); }}>
          <Input className="flex-1" label="Ticket code" placeholder="e.g. K7M2QX9P" value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} />
          <Button type="submit" icon={Keyboard} loading={checkIn.isPending}>Check in</Button>
        </form>
      </div>
    </Modal>
  );
}
