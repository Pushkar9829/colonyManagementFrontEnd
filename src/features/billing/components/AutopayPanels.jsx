import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, Pagination, Select, StatusBadge, Table } from '../../../components/ui';
import { date, label, money, toPaise } from '../../../lib/format';
import { useAutopayCancel, useAutopayOptIn, useCancelMandate, useMandates, useMyAutopay } from '../api';

// Resident: opt in to autopay with a monthly limit, or switch it off.
export function AutopayCard() {
  const { data } = useMyAutopay();
  const [max, setMax] = useState('');
  const [method, setMethod] = useState('upi');
  const optIn = useAutopayOptIn({ onSuccess: () => setMax('') });
  const cancel = useAutopayCancel();
  if (!data?.enabled) return null;
  const m = data.mandate;
  return (
    <Card className="mb-6">
      <CardHeader title={<span className="flex items-center gap-2"><Repeat className="size-4 text-brand-600" /> Autopay</span>}
        subtitle={m ? 'New bills up to your limit are paid automatically.' : 'Let new bills be paid automatically by UPI AutoPay or e-NACH.'}
        action={m && <Badge tone="green">On</Badge>} />
      <div className="flex flex-wrap items-end gap-3 p-5">
        {m && (
          <div className="mr-auto text-sm text-slate-600">
            <p>Limit <b className="text-slate-900">{money(m.maxAmount)}</b> per bill · {m.method === 'enach' ? 'e-NACH' : 'UPI AutoPay'}</p>
            {m.lastResult && <p className="text-xs text-slate-500">Last: {label(m.lastResult)}{m.lastChargedAt ? ` on ${date(m.lastChargedAt)}` : ''}{m.lastError ? ` · ${m.lastError}` : ''}</p>}
          </div>
        )}
        <Input className="w-40" label={m ? 'New limit (₹)' : 'Limit per bill (₹)'} type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} />
        <Select className="w-40" label="Method" value={method} onChange={(e) => setMethod(e.target.value)} options={[{ value: 'upi', label: 'UPI AutoPay' }, { value: 'enach', label: 'e-NACH' }]} />
        <Button disabled={!Number(max)} loading={optIn.isPending} onClick={() => optIn.mutate({ maxAmount: toPaise(max), method })}>{m ? 'Update' : 'Turn on'}</Button>
        {m && <Button variant="ghost" loading={cancel.isPending} onClick={() => window.confirm('Turn off autopay?') && cancel.mutate()}>Turn off</Button>}
      </div>
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
        <Select className="w-40" placeholder="All" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: 'active', label: 'Active' }, { value: 'cancelled', label: 'Cancelled' }]} />
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
