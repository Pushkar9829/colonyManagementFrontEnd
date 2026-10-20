import { useState } from 'react';
import { Check, DoorOpen, MapPin } from 'lucide-react';
import { Button, Modal, Spinner } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { describeGate } from '../gateRules';
import { useT } from '../../../context/LanguageContext';

// List of gates to choose from (big tap targets: the console runs on phones and tablets).
export function GateList({ gates, value, onPick }) {
  const { t } = useT();
  return (
    <ul className="space-y-2">
      {gates.map((g) => (
        <li key={g._id}>
          <button
            type="button"
            onClick={() => onPick(g)}
            className={cn(
              'flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
              value === g._id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50',
            )}
          >
            <DoorOpen className={cn('size-5 shrink-0', value === g._id ? 'text-brand-600' : 'text-slate-400')} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">{g.name}</span>
              <span className="block text-xs text-slate-500">{describeGate(g, t)}</span>
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{g.code}</span>
            {value === g._id && <Check className="size-5 text-brand-600" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

// Console header strip: the gate in use, shown large, with "Change gate". When the gate cannot be
// chosen automatically the picker opens by itself.
//   current: useCurrentGate() result
export function GateBar({ current }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const { gate, gates, choose, loading, needsChoice } = current;
  const showPicker = open || needsChoice;
  const pick = (g) => {
    choose(g);
    setOpen(false);
  };
  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <MapPin className="size-6 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{t('You are at')}</p>
          {loading ? (
            <Spinner />
          ) : (
            <p className="truncate text-lg font-bold text-slate-900">{gate ? gate.name : t('No gate chosen')}</p>
          )}
          {gate && <p className="truncate text-xs text-slate-600">{describeGate(gate, t)}</p>}
        </div>
        {gates.length > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            Change gate
          </Button>
        )}
      </div>
      <Modal
        open={showPicker}
        onClose={() => (gate ? setOpen(false) : undefined)}
        title="Which gate are you at?"
        description="Everything you log is recorded at this gate. This device remembers your choice."
        size="sm"
        footer={gate ? <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button> : null}
      >
        <GateList gates={gates} value={gate?._id} onPick={pick} />
      </Modal>
    </>
  );
}
