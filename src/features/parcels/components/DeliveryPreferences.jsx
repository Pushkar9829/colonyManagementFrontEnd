import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Checkbox, Input, Spinner } from '../../../components/ui';
import { date, todayISO } from '../../../lib/format';
import { COURIERS, useCreatePreference, usePreferences, useRemovePreference } from '../api';

const initial = () => ({ company: '', oneOff: false, date: todayISO(), note: '' });

// Resident's "leave at gate" rules: the guard logs these deliveries without asking for approval.
export function DeliveryPreferences() {
  const { data = [], isLoading } = usePreferences();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const create = useCreatePreference({ onSuccess: () => { setForm(initial()); setErrors({}); } });
  const remove = useRemovePreference();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    create.mutate(
      { company: form.company.trim() || undefined, oneOff: form.oneOff, date: form.oneOff ? form.date : undefined, note: form.note.trim() || undefined },
      { onError: (err) => setErrors(err.fieldErrors || {}) },
    );
  };

  return (
    <Card>
      <CardHeader title="Delivery preferences" subtitle="Let the guard accept these deliveries at the gate without asking you." />
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : data.length ? (
        <ul className="divide-y divide-slate-100">
          {data.map((p) => (
            <li key={p._id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{p.company || 'Any company'}</p>
                <p className="text-xs text-slate-500">
                  {p.oneOffDate ? `Only on ${date(p.oneOffDate)}` : 'Every time'}
                  {p.note ? ` · ${p.note}` : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove preference" loading={remove.isPending && remove.variables === p._id} onClick={() => remove.mutate(p._id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-sm text-slate-500">No preferences yet — every delivery waits for you to collect it with an OTP.</p>
      )}
      <form onSubmit={submit} className="space-y-3 border-t border-slate-100 p-5">
        <Input label="Company" placeholder="Leave empty for any company" list="pref-couriers" value={form.company} onChange={set('company')} error={errors.company} />
        <datalist id="pref-couriers">
          {COURIERS.filter((c) => c !== 'Other').map((c) => <option key={c} value={c} />)}
        </datalist>
        <Checkbox label="Only for one day" checked={form.oneOff} onChange={set('oneOff')} />
        {form.oneOff && <Input label="Date" type="date" min={todayISO()} value={form.date} onChange={set('date')} error={errors.date} />}
        <Input label="Note for the guard" placeholder="Optional, e.g. keep in the parcel rack" value={form.note} onChange={set('note')} error={errors.note} />
        <Button type="submit" loading={create.isPending} className="w-full sm:w-auto">Add preference</Button>
      </form>
    </Card>
  );
}
