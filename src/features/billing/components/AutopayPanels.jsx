import { useState } from 'react';
import { ChevronRight, Repeat } from 'lucide-react';
import { Button, Card, Input, Pagination, Select, StatusBadge, Table } from '../../../components/ui';
import { date, label, money, toPaise } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { useAutopayCancel, useAutopayOptIn, useCancelMandate, useMandates, useMyAutopay, useSetupAutopay } from '../api';

const methodLabel = (m) => (m === 'enach' ? 'Bank auto-debit (e-NACH)' : 'UPI AutoPay');

// Resident: set up a mandate (authorised once with the bank), change its limit, or switch it off.
// Shown as one tappable row under the bills; the form opens when the row is tapped.
export function AutopayCard() {
  const { t } = useT();
  const { data } = useMyAutopay();
  const [expanded, setExpanded] = useState(false);
  const [max, setMax] = useState('');
  const [method, setMethod] = useState('upi');
  const [renew, setRenew] = useState(false);
  const reset = () => { setMax(''); setRenew(false); };
  const optIn = useAutopayOptIn({ onSuccess: reset });
  const setup = useSetupAutopay({ onSuccess: reset });
  const cancel = useAutopayCancel();
  if (!data?.enabled) return null;
  const m = data.mandate;
  const pending = data.pending;
  const signingUp = !m || renew;
  const status = m ? t('On, up to {amount} per bill', { amount: money(m.maxAmount) }) : pending ? t('Waiting for bank') : t('Off');
  const [maxPre, maxPost] = m ? t('Maximum {amount} per bill · {method}', { method: t(methodLabel(m.method)) }).split('{amount}') : [];
  return (
    <Card className="mt-4">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}
        className="flex min-h-12 w-full items-center gap-2 px-5 py-3 text-left text-sm">
        <Repeat className="size-4 shrink-0 text-brand-600" />
        <span className="min-w-0 flex-1 truncate"><b className="text-slate-900">{t('Autopay')}</b> <span className="text-slate-600">· {status}</span></span>
        <span className="flex shrink-0 items-center font-medium text-brand-700">{m ? t('Manage') : pending ? t('Details') : t('Set up')}<ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} /></span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100">
          <p className="px-5 pt-4 text-sm text-slate-500">{m ? t('New bills up to your limit are paid automatically.') : t('Let new bills be paid automatically by UPI AutoPay or bank auto-debit (e-NACH). You approve it once in your UPI app or net banking.')}</p>
          <div className="flex flex-wrap items-end gap-3 p-5">
            {(m || pending) && (
              <div className="mr-auto w-full text-sm text-slate-600 sm:w-auto">
                {m && <p>{maxPre}<b className="text-slate-900">{money(m.maxAmount)}</b>{maxPost}</p>}
                {m?.lastResult && <p className="text-xs text-slate-500">{m.lastChargedAt ? t('Last: {result} on {date}', { result: t(label(m.lastResult)), date: date(m.lastChargedAt) }) : t('Last: {result}', { result: t(label(m.lastResult)) })}{m.lastError ? ` · ${m.lastError}` : ''}</p>}
                {pending && <p className="text-xs text-amber-700">{t('Your bank is approving a {method} mandate up to {amount} (since {date}). This usually takes 2–3 working days.', { method: t(methodLabel(pending.method)), amount: money(pending.maxAmount), date: date(pending.createdAt) })}</p>}
              </div>
            )}
            <Input className="w-full sm:w-52" label={signingUp ? 'Maximum amount per bill (₹)' : 'New maximum per bill (₹)'} type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} />
            {signingUp && <Select className="w-full sm:w-60" label="Method" value={method} onChange={(e) => setMethod(e.target.value)} options={[{ value: 'upi', label: 'UPI AutoPay' }, { value: 'enach', label: 'Bank auto-debit (e-NACH)' }]} />}
            {signingUp ? (
              <Button disabled={!Number(max)} loading={setup.isPending} onClick={() => setup.mutate({ maxAmount: toPaise(max), method })}>{m ? 'Authorise new mandate' : 'Set up autopay'}</Button>
            ) : (
              <Button disabled={!Number(max)} loading={optIn.isPending} onClick={() => optIn.mutate({ maxAmount: toPaise(max) })}>Update</Button>
            )}
            {m && <Button variant="ghost" onClick={() => setRenew((v) => !v)}>{renew ? 'Keep current mandate' : 'Raise limit / change bank'}</Button>}
            {m && <Button variant="ghost" loading={cancel.isPending} onClick={() => window.confirm(t('Turn off autopay?')) && cancel.mutate()}>Turn off</Button>}
          </div>
          {signingUp && <p className="px-5 pb-4 text-xs text-slate-500">{t('UPI AutoPay debits ₹1 to authorise; it is added to your advance balance. Bank auto-debit (e-NACH) needs no debit.')}</p>}
        </div>
      )}
    </Card>
  );
}

// Accountant: every mandate in the society.
export function MandatesPanel() {
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMandates({ status: status || undefined, page });
  const cancel = useCancelMandate();
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <p className="text-sm text-slate-500">Autopay mandates set up by residents. Bills above a mandate's limit are left for manual payment.</p>
        <Select className="w-40" placeholder="All" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Waiting for bank' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'failed', label: 'Not set up' }]} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No mandates"
        columns={[
          { key: 'unit', header: 'Unit', render: (m) => <span className="font-medium text-slate-900">{m.unit?.label}</span> },
          { key: 'user', header: 'Resident', render: (m) => m.user?.name },
          { key: 'method', header: 'Method', render: (m) => (m.method === 'enach' ? 'e-NACH' : 'UPI AutoPay') },
          { key: 'maxAmount', header: 'Limit', render: (m) => money(m.maxAmount) },
          { key: 'last', header: 'Last charge', render: (m) => (m.lastResult ? `${label(m.lastResult)} · ${date(m.lastChargedAt)}` : '—') },
          { key: 'failures', header: 'Failures', render: (m) => m.failures || 0 },
          { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
          { key: 'act', header: '', render: (m) => m.status === 'active' && <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === m._id} onClick={() => window.confirm('Cancel this mandate?') && cancel.mutate(m._id)}>Cancel</Button> },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}
