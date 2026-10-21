import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, Pagination, Select, Table } from '../../../components/ui';
import { dateTime, label } from '../../../lib/format';
import { actionLabel, detailLines } from '../actions';
import { useT } from '../../../context/LanguageContext';

const ENTITIES = [
  { value: 'Society', label: 'Society settings' },
  { value: 'Membership', label: 'Members' },
  { value: 'User', label: 'User accounts' },
  { value: 'Unit', label: 'Flats / units' },
  { value: 'Block', label: 'Blocks' },
  { value: 'Bill', label: 'Bills' },
  { value: 'Payment', label: 'Payments' },
  { value: 'Adjustment', label: 'Credits, refunds & waivers' },
  { value: 'JournalEntry', label: 'Journal entries' },
  { value: 'VendorBill', label: 'Vendor bills' },
  { value: 'VendorPayment', label: 'Vendor payments' },
  { value: 'Budget', label: 'Budget' },
  { value: 'CommitteeTerm', label: 'Committee' },
  { value: 'Employee', label: 'Employees' },
  { value: 'DeviceKey', label: 'Devices' },
  { value: 'Notice', label: 'Notices' },
  { value: 'Poll', label: 'Polls' },
  { value: 'Amenity', label: 'Amenities' },
  { value: 'SosAlert', label: 'SOS alerts' },
];

const who = (actor, t) => {
  if (!actor) return t('System');
  const role = actor.role ? t(label(actor.role)) : '';
  return role ? `${actor.name} (${role})` : actor.name;
};

export default function AuditPage() {
  const { t } = useT();
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
          <Select label="Show" placeholder="Everything" options={ENTITIES} value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No activity yet"
          columns={[
            { key: 'action', header: 'What happened', render: (l) => <span className="font-medium text-slate-900" title={l.action}>{actionLabel(l.action, t)}</span> },
            { key: 'actor', header: 'Who', render: (l) => who(l.actor, t) },
            { key: 'createdAt', header: 'When', render: (l) => dateTime(l.createdAt) },
            {
              key: 'meta', header: 'Details', render: (l) => {
                const lines = detailLines(l.meta, t);
                if (!lines.length) return '';
                return (
                  <dl className="max-w-md space-y-0.5 whitespace-normal text-xs">
                    {lines.map(([k, v]) => <div key={k} className="break-words"><dt className="inline text-slate-500">{k}: </dt><dd className="inline text-slate-700">{v}</dd></div>)}
                  </dl>
                );
              },
            },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}
