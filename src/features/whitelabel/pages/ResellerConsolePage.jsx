import { useState } from 'react';
import { Building, KeyRound, KeySquare, Receipt } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, ErrorState, PageLoader, Pagination, Select, StatCard, StatusBadge, Table } from '../../../components/ui';
import { date, label, money } from '../../../lib/format';
import { useMyInvoices, useMyKeys, useMySocieties, useResellerHome, useRevokeMyKey } from '../api';
import { BrandMark, useBrandColour } from '../components/BrandMark';
import { KeyStatusBadge, termText } from '../components/KeyBits';

// The white-label partner's console: only its own keys, societies and key-pack invoices.
export default function ResellerConsolePage() {
  const { data, isLoading, error, refetch } = useResellerHome();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [socPage, setSocPage] = useState(1);
  const keys = useMyKeys({ status: status || undefined, page });
  const societies = useMySocieties({ page: socPage });
  const invoices = useMyInvoices();
  const revoke = useRevokeMyKey();
  useBrandColour(data?.brand);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { reseller, brand, keys: counts } = data;

  return (
    <div>
      <PageHeader title={reseller.name} description="Your licence keys and the societies that use them. Give an unused key to a new society: they enter it when they register, or under Subscription → Apply a licence key." />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <BrandMark brand={brand} className="text-lg font-semibold text-brand-700" />
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone={reseller.status === 'active' ? 'green' : 'red'}>{label(reseller.status)}</Badge>
            <Badge>Sign-up link: ?brand={reseller.slug}</Badge>
            {reseller.brand?.customDomain && <Badge>{reseller.brand.customDomain}</Badge>}
          </div>
        </div>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={KeyRound} label="Unused keys" value={counts.unused} />
        <StatCard icon={KeySquare} tone="green" label="Used keys" value={counts.active} />
        <StatCard icon={Building} tone="sky" label="Societies" value={data.societies} />
        <StatCard icon={Receipt} tone="amber" label="Keys bought" value={reseller.keysPurchased} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Licence keys" subtitle="Full keys are shown only once, when ColonyHub generates them" action={<Select className="w-36" aria-label="Key status" placeholder="All keys" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: 'unused', label: 'Unused' }, { value: 'active', label: 'Used' }, { value: 'revoked', label: 'Revoked' }]} />} />
        <Table loading={keys.isLoading} rows={keys.data?.data} empty="No keys"
          columns={[
            { key: 'last4', header: 'Key', render: (k) => <span className="font-mono">CH-••••-••••-{k.last4}</span> },
            { key: 'plan', header: 'Plan', render: (k) => `${label(k.plan)} · ${termText(k)}` },
            { key: 'status', header: 'Status', render: (k) => <KeyStatusBadge status={k.status} /> },
            { key: 'society', header: 'Society', render: (k) => k.activatedSociety?.name || '—' },
            { key: 'activatedAt', header: 'Used on', mobile: false, render: (k) => (k.activatedAt ? date(k.activatedAt) : '—') },
            { key: 'actions', header: '', render: (k) => k.status === 'unused' && <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === k._id} onClick={() => window.confirm('Revoke this key? Nobody will be able to use it.') && revoke.mutate(k._id)}>Revoke</Button> },
          ]} />
        <Pagination meta={keys.data?.meta} onPage={setPage} />
      </Card>

      <Card className="mb-6">
        <CardHeader title="Your societies" />
        <Table loading={societies.isLoading} rows={societies.data?.data} empty="No society has used a key yet"
          columns={[
            { key: 'name', header: 'Society', render: (x) => <div><p className="font-medium text-slate-900">{x.name}</p><p className="text-xs text-slate-500">{x.city || '—'}</p></div> },
            { key: 'plan', header: 'Plan', render: (x) => <Badge tone="brand">{label(x.plan?.name || 'free')}</Badge> },
            { key: 'until', header: 'Paid until', render: (x) => (x.keys?.[0]?.expiresAt ? (new Date(x.keys[0].expiresAt).getUTCFullYear() >= 2099 ? 'Lifetime' : date(x.keys[0].expiresAt)) : '—') },
            { key: 'active', header: 'Status', render: (x) => (x.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>) },
          ]} />
        <Pagination meta={societies.data?.meta} onPage={setSocPage} />
      </Card>

      <Card>
        <CardHeader title="Key-pack invoices" />
        <Table loading={invoices.isLoading} rows={invoices.data?.data} empty="No invoices"
          columns={[
            { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium">{i.number}</span> },
            { key: 'keys', header: 'Keys', render: (i) => `${i.keys} × ${money(i.pricePerKey)}` },
            { key: 'total', header: 'Total incl. GST', render: (i) => money(i.total) },
            { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
          ]} />
      </Card>
    </div>
  );
}
