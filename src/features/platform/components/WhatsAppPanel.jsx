import { useState } from 'react';
import { Badge, Button, Input, Pagination, Select, Spinner, Table } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { dateTime, periodLabel } from '../../../lib/format';
import { useAddWhatsAppCredits, usePlatformWhatsApp, usePlatformWhatsAppLedger, useSetWhatsAppMode } from '../../whatsapp/api';
import { KIND_LABELS, MODE_HELP, MODE_LABELS } from '../../whatsapp/lib';

const MODES = Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }));
const ENTRY_LABELS = { grant: 'Credits added', debit: 'Message', refund: 'Refund (failed send)' };

function Ledger({ societyId }) {
  const { t } = useT();
  const [params, setParams] = useState({ page: 1, entry: '' });
  const { data, isLoading } = usePlatformWhatsAppLedger(societyId, { page: params.page, limit: 10, entry: params.entry || undefined });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{t('Credit ledger')}</p>
        <Select aria-label="Ledger entries" className="w-44" placeholder="All entries" value={params.entry} onChange={(e) => setParams({ page: 1, entry: e.target.value })}
          options={Object.entries(ENTRY_LABELS).map(([value, label]) => ({ value, label }))} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No entries yet"
        columns={[
          { key: 'createdAt', header: 'When', render: (r) => dateTime(r.createdAt) },
          { key: 'entry', header: 'Entry', render: (r) => <span>{t(ENTRY_LABELS[r.entry] || '')}{r.kind ? ` · ${t(KIND_LABELS[r.kind] || r.kind)}` : ''}</span> },
          { key: 'amount', header: 'Credits', render: (r) => <span className={r.amount > 0 ? 'text-emerald-700' : 'text-slate-700'}>{r.amount > 0 ? `+${r.amount}` : r.amount}</span> },
          { key: 'balanceAfter', header: 'Balance', mobile: false },
          { key: 'note', header: 'Note', mobile: false, render: (r) => [r.note, r.by?.name && t('by {name}', { name: r.by.name }), r.to].filter(Boolean).join(' · ') || '—' },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setParams((p) => ({ ...p, page }))} />
    </div>
  );
}

// Platform console → society: WhatsApp mode, credits and usage. Needs the whatsapp.manage permission.
export function WhatsAppPanel({ societyId }) {
  const { data, isLoading } = usePlatformWhatsApp(societyId);
  const setMode = useSetWhatsAppMode(societyId);
  const [credit, setCredit] = useState({ amount: '', note: '' });
  const [threshold, setThreshold] = useState(null);
  const [errors, setErrors] = useState({});
  const { t } = useT();
  const add = useAddWhatsAppCredits(societyId, { onSuccess: () => { setCredit({ amount: '', note: '' }); setErrors({}); } });
  if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;
  const kinds = Object.entries(data.usage.byKind);
  return (
    <div className="space-y-4">
      <p className="font-medium text-slate-700">WhatsApp <span className="font-normal text-slate-500">· {t(MODE_HELP[data.mode] || '')}</span></p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Mode" options={MODES} value={data.mode} disabled={setMode.isPending} onChange={(e) => setMode.mutate({ mode: e.target.value })} />
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">{t('Credits left')}</p>
          <p className={`text-lg font-semibold ${data.balance <= 0 ? 'text-red-600' : ''}`}>{data.balance}{data.low && <Badge tone={data.empty ? 'red' : 'amber'} className="ml-2">{data.empty ? t('Used up') : t('Low')}</Badge>}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{t('Used in {month}', { month: periodLabel(data.usage.period) })}</p><p className="text-lg font-semibold">{data.usage.thisMonth}</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
        <Input label="Add credits" type="number" min={1} value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} error={errors['body.amount']} />
        <Input label="Note" placeholder="e.g. Invoice INV-0042, 1000-message pack" value={credit.note} onChange={(e) => setCredit({ ...credit, note: e.target.value })} error={errors['body.note']} />
        <Button disabled={!credit.amount} loading={add.isPending} onClick={() => add.mutate({ amount: Number(credit.amount), note: credit.note }, { onError: (e) => setErrors(e.fieldErrors || {}) })}>Add credits</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Input className="w-40" label="Low-balance warning at" type="number" min={0} value={threshold ?? data.lowBalanceThreshold} onChange={(e) => setThreshold(e.target.value)} />
        <Button size="sm" variant="secondary" disabled={threshold === null} loading={setMode.isPending} onClick={() => setMode.mutate({ lowBalanceThreshold: Number(threshold) }, { onSuccess: () => setThreshold(null) })}>Save</Button>
        <p className="text-xs text-slate-500">{t('Total added {granted} · sent {debited} · refunded {refunded}', { granted: data.totals.granted, debited: data.totals.debited, refunded: data.totals.refunded })}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">{t('This month by type')}</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {kinds.map(([k, n]) => <li key={k} className="flex justify-between px-3 py-1.5"><span>{t(KIND_LABELS[k] || k)}</span><span className="font-medium">{n}</span></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">{t('Monthly usage')}</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {[...data.usage.monthly].reverse().map((m) => <li key={m.period} className="flex justify-between px-3 py-1.5"><span>{periodLabel(m.period)}</span><span className="font-medium">{m.used}</span></li>)}
          </ul>
        </div>
      </div>
      <Ledger societyId={societyId} />
    </div>
  );
}
