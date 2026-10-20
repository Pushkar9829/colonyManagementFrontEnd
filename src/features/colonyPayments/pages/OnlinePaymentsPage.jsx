import { useState } from 'react';
import { CheckCircle2, CircleAlert, Copy, KeyRound, Landmark, PlugZap, Power, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, ErrorState, Input, PageLoader } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../lib/cn';
import { dateTime, label } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { MODE_LABELS, ROUTE_TONES, STATUS_BADGES } from '../lib';
import { useChooseMode, useDisableOnline, useEnableOnline, usePaymentSettings, useSaveOwnKeys, useTestConnection, useTestPayment } from '../api';

const MODE_INFO = {
  own: { icon: KeyRound, text: 'Money goes straight to your society’s own Razorpay account. You need a Razorpay account and its API keys.' },
  route: { icon: Landmark, text: 'No Razorpay account needed. ColonyHub collects through Razorpay Route and Razorpay transfers it to your society’s bank account.' },
};

function Step({ done, n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
        {done ? <CheckCircle2 className="size-4" aria-hidden="true" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">{title}</p>
        <div className="mt-1 text-sm text-slate-600">{children}</div>
      </div>
    </li>
  );
}

function OwnKeysForm({ settings, canEdit }) {
  const [form, setForm] = useState({ keyId: settings.own.keyId || '', keySecret: '', webhookSecret: '' });
  const [errors, setErrors] = useState({});
  const save = useSaveOwnKeys({ onSuccess: () => setForm((f) => ({ ...f, keySecret: '', webhookSecret: '' })) });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = () => {
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v));
    save.mutate(body, { onError: (e) => setErrors(e.fieldErrors || {}) });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Input label="Key id" disabled={!canEdit} placeholder="rzp_live_…" value={form.keyId} onChange={set('keyId')} error={errors.keyId} />
      <Input label="Key secret" type="password" autoComplete="off" disabled={!canEdit} placeholder={settings.own.keySecretLast4 ? `saved ••••${settings.own.keySecretLast4}` : 'from Razorpay → API keys'} value={form.keySecret} onChange={set('keySecret')} error={errors.keySecret} hint="Stored encrypted, never shown again" />
      <Input label="Webhook secret" type="password" autoComplete="off" disabled={!canEdit} placeholder={settings.own.webhookSecretLast4 ? `saved ••••${settings.own.webhookSecretLast4}` : 'any long secret'} value={form.webhookSecret} onChange={set('webhookSecret')} error={errors.webhookSecret} />
      {canEdit && <div className="sm:col-span-3"><Button size="sm" loading={save.isPending} disabled={!form.keyId && !form.keySecret && !form.webhookSecret} onClick={submit}>Save keys</Button></div>}
    </div>
  );
}

