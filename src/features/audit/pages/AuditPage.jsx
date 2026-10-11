import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, Pagination, Select, Table } from '../../../components/ui';
import { dateTime, label } from '../../../lib/format';

const ENTITIES = ['Society', 'User', 'Block', 'Unit', 'Bill', 'Payment', 'Notice', 'Poll', 'Amenity', 'SosAlert'];

export default function AuditPage() {
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', entity, page],
    queryFn: () => api.list('/audit-logs', { entity: entity || undefined, page, limit: 30 }),
    placeholderData: (p) => p,
  });
  return (
    <div>
      <PageHeader title="Audit log" description="Who changed what — approvals, billing, payments, settings and deletions." />
      <Card>
        <div className="border-b border-slate-100 p-4 sm:w-64">
          <Select placeholder="All records" options={ENTITIES} value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No activity yet"
          columns={[
            { key: 'createdAt', header: 'When', render: (l) => dateTime(l.createdAt) },
            { key: 'actor', header: 'Who', render: (l) => (l.actor ? `${l.actor.name} (${label(l.actor.role)})` : 'System') },
            { key: 'action', header: 'Action', render: (l) => <span className="font-mono text-xs">{l.action}</span> },
            { key: 'meta', header: 'Details', className: 'max-w-md truncate', render: (l) => <span className="text-xs text-slate-500">{l.meta ? JSON.stringify(l.meta) : ''}</span> },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}
