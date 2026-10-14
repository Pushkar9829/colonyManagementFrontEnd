import { useEffect, useState } from 'react';
import { Baby, LogOut, Search } from 'lucide-react';
import { Button, Card, EmptyState, Input, Modal, Spinner, Textarea } from '../../../components/ui';
import { useRaiseExitAlert, useChildren } from '../api';
import { ChildAvatar } from './ChildAlertsList';

// fixedGate: the gate console's current gate; elsewhere the guard types the gate name.
function ExitModal({ child, onClose, fixedGate }) {
  const [gate, setGate] = useState('');
  const [note, setNote] = useState('');
  const raise = useRaiseExitAlert({ onSuccess: onClose });
  return (
    <Modal
      open={Boolean(child)}
      onClose={onClose}
      title="Child exiting the gate"
      description="The parents get an urgent push and SMS and can tell you to hold the child."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="lg" loading={raise.isPending} onClick={() => raise.mutate({ id: child._id, gateId: fixedGate?._id, gate: fixedGate ? undefined : gate.trim() || undefined, note: note.trim() || undefined })}>
            Alert parents
          </Button>
        </>
      }
    >
      {child && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ChildAvatar child={child} className="size-16" />
            <div>
              <p className="text-lg font-semibold text-slate-900">{child.name}</p>
              <p className="text-sm text-slate-500">
                {child.age != null ? `${child.age} yrs · ` : ''}
                {child.unit?.label}
              </p>
            </div>
          </div>
          {fixedGate ? (
            <p className="text-sm text-slate-600">Leaving through <span className="font-semibold text-slate-900">{fixedGate.name}</span></p>
          ) : (
            <Input label="Gate" placeholder="Your gate (leave empty for your current gate)" value={gate} onChange={(e) => setGate(e.target.value)} />
          )}
          <Textarea label="Note" rows={2} placeholder="Optional, e.g. with a friend, heading towards the market" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

// Guard's grid of registered children with a one-tap "Child exiting" alert. Embedded in the gate console,
// which passes its current gate.
export function ChildExitPanel({ gate }) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [exiting, setExiting] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);
  const { data, isLoading } = useChildren({ search: search || undefined, limit: 60 });
  const children = data?.data || [];

  return (
    <Card>
      <div className="border-b border-slate-100 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search child by name"
            aria-label="Search child by name"
            className="block h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !children.length ? (
        <EmptyState icon={Baby} title={search ? 'No child matches' : 'No children registered for exit alerts'} />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {children.map((c) => (
            <div key={c._id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={c.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-slate-300">
                  <Baby className="size-12" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-2.5">
                <p className="truncate font-semibold text-slate-900">{c.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {c.age != null ? `${c.age} yrs · ` : ''}
                  {c.unit?.label}
                </p>
                {c.notes && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{c.notes}</p>}
                <button
                  type="button"
                  onClick={() => setExiting(c)}
                  className="mt-2.5 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2 text-sm font-bold text-white shadow-sm hover:bg-red-700"
                >
                  <LogOut className="size-4" />
                  Child exiting
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ExitModal key={exiting?._id} child={exiting} fixedGate={gate} onClose={() => setExiting(null)} />
    </Card>
  );
}
