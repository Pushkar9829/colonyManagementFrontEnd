import { useState } from 'react';
import { Button, Field, Input, Modal } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { COLLECTOR_TYPES, useCollectParcel } from '../api';
import { useT } from '../../../context/LanguageContext';

function CollectBody({ parcel, onClose, onDone }) {
  const [otp, setOtp] = useState('');
  const { t: tx } = useT();
  const [type, setType] = useState('resident');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
  // Errors are shown inline (wrong OTP, attempts left) rather than as a toast that disappears.
  const collect = useCollectParcel({ toastErrors: false, onSuccess: (p) => { onDone?.(p); onClose(); } });

  const submit = (e) => {
    e.preventDefault();
    setErrors({});
    collect.mutate(
      { id: parcel._id, otp, collectedByType: type, collectedByName: type === 'resident' ? undefined : name.trim() || undefined },
      { onError: (err) => setErrors(Object.keys(err.fieldErrors || {}).length ? err.fieldErrors : { otp: err.message }) },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{parcel.number}</span> · {parcel.courier} · {parcel.unit?.label}
        {parcel.recipientName ? ` · ${parcel.recipientName}` : ''}
        {parcel.storageLocation ? ` · ${parcel.storageLocation}` : ''}
      </div>
      <Field label="4-digit OTP from the resident's app" error={errors.otp} required>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4}"
          maxLength={4}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          aria-label={tx('OTP')}
          className={cn(
            'block h-16 w-full rounded-xl border bg-white text-center font-mono text-4xl font-semibold tracking-[0.5em] text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            errors.otp ? 'border-red-400' : 'border-slate-300',
          )}
        />
      </Field>
      <Field label="Collected by">
        <div className="grid grid-cols-2 gap-2">
          {COLLECTOR_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'h-11 rounded-lg border text-sm font-medium transition',
                type === t.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300',
              )}
            >
              {tx(t.label)}
            </button>
          ))}
        </div>
      </Field>
      {type !== 'resident' && <Input label="Name of the person collecting" required value={name} onChange={(e) => setName(e.target.value)} error={errors.collectedByName} />}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="success" size="lg" loading={collect.isPending} disabled={otp.length !== 4}>Hand over</Button>
      </div>
    </form>
  );
}

// OTP hand-over dialog. Reused by the gate console.
//   parcel — the parcel to hand over (dialog is open while set, unless `open` is given)
//   onClose() — close the dialog
//   onDone(parcel) — called with the collected parcel
export function CollectParcelModal({ parcel, open, onClose, onDone }) {
  const isOpen = open ?? Boolean(parcel);
  return (
    <Modal
      open={isOpen && Boolean(parcel)}
      onClose={onClose}
      title="Hand over parcel"
      description="Ask the collector to read out the OTP shown in the resident's app."
    >
      {parcel && <CollectBody key={parcel._id} parcel={parcel} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}
