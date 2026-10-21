import { useState } from 'react';
import { Ban } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, FilterBar, Pagination, Select, Table } from '../../../components/ui';
import { dateTime } from '../../../lib/format';
import { usePlatformCancelDraw, usePlatformDraws } from '../api';
import { ConfirmModal } from '../components/ConfirmModal';
import { prizeSummary } from '../lib';
import { PhaseBadge } from './LuckyDrawsPage';
import { useT } from '../../../context/LanguageContext';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Entries closed' },
  { value: 'drawn', label: 'Drawn' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Platform console: every society's lucky draws, with a cancel switch for misuse (e.g. a paid "draw").
export default function PlatformLuckyDrawsPage() {
  const { t } = useT();
  const [f, setF] = useState({ status: '', page: 1 });
  const [cancelling, setCancelling] = useState(null);
  const { data, isLoading } = usePlatformDraws(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')));
  const cancel = usePlatformCancelDraw({ onSuccess: () => setCancelling(null) });
  const columns = [
    { key: 'title', header: 'Draw', wrap: true, render: (d) => <div><p className="font-medium text-slate-900">{d.title}</p><p className="text-xs text-slate-500">{d.number}</p></div> },
    { key: 'society', header: 'Society', render: (d) => d.society?.name || '—' },
    { key: 'phase', header: 'Status', render: (d) => <PhaseBadge phase={d.phase} /> },
    { key: 'prizes', header: 'Prizes', wrap: true, render: (d) => prizeSummary(d.prizes) },
    { key: 'entrantCount', header: 'Entrants' },
    { key: 'entryClosesAt', header: 'Entries close', render: (d) => dateTime(d.entryClosesAt) },
    { key: 'actions', header: '', render: (d) => (['draft', 'open', 'closed'].includes(d.status) ? <Button size="sm" variant="ghost" icon={Ban} onClick={() => setCancelling(d)}>Cancel</Button> : d.cancelledReason ? <span className="text-xs text-slate-500">{d.cancelledReason}</span> : null) },
  ];
  return (
    <div>
      <PageHeader title="Lucky draws" description="Draws across all societies. Entry must always be free." />
      <Card>
        <FilterBar cols={3} active={f.status ? 1 : 0}>
          <Select label="Status" value={f.status} onChange={(e) => setF({ status: e.target.value, page: 1 })} options={STATUSES} />
        </FilterBar>
        <Table columns={columns} rows={data?.data} loading={isLoading} empty="No lucky draws yet" emptyHint="Draws appear here once a society creates one." />
        <Pagination meta={data?.meta} onPage={(page) => setF({ ...f, page })} />
      </Card>
      {cancelling && (
        <ConfirmModal title={t('Cancel {number}?', { number: cancelling.number })} message={t('"{title}" at {society}. Entrants are notified and the society sees your reason.', { title: cancelling.title, society: cancelling.society?.name })}
          confirmLabel="Cancel draw" variant="danger" reasonLabel="Reason" loading={cancel.isPending}
          onConfirm={(reason) => cancel.mutate({ id: cancelling._id, reason })} onClose={() => setCancelling(null)} />
      )}
    </div>
  );
}
