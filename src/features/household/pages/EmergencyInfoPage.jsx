import { useState } from 'react';
import { HeartPulse, Siren } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, EmptyState, ErrorState, Spinner, StatusBadge } from '../../../components/ui';
import { label, timeAgo } from '../../../lib/format';
import { useOpenSos, useSosContext } from '../api';
import { HouseholdDetail } from '../components/HouseholdDetail';

function Context({ sosId }) {
  const { data, isLoading, error, refetch } = useSosContext(sosId);
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{data.unit ? `Home ${data.unit.label}` : 'Raised outside a home'}{data.alert.location ? ` · at ${data.alert.location}` : ''}{data.alert.message ? ` — ${data.alert.message}` : ''}</p>
      {data.unit && <HouseholdDetail {...data} />}
    </div>
  );
}

// Responders open the medical / emergency details of the home behind an open SOS.
// The server refuses guards once the alert is resolved, so this is never a browsable directory.
export default function EmergencyInfoPage() {
  const { data, isLoading } = useOpenSos();
  const [selected, setSelected] = useState(null);
  const open = (data?.data || []).filter((a) => a.status !== 'resolved');
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Emergency info" description="Medical flags, family members and emergency contacts of homes with an open SOS." />
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !open.length ? <Card><EmptyState icon={HeartPulse} title="No open SOS alerts" description="Details appear here only while an alert is active." /></Card> : (
        <div className="space-y-4">
          {open.map((a) => (
            <Card key={a._id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Siren className="size-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-slate-900">{label(a.type)} · {a.unit?.label || 'No unit'}</p>
                    <p className="text-xs text-slate-500">{a.raisedBy?.name} · {timeAgo(a.createdAt)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <Button size="sm" variant={selected === a._id ? 'secondary' : 'primary'} onClick={() => setSelected(selected === a._id ? null : a._id)}>{selected === a._id ? 'Hide details' : 'Show details'}</Button>
              </div>
              {selected === a._id && <div className="mt-4"><Context sosId={a._id} /></div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
