import { useState } from 'react';
import { Badge, Button, Checkbox, Input, Spinner } from '../../../components/ui';
import { dateTime, label } from '../../../lib/format';
import { useCan } from '../../platform/useCan';
import { MODE_LABELS, ROUTE_TONES, STATUS_BADGES } from '../lib';
import { usePlatformPaymentSettings, useRefreshRoute, useUpdatePlatformPaymentSettings } from '../api';
import { useT } from '../../../context/LanguageContext';

// Platform console → society: which payment modes it may use, its Route linked account and commission,
// and the force-disable switch. Editing needs payments.manage.
export function PlatformPaymentsPanel({ societyId }) {
  const { t } = useT();
  const { data: s, isLoading } = usePlatformPaymentSettings(societyId);
  const [route, setRoute] = useState(null);
  const [errors, setErrors] = useState({});
  const update = useUpdatePlatformPaymentSettings(societyId, { onSuccess: () => setRoute(null) });
  const refresh = useRefreshRoute(societyId);
  const canManage = useCan()('payments.manage');
  if (isLoading || !s) return <div className="flex justify-center py-4"><Spinner /></div>;
  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.off;
  const r = route ?? {
    linkedAccountId: s.route.linkedAccountId || '',
    status: s.route.status,
    commissionPercent: s.route.commissionPercent ?? 0,
    accountName: s.route.bank?.accountName || '',
    accountLast4: s.route.bank?.accountLast4 || '',
    ifsc: s.route.bank?.ifsc || '',
    bankName: s.route.bank?.bankName || '',
  };
  const set = (k) => (e) => setRoute({ ...r, [k]: e.target.value });
  const toggleMode = (mode) => {
    const next = s.allowedModes.includes(mode) ? s.allowedModes.filter((m) => m !== mode) : [...s.allowedModes, mode];
    update.mutate({ allowedModes: next });
  };
  const saveRoute = () => {
    const bank = Object.fromEntries(Object.entries({ accountName: r.accountName, accountLast4: r.accountLast4, ifsc: r.ifsc, bankName: r.bankName }).filter(([, v]) => v));
    update.mutate({ route: { linkedAccountId: r.linkedAccountId, status: r.status, commissionPercent: Number(r.commissionPercent) || 0, bank } }, { onError: (e) => setErrors(e.fieldErrors || {}) });
  };

  return (
    <div>
      <p className="mb-2 font-medium text-slate-700">{t('Online payments')}</p>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Badge tone={badge.tone}>{t(badge.text)}</Badge>
        <Badge>{MODE_LABELS[s.mode] ? t(MODE_LABELS[s.mode]) : s.mode}</Badge>
        {s.own.keyId && <Badge>{s.own.keySecretLast4 ? t('Key {id} · secret ••••{last4}', { id: s.own.keyId, last4: s.own.keySecretLast4 }) : t('Key {id}', { id: s.own.keyId })}</Badge>}
        {s.activatedAt && <Badge tone="green">{t('Live since {date}', { date: dateTime(s.activatedAt) })}</Badge>}
        {s.testPayment && <Badge tone={s.testPayment.ok ? 'green' : 'amber'}>{s.testPayment.ok ? t('₹1 test passed') : t('₹1 test not passed')}</Badge>}
      </div>
      {s.statusReason && <p className="mb-3 text-xs text-slate-500">{t(s.statusReason)}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <span className="text-sm text-slate-600">{t('Allowed modes:')}</span>
        {['own', 'route'].map((m) => (
          <Checkbox key={m} label={MODE_LABELS[m]} checked={s.allowedModes.includes(m)} disabled={!canManage || update.isPending} onChange={() => toggleMode(m)} />
        ))}
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
        <p className="text-sm font-medium text-slate-700 sm:col-span-3">{t('Razorpay Route linked account')} {s.route.refreshedAt && <span className="font-normal text-slate-500">· {t('checked {date}', { date: dateTime(s.route.refreshedAt) })}</span>}</p>
        <Input label="Linked account id" disabled={!canManage} placeholder="acc_…" value={r.linkedAccountId} onChange={set('linkedAccountId')} error={errors['route.linkedAccountId']} />
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">{t('Status')}</p>
          <div className="flex items-center gap-2"><Badge tone={ROUTE_TONES[s.route.status]}>{t(label(s.route.status))}</Badge>{s.route.kycStatus && <span className="text-xs text-slate-500">{t('KYC {status}', { status: t(label(s.route.kycStatus)) })}</span>}</div>
        </div>
        <Input label="Commission (%)" type="number" min={0} max={20} step="0.1" disabled={!canManage} value={r.commissionPercent} onChange={set('commissionPercent')} hint="Kept by the platform" />
        <Input label="Account name" disabled={!canManage} value={r.accountName} onChange={set('accountName')} />
        <Input label="Account last 4" disabled={!canManage} maxLength={4} value={r.accountLast4} onChange={set('accountLast4')} error={errors['route.bank.accountLast4']} />
        <Input label="IFSC" disabled={!canManage} value={r.ifsc} onChange={set('ifsc')} error={errors['route.bank.ifsc']} />
        {canManage && (
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button size="sm" disabled={!route} loading={update.isPending} onClick={saveRoute}>Save linked account</Button>
            <Button size="sm" variant="secondary" disabled={!s.route.linkedAccountId} loading={refresh.isPending} onClick={() => refresh.mutate()}>Refresh status from Razorpay</Button>
          </div>
        )}
      </div>

      {canManage && (
        <div className="mt-3">
          {s.forceDisabled ? (
            <Button size="sm" variant="success" loading={update.isPending} onClick={() => update.mutate({ forceDisabled: false })}>Allow online payments again</Button>
          ) : (
            <Button size="sm" variant="danger" loading={update.isPending} onClick={() => { const reason = window.prompt(t('Why are online payments being switched off? (shown to the society)')); if (reason !== null) update.mutate({ forceDisabled: true, forceDisabledReason: reason || undefined }); }}>Force-disable online payments</Button>
          )}
          {s.forceDisabled && <span className="ml-2 text-xs text-red-600">{s.forceDisabledReason ? t('Off by platform: {reason}', { reason: s.forceDisabledReason }) : t('Off by platform')}</span>}
        </div>
      )}
    </div>
  );
}
