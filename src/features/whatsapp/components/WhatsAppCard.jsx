import { AlertTriangle } from 'lucide-react';
import { Badge, Card, CardHeader, Spinner } from '../../../components/ui';
import { date } from '../../../lib/format';
import { useWhatsApp } from '../api';
import { KIND_LABELS, MODE_HELP, MODE_LABELS } from '../lib';

// Society settings: WhatsApp mode and credits. Read-only — ColonyHub (the platform team) changes them.
export function WhatsAppCard() {
  const { data, isLoading } = useWhatsApp();
  return (
    <Card>
      <CardHeader title="WhatsApp" subtitle="Managed by ColonyHub. Contact support to change the mode or buy credits."
        action={data && <Badge tone={data.mode === 'api' ? 'green' : data.mode === 'click_to_chat' ? 'blue' : 'slate'}>{MODE_LABELS[data.mode]}</Badge>} />
      {isLoading || !data ? <div className="flex justify-center py-6"><Spinner /></div> : (
        <div className="space-y-4 p-5 text-sm">
          <p className="text-slate-600">{MODE_HELP[data.mode]}</p>
          {data.mode === 'api' && (
            <>
              {data.empty ? (
                <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-700"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Credits used up: automatic WhatsApp messages have stopped (SOS alerts still go out). In-app and push notifications continue.</p>
              ) : data.low && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Running low — below {data.lowBalanceThreshold} credits. Top up to keep messages going.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Credits left</p><p className={`text-xl font-semibold ${data.balance <= 0 ? 'text-red-600' : ''}`}>{data.balance}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Used this month</p><p className="text-xl font-semibold">{data.usage?.thisMonth ?? 0}</p></div>
              </div>
              {data.usage && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">This month by type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.usage.byKind).filter(([, n]) => n).map(([k, n]) => <Badge key={k}>{KIND_LABELS[k] || k}: {n}</Badge>)}
                    {!Object.values(data.usage.byKind).some(Boolean) && <span className="text-xs text-slate-400">No messages yet</span>}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Monthly count restarts on {date(data.usage.nextResetOn)}.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
