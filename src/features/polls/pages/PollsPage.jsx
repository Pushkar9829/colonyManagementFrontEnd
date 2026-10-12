import { useState } from 'react';
import { CheckCircle2, Plus, Trash2, Vote } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, Input, Modal, Pagination, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/cn';
import { dateTime } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { AudienceFields, cleanAudience } from '../../community/AudienceFields';
import { useClosePoll, useCreatePoll, usePolls, usePollVoters, useVote } from '../api';

function PollModal({ open, onClose }) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [closesAt, setClosesAt] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [audience, setAudience] = useState({ type: 'all', blocks: [], roles: [] });
  const [errors, setErrors] = useState({});
  const create = useCreatePoll({ onSuccess: onClose });
  const submit = () =>
    create.mutate(
      { question, description: description || undefined, options: options.map((o) => o.trim()).filter(Boolean), anonymous, audience: cleanAudience(audience), closesAt: closesAt ? new Date(closesAt).toISOString() : undefined },
      { onError: (e) => setErrors(e.fieldErrors || {}) },
    );
  return (
    <Modal open={open} onClose={onClose} title="Create poll" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Publish poll</Button></>}>
      <div className="space-y-4">
        <Input label="Question" required value={question} onChange={(e) => setQuestion(e.target.value)} error={errors.question} />
        <Textarea label="Details" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Options</p>
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
              {options.length > 2 && <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-red-600" aria-label="Remove option"><Trash2 className="size-4" /></button>}
            </div>
          ))}
          {errors.options && <p className="text-xs text-red-600">{errors.options}</p>}
          {options.length < 10 && <Button size="sm" variant="ghost" icon={Plus} onClick={() => setOptions([...options, ''])}>Add option</Button>}
        </div>
        <Input label="Closes at" type="datetime-local" hint="Optional" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} error={errors.closesAt} />
        <AudienceFields value={audience} onChange={setAudience} />
        <Checkbox label="Anonymous (hide who voted for what)" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
      </div>
    </Modal>
  );
}

function VotersModal({ poll, onClose }) {
  const { data = [], isLoading } = usePollVoters(poll?._id);
  return (
    <Modal open={Boolean(poll)} onClose={onClose} title="Votes" description={poll?.question}>
      {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : !data.length ? <EmptyState title="No votes yet" /> : (
        <ul className="divide-y divide-slate-100 text-sm">
          {data.map((v) => <li key={v._id} className="flex justify-between py-2"><span>{v.user?.name}{v.unit ? ` · ${v.unit.label}` : ''}</span><span className="font-medium">{poll.options[v.optionIndex]?.text}</span></li>)}
        </ul>
      )}
    </Modal>
  );
}

function PollCard({ poll, manager, onVoters }) {
  const vote = useVote();
  const close = useClosePoll();
  const voted = poll.myVote !== null;
  const showResults = voted || poll.status === 'closed' || manager;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{poll.question}</h3>
          {poll.description && <p className="mt-1 text-sm text-slate-600">{poll.description}</p>}
        </div>
        <div className="flex gap-1.5">
          <Badge tone={poll.status === 'open' ? 'green' : 'slate'}>{poll.status === 'open' ? 'Open' : 'Closed'}</Badge>
          {poll.anonymous && <Badge>Anonymous</Badge>}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {poll.options.map((o, i) => {
          const mine = poll.myVote === i;
          return showResults ? (
            <div key={i} className={cn('relative overflow-hidden rounded-lg border px-3 py-2 text-sm', mine ? 'border-brand-300' : 'border-slate-200')}>
              <div className="absolute inset-y-0 left-0 bg-brand-50" style={{ width: `${o.percent}%` }} />
              <div className="relative flex justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-800">{mine && <CheckCircle2 className="size-4 text-brand-600" />}{o.text}</span>
                <span className="text-slate-500">{o.percent}% · {o.votes}</span>
              </div>
            </div>
          ) : null;
        })}
        {!showResults &&
          poll.options.map((o, i) => (
            <button key={i} type="button" disabled={vote.isPending} onClick={() => vote.mutate({ id: poll._id, optionIndex: i })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:border-brand-400 hover:bg-brand-50">
              {o.text}
            </button>
          ))}
        {manager && poll.status === 'open' && !voted && (
          <div className="flex flex-wrap gap-2 pt-1">
            {poll.options.map((o, i) => <Button key={i} size="sm" variant="secondary" onClick={() => vote.mutate({ id: poll._id, optionIndex: i })}>Vote “{o.text}”</Button>)}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'} · by {poll.createdBy?.name} · {poll.closesAt ? `closes ${dateTime(poll.closesAt)}` : 'no end date'}</span>
        {manager && (
          <div className="flex gap-2">
            {!poll.anonymous && <Button size="sm" variant="ghost" onClick={() => onVoters(poll)}>See votes</Button>}
            {poll.status === 'open' && <Button size="sm" variant="ghost" onClick={() => window.confirm('Close this poll?') && close.mutate(poll._id)}>Close poll</Button>}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PollsPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [voters, setVoters] = useState(null);
  const { data, isLoading } = usePolls({ status: status || undefined, page });
  return (
    <div>
      <PageHeader title="Polls" description="Tap an option to vote. One vote per flat." actions={manager && <Button icon={Plus} onClick={() => setCreating(true)}>New poll</Button>} />
      <Tabs className="mb-4 w-fit" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: '', label: 'All' }]} />
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <Card><EmptyState icon={Vote} title="No polls" /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.data.map((p) => <PollCard key={p._id} poll={p} manager={manager} onVoters={setVoters} />)}
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      {manager && creating && <PollModal open onClose={() => setCreating(false)} />}
      <VotersModal poll={voters} onClose={() => setVoters(null)} />
    </div>
  );
}
