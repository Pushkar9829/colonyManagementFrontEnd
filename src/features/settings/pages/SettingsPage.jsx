import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, Checkbox, Input, PageLoader, Select } from '../../../components/ui';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { money, toPaise, toRupees } from '../../../lib/format';
import { Link } from 'react-router-dom';
import { WhatsAppCard } from '../../whatsapp/components/WhatsAppCard';

// Long forms keep their save button in view: it sticks to the bottom of the screen (above the phone
// shortcut bar) while the card is on screen.
function SaveBar({ children, note }) {
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:col-span-3 lg:bottom-0">
      {note && <p className="min-w-0 flex-1 text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  );
}

const useSociety = () => useQuery({ queryKey: ['society'], queryFn: () => api.get('/society/me') });

function ProfileCard({ society }) {
  const [form, setForm] = useState(() => ({ name: society.name, address: society.address || '', city: society.city || '', state: society.state || '', pincode: society.pincode || '', contactEmail: society.contactEmail || '', contactPhone: society.contactPhone || '' }));
  const save = useApiMutation((b) => api.patch('/society/me', b), { invalidate: ['society'], success: 'Society details saved' });
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <Card>
      <CardHeader title="Society details" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" {...f('name')} />
        <Input className="sm:col-span-2" label="Address" {...f('address')} />
        <Input label="City" {...f('city')} />
        <Input label="State" {...f('state')} />
        <Input label="PIN code" {...f('pincode')} />
        <Input label="Office phone" {...f('contactPhone')} />
        <Input className="sm:col-span-2" label="Office email" type="email" {...f('contactEmail')} />
        <div className="sm:col-span-2"><Button loading={save.isPending} onClick={() => save.mutate(form)}>Save details</Button></div>
      </div>
    </Card>
  );
}

function JoinCodeCard({ society }) {
  const toast = useToast();
  const { t } = useT();
  const regen = useApiMutation(() => api.post('/society/me/regenerate-code'), { invalidate: ['society'], success: 'New code generated' });
  return (
    <Card>
      <CardHeader title="Resident joining code" subtitle="Residents enter this code on the Join page to request access." />
      <div className="flex flex-wrap items-center gap-3 p-5">
        <span className="rounded-lg bg-brand-50 px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-brand-700">{society.code}</span>
        <Button variant="secondary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(society.code); toast.success(t('Code copied')); }}>Copy</Button>
        <Button variant="ghost" icon={RefreshCw} loading={regen.isPending} onClick={() => window.confirm(t('The old code will stop working. Continue?')) && regen.mutate()}>Regenerate</Button>
      </div>
    </Card>
  );
}

