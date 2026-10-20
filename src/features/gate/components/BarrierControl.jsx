import { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { Button, Card, CardHeader, Input, Modal, Select, StatusBadge } from '../../../components/ui';
import { timeAgo } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { useGates } from '../../gates/api';
import { useBarrierCommands, useOpenBarrier } from '../api';

// "Open barrier" for the guard: queues a command that the barrier controller picks up within seconds.
//   gate: the console's current gate — the barrier of that gate opens. Without it (management pages)
//         the gate is picked from a list.
export function BarrierControl({ compact = false, gate: fixedGate }) {
  const live = useLiveInterval(5000);
  const { t } = useT();
  const { data: gates = [] } = useGates(undefined, { enabled: !fixedGate });
  const [picked, setPicked] = useState('');
  const gate = fixedGate || gates.find((g) => g._id === picked) || gates[0] || null;
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const open = useOpenBarrier({ onSuccess: () => { setReason(''); setConfirming(false); } });
  const { data } = useBarrierCommands({ limit: compact ? 3 : 8, gate: fixedGate?._id }, { refetchInterval: live });
  return (
    <Card>
      <CardHeader title={fixedGate ? t('Boom barrier · {gate}', { gate: fixedGate.name }) : t('Boom barrier')} subtitle="Sends an open command to the gate controller" />
      <div className="space-y-3 p-4">
        <div className={fixedGate ? '' : 'grid gap-3 sm:grid-cols-2'}>
          {!fixedGate && gates.length > 1 && (
            <Select aria-label="Gate" value={gate?._id || ''} onChange={(e) => setPicked(e.target.value)} options={gates.map((g) => ({ value: g._id, label: g.name }))} />
          )}
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button size="lg" icon={DoorOpen} className="w-full" disabled={!gate} onClick={() => setConfirming(true)}>
          Open barrier
        </Button>
        {data?.data.length > 0 && (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.data.map((c) => (
              <li key={c._id} className="flex items-center gap-2 py-2">
                <StatusBadge status={c.status === 'done' ? 'resolved' : c.status === 'failed' ? 'rejected' : c.status} />
                <span className="flex-1 truncate text-slate-700">{c.gate}{c.reason ? ` · ${c.reason}` : ''}</span>
                <span className="text-xs text-slate-400">{c.requestedBy?.name} · {timeAgo(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* A barrier opening by mistake lets an unchecked vehicle in, so it is confirmed first. */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title={gate?.name ? t('Open the {gate} barrier?', { gate: gate.name }) : t('Open the gate barrier?')}
        description={reason ? t('Reason: {reason}', { reason }) : t('The barrier opens within a few seconds.')}
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button size="lg" icon={DoorOpen} loading={open.isPending} onClick={() => open.mutate({ gateId: gate._id, reason: reason || undefined })}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t('Only open it after you have checked the vehicle.')}</p>
      </Modal>
    </Card>
  );
}