export default function OnlinePaymentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: s, isLoading, error, refetch } = usePaymentSettings();
  const choose = useChooseMode();
  const testConn = useTestConnection();
  const testPay = useTestPayment();
  const enable = useEnableOnline();
  const disable = useDisableOnline();
  const canEdit = user.role === ROLES.ADMIN;

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.off;
  const own = s.mode === 'own';
  const route = s.mode === 'route';
  const connected = Boolean(s.own.connection?.ok);
  const testOk = Boolean(s.testPayment?.ok && s.testPayment.mode === s.mode);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div>
      <PageHeader title="Online payments" description="Choose how residents’ online payments (maintenance bills, advances, amenity bookings, event tickets and autopay) reach your society’s bank account." />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <Wallet className="size-8 text-brand-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">{MODE_LABELS[s.mode]}</p>
              <p className="text-sm text-slate-500">{s.status === 'active' ? `Residents can pay online${s.activatedAt ? ` · live since ${dateTime(s.activatedAt)}` : ''}` : s.statusReason}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badge.tone}>{badge.text}</Badge>
            {s.provider === 'mock' && <Badge tone="sky">Test mode</Badge>}
            {canEdit && s.status === 'active' && <Button size="sm" variant="secondary" icon={Power} loading={disable.isPending} onClick={() => window.confirm('Residents will not be able to pay online until you switch it on again. Continue?') && disable.mutate()}>Switch off</Button>}
          </div>
        </div>
        {s.forceDisabled && (
          <p className="flex items-start gap-2 border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 size-4 shrink-0" />ColonyHub has switched online payments off for your society{s.forceDisabledReason ? `: ${s.forceDisabledReason}` : ''}. Contact support.</p>
        )}
        {s.legacy && (
          <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">Payments currently go to the ColonyHub account (the original setup). Choose one of the options below so money reaches your society directly.</p>
        )}
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {['own', 'route'].map((mode) => {
          const Icon = MODE_INFO[mode].icon;
          const allowed = s.allowedModes.includes(mode);
          const selected = s.mode === mode;
          return (
            <button key={mode} type="button" disabled={!canEdit || !allowed || selected || choose.isPending || s.forceDisabled} onClick={() => choose.mutate(mode)}
              className={cn('rounded-xl border p-4 text-left transition disabled:cursor-default', selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300', !allowed && 'opacity-50')}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium text-slate-900"><Icon className="size-5 text-brand-600" aria-hidden="true" />{MODE_LABELS[mode]}</span>
                {selected ? <Badge tone="brand">Selected</Badge> : !allowed ? <Badge>Not available</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">{MODE_INFO[mode].text}</p>
            </button>
          );
        })}
      </div>

      {own && (
        <Card className="mb-6">
          <CardHeader title="Set up your Razorpay account" subtitle="Razorpay Dashboard → Account & Settings → API keys" />
          <ol className="space-y-5 p-5">
            <Step n={1} done={Boolean(s.own.keyId && s.own.keySecretLast4)} title="Enter your API keys">
              <OwnKeysForm key={s.own.keyId || 'new'} settings={s} canEdit={canEdit} />
            </Step>
            <Step n={2} done={connected} title="Test the connection">
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && <Button size="sm" variant="secondary" icon={PlugZap} loading={testConn.isPending} disabled={!s.own.keySecretLast4} onClick={() => testConn.mutate()}>Test connection</Button>}
                {s.own.connection && <span className={s.own.connection.ok ? 'text-emerald-700' : 'text-red-600'}>{s.own.connection.ok ? 'Connected' : s.own.connection.error} · {dateTime(s.own.connection.at)}</span>}
              </div>
            </Step>
            <Step n={3} done={Boolean(s.own.webhookSecretLast4)} title="Add the webhook in Razorpay (recommended)">
              <p>Dashboard → Webhooks → Add: this URL, your webhook secret, events payment.captured, payment.failed, order.paid and token.*.</p>
              {s.webhookUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                  <code className="min-w-0 flex-1 break-all text-xs">{s.webhookUrl}</code>
                  <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(s.webhookUrl)}>Copy</Button>
                </div>
              )}
            </Step>
          </ol>
        </Card>
      )}

      {route && (
        <Card className="mb-6">
          <CardHeader title="Razorpay Route onboarding" subtitle="ColonyHub registers your society’s bank account with Razorpay as a linked account" />
          <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Linked account</dt><dd className="font-mono">{s.route.linkedAccountId || 'Being set up'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Status</dt><dd><Badge tone={ROUTE_TONES[s.route.status]}>{label(s.route.status)}</Badge></dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">KYC</dt><dd>{s.route.kycStatus ? label(s.route.kycStatus) : '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Bank account</dt><dd>{s.route.bank?.accountLast4 ? `${s.route.bank.bankName || ''} ••••${s.route.bank.accountLast4}` : '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Platform commission</dt><dd>{s.route.commissionPercent}%</dd></div>
          </dl>
          {s.route.status !== 'active' && <p className="px-5 pb-5 text-sm text-slate-500">Send your bank details and KYC documents to ColonyHub support. Online payments can be switched on once Razorpay activates the account.</p>}
        </Card>
      )}

      {(own || route || s.legacy) && (
        <Card>
          <CardHeader title="Go live" />
          <div className="flex flex-wrap items-center gap-3 p-5">
            {canEdit && <Button variant="secondary" loading={testPay.isPending} disabled={s.forceDisabled || (own && !connected) || (route && s.route.status !== 'active')} onClick={() => testPay.mutate()}>Test ₹1 payment</Button>}
            {s.testPayment && <span className={testOk ? 'text-sm text-emerald-700' : 'text-sm text-slate-500'}>{testOk ? `₹1 test payment succeeded · ${dateTime(s.testPayment.at)}` : s.testPayment.error || 'Not tested with this mode'}</span>}
            <div className="flex-1" />
            {canEdit && s.status !== 'active' && <Button icon={Power} loading={enable.isPending} disabled={s.forceDisabled} onClick={() => enable.mutate()}>Switch on online payments</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}
