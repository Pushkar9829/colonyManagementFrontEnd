import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, Checkbox, ErrorState, Input, PageLoader } from '../../../components/ui';
import { toPaise, toRupees } from '../../../lib/format';
import { useFinanceSettings, useSaveFinanceSettings } from '../api';
import { useT } from '../../../context/LanguageContext';

const fromServer = (s) => ({
  gstin: s.gstin || '',
  gstEnabled: Boolean(s.gstEnabled),
  gstDefaultRate: String(s.gstDefaultRate ?? 18),
  gstExemptUpTo: String(toRupees(s.gstExemptUpTo)),
  headGst: (s.headGst || []).map((h) => ({ head: h.head, rate: String(h.rate) })),
  headAccounts: (s.headAccounts || []).map((h) => ({ head: h.head, account: h.account })),
  nonOccPercent: String(s.nonOccupancy?.percent ?? 0),
  nonOccRented: (s.nonOccupancy?.appliesTo || []).includes('rented'),
  nonOccVacant: (s.nonOccupancy?.appliesTo || []).includes('vacant'),
  chequeBounceCharge: String(toRupees(s.chequeBounceCharge)),
  waiverApprovalRequired: Boolean(s.waiverApprovalRequired),
  restrictAmenityForDefaulters: Boolean(s.restrictAmenityForDefaulters),
  autopayEnabled: Boolean(s.autopayEnabled),
});

const toServer = (f) => ({
  gstin: f.gstin.trim(),
  gstEnabled: f.gstEnabled,
  gstDefaultRate: Number(f.gstDefaultRate || 0),
  gstExemptUpTo: toPaise(f.gstExemptUpTo),
  headGst: f.headGst.filter((h) => h.head.trim()).map((h) => ({ head: h.head.trim(), rate: Number(h.rate || 0) })),
  headAccounts: f.headAccounts.filter((h) => h.head.trim()).map((h) => ({ head: h.head.trim(), account: h.account.trim() })),
  nonOccupancy: { percent: Number(f.nonOccPercent || 0), appliesTo: [f.nonOccRented && 'rented', f.nonOccVacant && 'vacant'].filter(Boolean) },
  chequeBounceCharge: toPaise(f.chequeBounceCharge),
  waiverApprovalRequired: f.waiverApprovalRequired,
  restrictAmenityForDefaulters: f.restrictAmenityForDefaulters,
  autopayEnabled: f.autopayEnabled,
});

// Editable list of { head, <field> } rows.
function HeadRows({ rows, field, fieldLabel, placeholder, onChange }) {
  const { t } = useT();
  const update = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="flex items-end gap-2">
          <Input className="min-w-0 flex-1" label={i === 0 ? 'Charge name' : undefined} aria-label={t('Charge name')} placeholder="e.g. Sinking fund" value={r.head} onChange={(e) => update(i, { head: e.target.value })} />
          <Input className="w-32" label={i === 0 ? fieldLabel : undefined} aria-label={r.head ? t('{field} for {head}', { field: t(fieldLabel), head: r.head }) : t('{field} for this charge', { field: t(fieldLabel) })} placeholder={placeholder} value={r[field]} onChange={(e) => update(i, { [field]: e.target.value })} />
          <Button variant="ghost" icon={Trash2} aria-label={r.head ? t('Remove {name}', { name: r.head }) : t('Remove charge')} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange([...rows, { head: '', [field]: '' }])}>Add charge</Button>
    </div>
  );
}

export default function FinanceSettingsPage() {
  const { t } = useT();
  const { data, isLoading, error, refetch } = useFinanceSettings();
  const save = useSaveFinanceSettings();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (data) setForm(fromServer(data));
  }, [data]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !form) return <PageLoader />;
  const f = (k) => ({ value: form[k], error: errors[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const c = (k) => ({ checked: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.checked }) });
  const submit = () => save.mutate(toServer(form), { onError: (err) => setErrors(err.fieldErrors || {}) });

  return (
    <div className="space-y-6">
      <PageHeader title="Finance settings" description="GST, fund accounts, non-occupancy charges, cheque bounce charges, waivers and autopay." />

      <Card>
        <CardHeader title="GST" subtitle="When on, bills become GST tax invoices with CGST and SGST lines. Set a head's rate to 0 to keep it exempt." />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="sm:col-span-3"><Checkbox label="Charge GST on bills" {...c('gstEnabled')} /></div>
          <Input label="Society GSTIN" placeholder="27AAAAA0000A1Z5" {...f('gstin')} />
          <Input label="Default GST rate (%)" type="number" min={0} max={28} {...f('gstDefaultRate')} />
          <Input label="Exempt up to (₹ / month)" type="number" min={0} hint="Members billed at or below this pay no GST (0 = always charge)" {...f('gstExemptUpTo')} />
          <div className="sm:col-span-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{t('GST rate per charge (e.g. sinking fund at 0%)')}</p>
            <HeadRows rows={form.headGst} field="rate" fieldLabel="Rate %" placeholder="18" onChange={(headGst) => setForm({ ...form, headGst })} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Fund & account mapping" subtitle="Which account each charge is credited to. Charges not listed go to 4000 (maintenance income)." />
        <div className="p-5">
          <HeadRows rows={form.headAccounts} field="account" fieldLabel="Account code" placeholder="3100" onChange={(headAccounts) => setForm({ ...form, headAccounts })} />
          <p className="mt-3 text-xs text-slate-500">{t('Common codes: 3100 Sinking fund · 3200 Repair fund · 4000 Maintenance income. Metered utilities use the heads Water, Electricity and Gas.')}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Charges" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Input label="Non-occupancy charge (%)" type="number" min={0} max={100} hint="Of the maintenance charge, for units marked below" {...f('nonOccPercent')} />
          <div className="flex flex-col justify-center gap-2 pt-5">
            <Checkbox label="Rented units" {...c('nonOccRented')} />
            <Checkbox label="Vacant units" {...c('nonOccVacant')} />
          </div>
          <Input label="Cheque bounce charge (₹)" type="number" min={0} hint="Added to the next bill when a cheque bounces" {...f('chequeBounceCharge')} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Controls" />
        <div className="space-y-3 p-5">
          <Checkbox label="Waivers need an admin's approval (maker-checker)" {...c('waiverApprovalRequired')} />
          <Checkbox label="Block amenity bookings for units with overdue dues" {...c('restrictAmenityForDefaulters')} />
          <Checkbox label="Allow residents to set up autopay (UPI AutoPay / e-NACH)" {...c('autopayEnabled')} />
        </div>
      </Card>

      {/* the form is long — keep Save in view (above the phone shortcut bar) */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-3 shadow-sm backdrop-blur lg:bottom-0">
        <p className="min-w-0 flex-1 text-xs text-slate-500">{t('Save after changing anything above.')}</p>
        <Button loading={save.isPending} onClick={submit}>Save settings</Button>
      </div>
    </div>
  );
}