function BillingCard({ society }) {
  const { t } = useT();
  const b = society.settings.billing;
  const [form, setForm] = useState({
    fixedAmount: String(toRupees(b.fixedAmount)),
    perSqftRate: String(toRupees(b.perSqftRate)),
    dueDays: String(b.dueDays),
    autoGenerate: Boolean(b.autoGenerate),
    generateDay: String(b.generateDay ?? 1),
    lateFeeType: b.lateFeeType,
    lateFeeValue: String(b.lateFeeType === 'flat' ? toRupees(b.lateFeeValue) : b.lateFeeValue),
    chargeHeads: b.chargeHeads.map((h) => ({ name: h.name, amount: String(toRupees(h.amount)) })),
  });
  const save = useApiMutation((body) => api.patch('/society/me/settings', body), { invalidate: ['society'], success: 'Billing rules saved' });
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const setHead = (i, k, v) => setForm({ ...form, chargeHeads: form.chargeHeads.map((h, j) => (j === i ? { ...h, [k]: v } : h)) });

  const example = toPaise(form.fixedAmount) + Math.round(toPaise(form.perSqftRate) * 1000) + form.chargeHeads.reduce((s, h) => s + toPaise(h.amount), 0);

  const submit = () =>
    save.mutate({
      billing: {
        fixedAmount: toPaise(form.fixedAmount),
        perSqftRate: toPaise(form.perSqftRate),
        dueDays: Number(form.dueDays),
        autoGenerate: form.autoGenerate,
        generateDay: Number(form.generateDay),
        lateFeeType: form.lateFeeType,
        lateFeeValue: form.lateFeeType === 'flat' ? toPaise(form.lateFeeValue) : Number(form.lateFeeValue),
        chargeHeads: form.chargeHeads.filter((h) => h.name.trim()).map((h) => ({ name: h.name.trim(), amount: toPaise(h.amount) })),
      },
    });

  return (
    <Card>
      <CardHeader title="Maintenance billing rules" subtitle={t('A 1000 sq.ft unit would be billed {amount} per month.', { amount: money(example) })} />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Input label="Fixed amount / month (₹)" type="number" min={0} {...f('fixedAmount')} />
        <Input label="Rate per sq.ft (₹)" type="number" min={0} step="0.01" {...f('perSqftRate')} />
        <Input label="Due after (days)" type="number" min={0} {...f('dueDays')} />
        <Select label="Late fee" options={[{ value: 'none', label: 'None' }, { value: 'flat', label: 'Flat amount' }, { value: 'percent', label: 'Percent of bill' }]} {...f('lateFeeType')} />
        {form.lateFeeType !== 'none' && <Input label={form.lateFeeType === 'flat' ? 'Late fee (₹)' : 'Late fee (%)'} type="number" min={0} {...f('lateFeeValue')} />}
        <div className="space-y-2 sm:col-span-3">
          <p className="text-sm font-medium text-slate-700">{t('Extra monthly charges (e.g. sinking fund)')}</p>
          <p className="text-xs text-slate-500">{t("Added to every flat's bill each month, on top of the amounts above.")}</p>
          {form.chargeHeads.length > 0 && (
            <div className="flex gap-2 text-xs font-medium text-slate-600" aria-hidden="true">
              <span className="flex-1">{t('Charge name')}</span>
              <span className="w-32">{t('Amount / month (₹)')}</span>
              <span className="w-8" />
            </div>
          )}
          {form.chargeHeads.map((h, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="flex gap-2">
              <input className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm" aria-label={t('Charge name')} placeholder={t('e.g. Sinking fund')} value={h.name} onChange={(e) => setHead(i, 'name', e.target.value)} />
              <input className="h-10 w-32 rounded-lg border border-slate-300 px-3 text-sm" type="number" min={0} aria-label={h.name ? t('Amount per month for {name} (₹)', { name: h.name }) : t('Amount per month for this charge (₹)')} placeholder="₹" value={h.amount} onChange={(e) => setHead(i, 'amount', e.target.value)} />
              <button type="button" onClick={() => setForm({ ...form, chargeHeads: form.chargeHeads.filter((_, j) => j !== i) })} className="w-8 text-slate-400 hover:text-red-600" aria-label={h.name ? t('Remove {name}', { name: h.name }) : t('Remove charge')}><Trash2 className="mx-auto size-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setForm({ ...form, chargeHeads: [...form.chargeHeads, { name: '', amount: '' }] })}>Add extra charge</Button>
        </div>
        <div className="flex flex-wrap items-end gap-4 rounded-lg bg-slate-50 p-4 sm:col-span-3">
          <Checkbox label="Generate bills automatically every month" checked={form.autoGenerate} onChange={(e) => setForm({ ...form, autoGenerate: e.target.checked })} />
          {form.autoGenerate && <Input label="On day of month" type="number" min={1} max={28} className="w-36" {...f('generateDay')} />}
          <p className="w-full text-xs text-slate-500">{t('Reminders go out 3 days before the due date and every 3 days while overdue. Late fees are applied daily to overdue bills.')}</p>
        </div>
        <SaveBar note={t('A 1000 sq.ft flat: {amount} / month', { amount: money(example) })}><Button loading={save.isPending} onClick={submit}>Save billing rules</Button></SaveBar>
      </div>
    </Card>
  );
}

function OperationsCard({ society }) {
  const { t } = useT();
  const [sla, setSla] = useState(society.settings.complaintSlaHours);
  const [approval, setApproval] = useState(society.settings.visitorApprovalRequired);
  useEffect(() => setSla(society.settings.complaintSlaHours), [society]);
  const save = useApiMutation((b) => api.patch('/society/me/settings', b), { invalidate: ['society'], success: 'Settings saved' });
  return (
    <Card>
      <CardHeader title="Operations" />
      <div className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">{t('Complaint target time (hours to fix, by priority)')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['urgent', 'high', 'medium', 'low'].map((p) => (
              <Input key={p} label={p[0].toUpperCase() + p.slice(1)} type="number" min={1} value={sla[p]} onChange={(e) => setSla({ ...sla, [p]: Number(e.target.value) })} />
            ))}
          </div>
        </div>
        <Checkbox label="Visitors need resident approval before entry" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
        <Button loading={save.isPending} onClick={() => save.mutate({ complaintSlaHours: sla, visitorApprovalRequired: approval })}>Save</Button>
      </div>
    </Card>
  );
}

// Society policy: admins and accountants must turn on two-step verification before using the app.
function SecurityCard({ society }) {
  const { t } = useT();
  const [required, setRequired] = useState(Boolean(society.settings.security?.requireMfa));
  useEffect(() => setRequired(Boolean(society.settings.security?.requireMfa)), [society]);
  const save = useApiMutation((b) => api.patch('/society/me/settings', b), { invalidate: ['society'], success: 'Security settings saved' });
  return (
    <Card>
      <CardHeader title="Security" subtitle="Protect the accounts that can change money and member data." />
      <div className="space-y-4 p-5">
        <Checkbox label="Require two-step verification for admins and accountants" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        <p className="text-xs text-slate-500">{t("They'll be asked to set up an authenticator app the next time they open ColonyHub. Turn it on for yourself first from My profile.")}</p>
        <Button loading={save.isPending} onClick={() => save.mutate({ security: { requireMfa: required } })}>Save</Button>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useT();
  const { data: society, isLoading } = useSociety();
  if (isLoading || !society) return <PageLoader />;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Society settings" description="Profile, joining code, billing rules and operational defaults." />
      <JoinCodeCard society={society} />
      <BillingCard society={society} />
      <OperationsCard society={society} />
      <SecurityCard society={society} />
      <WhatsAppCard />
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
        <div><p className="font-semibold text-slate-900">{t('Celebrations')}</p><p className="text-slate-500">{t('Birthday and anniversary wishes: on/off, send time, channels and message text.')}</p></div>
        <Link to="/celebrations?tab=settings" className="font-medium text-brand-600 hover:underline">{t('Open settings')}</Link>
      </Card>
      <ProfileCard society={society} />
    </div>
  );
}
