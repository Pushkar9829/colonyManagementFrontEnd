import { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { Button, Card, CardHeader, Input, Modal, StatusBadge } from '../../../components/ui';
import { timeAgo } from '../../../lib/format';
import { useBarrierCommands, useGates, useOpenBarrier } from '../api';

// "Open barrier" for the guard: queues a command that the barrier controller picks up within seconds.
export function BarrierControl({ compact = false }) {
  const live = useLiveInterval(5000);
  const { data: gates = ['Main gate'] } = useGates();
  const [gate, setGate] = useState('Main gate');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const open = useOpenBarrier({ onSuccess: () => { setReason(''); setConfirming(false); } });
  const { data } = useBarrierCommands({ limit: compact ? 3 : 8 }, { refetchInterval: live });
  return (
    <Card>
      <CardHeader title="Boom barrier" subtitle="Sends an open command to the gate controller" />
      <div className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Gate" value={gate} onChange={(e) => setGate(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
            {gates.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button size="lg" icon={DoorOpen} className="w-full" onClick={() => setConfirming(true)}>
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
        title={`Open the ${gate} barrier?`}
        description={reason ? `Reason: ${reason}` : 'The barrier opens within a few seconds.'}
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button size="lg" icon={DoorOpen} loading={open.isPending} onClick={() => open.mutate({ gate, reason: reason || undefined })}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Only open it after you have checked the vehicle.</p>
      </Modal>
    </Card>
  );
}
