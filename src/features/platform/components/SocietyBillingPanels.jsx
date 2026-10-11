import { useState } from 'react';
import { Badge, Button, Input, Select, Spinner } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, label, money } from '../../../lib/format';
import { useSetSocietyFeatures, useSocietyFeatures } from '../../features/api';
import { useSocietySubscription, useUpdateSocietySubscription } from '../billingApi';

// Per-society module switches. Each feature is on by plan default unless overridden here.
export function FeatureFlagsPanel({ societyId }) {
  const { data, isLoading } = useSocietyFeatures(societyId);
  const set = useSetSocietyFeatures(societyId);
  if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;
  const change = (key, value) => set.mutate({ overrides: { [key]: value } });
  return (
    <div>
      <p className="mb-2 font-medium text-slate-700">Modules <span className="font-normal text-slate-500">· {label(data.plan)} plan defaults, overrides in blue</span></p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.features.map((f) => (
          <li key={f.key} className={cn('flex items-center justify-between gap-2 rounded-lg border px-3 py-2', f.source === 'override' ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200')}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{f.label}</p>
              <p className="text-xs text-slate-500">{f.inPlan ? 'In plan' : 'Not in plan'}{f.source === 'override' ? ' · overridden' : ''}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {f.source === 'override' && <button type="button" className="text-xs text-slate-500 hover:underline" disabled={set.isPending} onClick={() => change(f.key, null)}>reset</button>}
              <button type="button" role="switch" aria-checked={f.enabled} aria-label={`${f.label} ${f.enabled ? 'on' : 'off'}`} disabled={set.isPending} onClick={() => change(f.key, !f.enabled)}
                className={cn('relative h-6 w-11 rounded-full transition disabled:opacity-50', f.enabled ? 'bg-emerald-500' : 'bg-slate-300')}>
                <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition', f.enabled ? 'left-5.5' : 'left-0.5')} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SubscriptionPanel({ societyId }) {
  const { data, isLoading } = useSocietySubscription(societyId);
  const update = useUpdateSocietySubscription(societyId);
  const [form, setForm] = useState(null);
  if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;
  const sub = data.subscription;
  const v = form ?? { billingCycle: sub.billingCycle, graceDays: sub.graceDays, dueDays: sub.dueDays };
  return (
    <div>
      <p className="mb-2 font-medium text-slate-700">Subscription billing</p>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Badge tone={sub.status === 'active' ? 'green' : sub.status === 'past_due' ? 'amber' : 'red'}>{label(sub.status)}</Badge>
        <Badge>Paid until {sub.paidUntil ? date(sub.paidUntil) : '—'}</Badge>
        <Badge>Outstanding {money(data.outstanding)}</Badge>
        <Badge>Next: {data.nextInvoice.total ? `${money(data.nextInvoice.total)} on ${date(data.nextInvoice.startsOn)}` : 'free'}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Select label="Cycle" value={v.billingCycle} onChange={(e) => setForm({ ...v, billingCycle: e.target.value })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
        <Input label="Due after (days)" type="number" min={0} max={60} value={v.dueDays} onChange={(e) => setForm({ ...v, dueDays: e.target.value })} />
        <Input label="Grace period (days)" type="number" min={0} max={90} value={v.graceDays} onChange={(e) => setForm({ ...v, graceDays: e.target.value })} hint="Then auto-suspend" />
        <div className="flex items-end"><Button size="sm" disabled={!form} loading={update.isPending} onClick={() => update.mutate({ billingCycle: v.billingCycle, graceDays: Number(v.graceDays), dueDays: Number(v.dueDays) }, { onSuccess: () => setForm(null) })}>Save</Button></div>
      </div>
    </div>
  );
}
