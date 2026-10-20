import { useState } from 'react';
import { Siren } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useRaiseSos } from '../api';
import { useT } from '../../../context/LanguageContext';

const TYPES = [
  { value: 'medical', label: 'Medical' },
  { value: 'fire', label: 'Fire' },
  { value: 'security', label: 'Security / Theft' },
  { value: 'lift', label: 'Stuck in lift' },
  { value: 'other', label: 'Other' },
];

export function RaiseSosButton() {
  const [open, setOpen] = useState(false);
  const { t: tx } = useT();
  const [type, setType] = useState('medical');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const raise = useRaiseSos({
    onSuccess: () => {
      setOpen(false);
      setMessage('');
      setLocation('');
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
      >
        <Siren className="size-4" /> SOS
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send emergency alert"
        description="Guards and the management team are alerted immediately."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={raise.isPending} onClick={() => raise.mutate({ type, message: message || undefined, location: location || undefined })}>
              Send SOS
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn('rounded-lg border px-3 py-2 text-sm font-medium', type === t.value ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
              >
                {tx(t.label)}
              </button>
            ))}
          </div>
          <Input label="Where? (optional)" placeholder="e.g. Clubhouse, Lift B2" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Textarea label="Details (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
        </div>
      </Modal>
    </>
  );
}
