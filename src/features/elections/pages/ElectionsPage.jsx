import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Vote } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Input, Modal, PageLoader, Select, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { dateTime } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useCreateElection, useElections } from '../api';
import { ELIGIBILITY, ElectionStatus } from '../components';

function NewElectionModal({ open, onClose }) {
  const navigate = useNavigate();
  const { values, bind, applyServerErrors } = useForm({ title: '', description: '', eligibility: 'unit_owner', nominationStart: '', nominationEnd: '', votingStart: '', votingEnd: '' });
  const [positions, setPositions] = useState([{ title: 'Chairman', seats: 1 }, { title: 'Secretary', seats: 1 }, { title: 'Treasurer', seats: 1 }]);
  const create = useCreateElection({ onSuccess: (e) => { onClose(); navigate(`/elections/${e._id}`); } });
  const iso = (v) => (v ? new Date(v).toISOString() : undefined);
  const setPos = (i, patch) => setPositions(positions.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <Modal open={open} onClose={onClose} size="lg" title="New election" description="Formal e-voting with nominations, scrutiny and a secret ballot."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({
        title: values.title,
        description: values.description || undefined,
        eligibility: values.eligibility,
        positions: positions.filter((p) => p.title.trim()).map((p) => ({ title: p.title, seats: Number(p.seats) || 1 })),
        nominationStart: iso(values.nominationStart),
        nominationEnd: iso(values.nominationEnd),
        votingStart: iso(values.votingStart),
        votingEnd: iso(values.votingEnd),
      }, { onError: applyServerErrors })}>Create draft</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" required placeholder="Managing Committee Election 2026" {...bind('title')} />
        <Textarea className="sm:col-span-2" label="Description" rows={2} {...bind('description')} />
        <Select className="sm:col-span-2" label="Who votes" options={ELIGIBILITY} {...bind('eligibility')} />
        <Input type="datetime-local" label="Nominations open" {...bind('nominationStart')} />
        <Input type="datetime-local" label="Nominations close" {...bind('nominationEnd')} />
        <Input type="datetime-local" label="Voting opens" {...bind('votingStart')} />
        <Input type="datetime-local" label="Voting closes" {...bind('votingEnd')} />
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Positions</p>
          {positions.map((p, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="flex gap-2">
              <Input className="flex-1" placeholder="Position" value={p.title} onChange={(e) => setPos(i, { title: e.target.value })} />
              <Input className="w-24" type="number" min="1" aria-label="Seats" value={p.seats} onChange={(e) => setPos(i, { seats: e.target.value })} />
              <Button variant="ghost" icon={Trash2} aria-label="Remove position" disabled={positions.length === 1} onClick={() => setPositions(positions.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPositions([...positions, { title: '', seats: 1 }])}>Add position</Button>
          <p className="text-xs text-slate-500">The number is the seats to fill (e.g. 5 committee members).</p>
        </div>
      </div>
    </Modal>
  );
}

export default function ElectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useElections({ limit: 50 });
  const admin = user.role === ROLES.ADMIN;
  if (isLoading) return <PageLoader />;
  const items = data?.data || [];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Elections" description="Committee elections with nominations and secret e-voting." actions={admin && <Button icon={Plus} onClick={() => setCreating(true)}>New election</Button>} />
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((e) => (
            <Card key={e._id} className="cursor-pointer p-5 transition hover:border-brand-200 hover:shadow" onClick={() => navigate(`/elections/${e._id}`)}>
              {/* title first and allowed to wrap; status under it; the reference number is the least important */}
              <p className="break-words font-semibold text-slate-900">{e.title}</p>
              <div className="mt-1.5"><ElectionStatus status={e.status} /></div>
              <p className="mt-1 font-mono text-[11px] text-slate-400">{e.number}</p>
              <p className="mt-2 text-sm text-slate-600">{e.positions.map((p) => `${p.title}${p.seats > 1 ? ` ×${p.seats}` : ''}`).join(' · ')}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {e.status === 'voting' && e.votingEnd && <span>Voting closes {dateTime(e.votingEnd)}</span>}
                {e.status === 'nominations' && e.nominationEnd && <span>Nominations close {dateTime(e.nominationEnd)}</span>}
                {e.status === 'voting' && (e.me?.hasVoted ? <Badge tone="green">You have voted</Badge> : e.me?.eligible && <Badge tone="amber">Your vote is pending</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      ) : <Card><EmptyState icon={Vote} title="No elections yet" /></Card>}
      {admin && <NewElectionModal open={creating} onClose={() => setCreating(false)} />}
    </div>
  );
}
