import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { Button, Field, FileUpload, Input, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { UnitPicker } from '../../units/components/UnitPicker';
import { COURIERS, useLogParcel, usePreferenceCheck } from '../api';

const INITIAL = { unit: '', courier: '', otherCourier: '', trackingNo: '', recipientName: '', packages: '1', storageLocation: '', note: '' };
const opt = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Guard's parcel intake form. Also embedded in the gate console, hence the standalone export.
//   onDone(parcel) — called after a successful log
//   visitorId     — optional delivery visitor entry to link the parcel to
export function LogParcelForm({ onDone, visitorId }) {
  const { values, set, bind, errors, applyServerErrors, setValues } = useForm(INITIAL);
  const [files, setFiles] = useState([]);
  const [formKey, setFormKey] = useState(0);
  const courier = values.courier === 'Other' ? values.otherCourier.trim() : values.courier;
  const debouncedCourier = useDebounced(courier);
  const check = usePreferenceCheck(values.unit, debouncedCourier);

  const log = useLogParcel({
    onSuccess: (parcel) => {
      setValues(INITIAL);
      setFiles([]);
      setFormKey((k) => k + 1); // remounts UnitPicker so its text clears
      onDone?.(parcel);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    log.mutate(
      {
        unit: values.unit,
        courier,
        trackingNo: opt(values.trackingNo),
        recipientName: opt(values.recipientName),
        packages: Number(values.packages) || 1,
        storageLocation: opt(values.storageLocation),
        note: opt(values.note),
        photo: files[0]?._id,
        visitorId,
      },
      { onError: applyServerErrors },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <UnitPicker key={formKey} required value={values.unit} onChange={(id) => set('unit', id)} error={errors.unit} />

      <Field label="Courier" required error={errors.courier}>
        <div className="flex flex-wrap gap-2">
          {COURIERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('courier', c)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                values.courier === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>
      {values.courier === 'Other' && <Input label="Courier name" required autoFocus placeholder="e.g. Ekart, Shadowfax" {...bind('otherCourier')} />}

      {check.data?.leaveAtGate && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Household says: leave at gate — no approval needed</p>
            <p className="text-xs text-emerald-700">
              {check.data.preference?.company}
              {check.data.preference?.oneOff ? ' · today only' : ''}
              {check.data.preference?.note ? ` · ${check.data.preference.note}` : ''}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tracking no." placeholder="Optional" {...bind('trackingNo')} />
        <Input label="Recipient name" placeholder="Name on the label" {...bind('recipientName')} />
        <Input label="Packages" type="number" min={1} max={50} inputMode="numeric" {...bind('packages')} />
        <Input label="Storage location" placeholder="e.g. Rack B2" {...bind('storageLocation')} />
      </div>
      <Textarea label="Note" rows={2} placeholder="e.g. Fragile, box slightly damaged" {...bind('note')} />
      <Field label="Photo">
        <FileUpload folder="parcels" camera max={1} files={files} onChange={setFiles} label="Take photo" />
      </Field>
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={log.isPending} disabled={!values.unit || !courier}>
        Log parcel
      </Button>
    </form>
  );
}
