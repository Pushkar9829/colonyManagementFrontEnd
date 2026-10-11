import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Siren } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, EmptyState, Pagination, Spinner, StatusBadge, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { dateTime, label, timeAgo } from '../../../lib/format';
import { hasRole } from '../../../lib/roles';
import { useAcknowledgeSos, useResolveSos, useSosAlerts } from '../api';

export default function SosPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSosAlerts({ status: status || undefined, page });
  const ack = useAcknowledgeSos();
  const resolve = useResolveSos();
  const responder = hasRole(user, 'guard', 'facility_manager');

  return (
    <div>
      <PageHeader
        title="SOS alerts"
        description={responder ? 'Emergency alerts from residents. This page refreshes automatically.' : 'Alerts you have raised.'}
        actions={<Link to="/emergency"><Button variant="secondary" icon={PhoneCall}>Emergency numbers</Button></Link>}
      />
      <Tabs
        className="mb-4 w-fit"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={[
          { value: '', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'acknowledged', label: 'Acknowledged' },
          { value: 'resolved', label: 'Resolved' },
        ]}
      />
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !data?.data.length ? (
          <EmptyState icon={Siren} title="No alerts" description="Use the red SOS button at the top in an emergency." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((a) => (
              <li key={a._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${a.status === 'active' ? 'bg-red-50/60' : ''}`}>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Siren className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{label(a.type)} emergency</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {a.raisedBy?.name}
                    {a.unit ? ` · ${a.unit.label}` : ''}
                    {a.raisedBy?.phone ? ` · ${a.raisedBy.phone}` : ''}
                    {a.location ? ` · at ${a.location}` : ''}
                  </p>
                  {a.message && <p className="mt-1 text-sm text-slate-700">“{a.message}”</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {dateTime(a.createdAt)} ({timeAgo(a.createdAt)})
                    {a.acknowledgedBy ? ` · acknowledged by ${a.acknowledgedBy.name}` : ''}
                    {a.resolvedBy ? ` · resolved by ${a.resolvedBy.name}` : ''}
                    {a.resolutionNote ? ` — ${a.resolutionNote}` : ''}
                  </p>
                </div>
                {a.status !== 'resolved' && (
                  <div className="flex flex-wrap gap-2">
                    {responder && (
                      <Link to="/emergency-info" className="inline-flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50">
                        Medical info
                      </Link>
                    )}
                    {responder && a.status === 'active' && (
                      <Button size="sm" loading={ack.isPending && ack.variables === a._id} onClick={() => ack.mutate(a._id)}>
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const note = window.prompt(responder ? 'Resolution note' : 'Why are you closing this alert?') ?? null;
                        if (note !== null) resolve.mutate({ id: a._id, resolutionNote: note || undefined });
                      }}
                    >
                      {responder ? 'Resolve' : 'Cancel alert'}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}
