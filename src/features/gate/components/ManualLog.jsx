import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Card, CardHeader, Input } from '../../../components/ui';
import { useLogMovement } from '../api';

// Guard types a plate (no camera): the server logs the movement and answers registered / unknown / blocked.
//   gate: the console's current gate (omitted = the guard's gate on the server)
export function ManualLog({ gate }) {
  const [plate, setPlate] = useState('');
  const [direction, setDirection] = useState('in');
  const [result, setResult] = useState(null);
  const log = useLogMovement({ onSuccess: (m) => { setResult(m); setPlate(''); }, success: false });
  const submit = (e) => {
    e.preventDefault();
    if (plate.trim().length >= 4) log.mutate({ plate, direction, gateId: gate?._id });
  };
  return (
    <Card>
      <CardHeader title="Check a vehicle" subtitle="Logs the movement and tells you whether it is registered" />
      <form onSubmit={submit} className="space-y-3 p-4">
        <Input placeholder="MH12AB1234" value={plate} onChange={(e) => { setPlate(e.target.value.toUpperCase()); setResult(null); }} aria-label="Vehicle number" className="font-mono" />
        <div className="flex gap-2">
          {['in', 'out'].map((d) => (
            <button key={d} type="button" onClick={() => setDirection(d)} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${direction === d ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>
              {d === 'in' ? 'Entering' : 'Leaving'}
            </button>
          ))}
        </div>
        <Button type="submit" icon={Search} className="w-full" loading={log.isPending} disabled={plate.trim().length < 4}>Check & log</Button>
        {result && (
          <div className={`rounded-lg border px-3 py-2 text-sm ${result.decision === 'allow' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <p className="font-semibold">{result.plate} · {result.decision === 'allow' ? 'Allow' : 'Hold'}</p>
            <p>{result.reason}</p>
            {result.vehicleInfo && <p className="text-xs">{[result.vehicleInfo.make, result.vehicleInfo.color].filter(Boolean).join(' · ')}</p>}
          </div>
        )}
      </form>
    </Card>
  );
}
