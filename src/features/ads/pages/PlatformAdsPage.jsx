import { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, Checkbox, Input, Pagination, Table, Tabs } from '../../../components/ui';
import { usePlatformAdSocieties, useSetSocietyAds } from '../api';
import { AdsManager } from '../components/AdsManager';

function SocietyAdsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, isLoading } = usePlatformAdSocieties({ search: search || undefined, page });
  const setAllowed = useSetSocietyAds();
  if (open) {
    return (
      <div className="space-y-3">
        <Button variant="secondary" size="sm" onClick={() => setOpen(null)}>← All societies</Button>
        <p className="text-sm text-slate-600">Ads run by <span className="font-medium">{open.name}</span> (read-only).</p>
        <AdsManager scope="platform" society={open._id} readOnly />
      </div>
    );
  }
  return (
    <Card>
      <CardHeader title="Ads run by societies" subtitle="Switch off a society’s own ads if they misuse them. Platform ads are not affected." />
      <div className="px-5 pb-3"><Input aria-label="Search societies" placeholder="Search societies" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
      <Table loading={isLoading} rows={data?.data} empty="No societies"
        columns={[
          { key: 'name', header: 'Society', render: (s) => <div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.city}</p></div> },
          { key: 'n', header: 'Their ads', render: (s) => (s.societyAds ? <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => setOpen(s)}>{s.societyAds}</button> : 0) },
          { key: 'allow', header: 'Society ads', render: (s) => <Checkbox label={s.allowSocietyAds ? 'Allowed' : 'Off'} checked={s.allowSocietyAds} disabled={setAllowed.isPending} onChange={(e) => setAllowed.mutate({ id: s._id, allowSocietyAds: e.target.checked })} /> },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

// Platform console: ads for all or chosen societies (and roles), plus control over societies' own ads.
export default function PlatformAdsPage() {
  const [tab, setTab] = useState('platform');
  return (
    <div>
      <PageHeader title="Ads" description="Banner and pop-up ads (image or short video) shown inside the app." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'platform', label: 'Platform ads' }, { value: 'societies', label: 'Society ads' }]} />
      {tab === 'platform' ? <AdsManager scope="platform" /> : <SocietyAdsTab />}
    </div>
  );
}
