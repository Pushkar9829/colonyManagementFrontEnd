import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api/client';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, ScrollText, ShieldCheck, UserPlus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Input, Modal, PageLoader, Select, Textarea } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../lib/cn';
import { dateTime } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import {
  useCandidates, useCastVote, useElection, useNominate, useNominations, usePublish, useResolveTie, useRespondNomination, useResults,
  useScrutiny, useTransition, useTurnout, useVoteCode, useWithdrawNomination, verifyTracker,
} from '../api';
import { ELIGIBILITY, ElectionStatus, NOMINATION_LABEL } from '../components';
import { errorText } from '../../../lib/errorText';

const NEXT_ACTION = {
  draft: [['open-nominations', 'Open nominations']],
  nominations: [['close-nominations', 'Close nominations']],
  scrutiny: [['open-voting', 'Open voting']],
  voting: [['close', 'Close voting & count']],
};

function NominateModal({ election, open, onClose }) {
  const { data: candidates = [] } = useCandidates(election._id, open);
  const [position, setPosition] = useState(election.positions[0]?._id || '');
  const [candidate, setCandidate] = useState('');
  const [statement, setStatement] = useState('');
  const nominate = useNominate({ onSuccess: () => { setStatement(''); setCandidate(''); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="File a nomination" description="Nominate yourself, or another eligible member who must then accept."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={nominate.isPending} onClick={() => nominate.mutate({ id: election._id, position, candidate: candidate || undefined, statement: statement || undefined })}>Submit</Button></>}>
      <div className="space-y-4">
        <Select label="Position" options={election.positions.map((p) => ({ value: p._id, label: p.title }))} value={position} onChange={(e) => setPosition(e.target.value)} />
        <Select label="Candidate" placeholder="Myself" options={candidates.filter((c) => !c.isMe).map((c) => ({ value: c._id, label: `${c.name}${c.unitLabel ? ` (${c.unitLabel})` : ''}` }))} value={candidate} onChange={(e) => setCandidate(e.target.value)} />
        <Textarea label="Statement (optional)" rows={3} placeholder="Why this candidate?" value={statement} onChange={(e) => setStatement(e.target.value)} />
      </div>
    </Modal>
  );
}

function Nominations({ election, nominations }) {
  const respond = useRespondNomination();
  const withdraw = useWithdrawNomination();
  const scrutiny = useScrutiny();
  const { t } = useT();
  const officer = election.isOfficer;
  const canScrutinise = officer && ['nominations', 'scrutiny'].includes(election.status);
  const canWithdraw = ['nominations', 'scrutiny'].includes(election.status);
  return election.positions.map((pos) => {
    const list = nominations.filter((n) => n.position === pos._id);
    return (
      <Card key={pos._id}>
        <CardHeader title={pos.title} subtitle={t(pos.seats > 1 ? '{n} seats' : '{n} seat', { n: pos.seats })} />
        {list.length ? (
          <ul className="divide-y divide-slate-100">
            {list.map((n) => (
              <li key={n._id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{n.candidateName} {n.unitLabel && <span className="text-sm font-normal text-slate-500">· {n.unitLabel}</span>}</p>
                  {n.statement && <p className="mt-0.5 text-sm text-slate-600">{n.statement}</p>}
                  <p className="mt-1 text-xs text-slate-500">{t('Proposed by {name}', { name: n.nominatedByName || '—' })}{n.scrutinyNote ? ` · ${t('Officer: {note}', { note: n.scrutinyNote })}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={n.status === 'approved' ? 'green' : ['rejected', 'declined', 'withdrawn'].includes(n.status) ? 'red' : 'amber'}>{t(NOMINATION_LABEL[n.status] || '')}</Badge>
                  {n.isMine && n.status === 'pending_acceptance' && election.status === 'nominations' && (
                    <>
                      <Button size="sm" variant="success" onClick={() => respond.mutate({ id: election._id, nid: n._id, accept: true })}>Accept</Button>
                      <Button size="sm" variant="secondary" onClick={() => respond.mutate({ id: election._id, nid: n._id, accept: false })}>Decline</Button>
                    </>
                  )}
                  {canScrutinise && ['accepted', 'approved', 'rejected'].includes(n.status) && (
                    <>
                      {n.status !== 'approved' && <Button size="sm" variant="success" onClick={() => scrutiny.mutate({ id: election._id, nid: n._id, decision: 'approve' })}>Approve</Button>}
                      {n.status !== 'rejected' && <Button size="sm" variant="danger" onClick={() => { const note = window.prompt(t('Reason for rejection')); if (note?.trim()) scrutiny.mutate({ id: election._id, nid: n._id, decision: 'reject', note }); }}>Reject</Button>}
                    </>
                  )}
                  {canWithdraw && (n.isMine || n.nominatedByMe) && ['pending_acceptance', 'accepted', 'approved'].includes(n.status) && (
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(t('Withdraw this nomination?'))) withdraw.mutate({ id: election._id, nid: n._id }); }}>Withdraw</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No nominations yet" />}
      </Card>
    );
  });
}

function Ballot({ election, nominations }) {
  const toast = useToast();
  const approved = nominations.filter((n) => n.status === 'approved');
  const [picks, setPicks] = useState({});
  const [code, setCode] = useState(null);
  const [entered, setEntered] = useState('');
  const [receipt, setReceipt] = useState(null);
  const requestCode = useVoteCode();
  const cast = useCastVote({ onSuccess: (r) => setReceipt(r) });
  const { t } = useT();

  const toggle = (pos, nid) => {
    const cur = picks[pos._id] || [];
    if (cur.includes(nid)) return setPicks({ ...picks, [pos._id]: cur.filter((x) => x !== nid) });
    if (pos.seats === 1) return setPicks({ ...picks, [pos._id]: [nid] });
    if (cur.length >= pos.seats) return toast.error(t('Choose at most {n} for {position}', { n: pos.seats, position: pos.title }));
    return setPicks({ ...picks, [pos._id]: [...cur, nid] });
  };

  if (receipt) {
    return (
      <Card className="border-emerald-200 p-5">
        <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="size-5" /><p className="font-semibold">{t('Your vote has been recorded')}</p></div>
        <p className="mt-2 text-sm text-slate-600">{t('Your ballot is stored without your name. Keep this tracker code to check later that your ballot was counted — it is shown only once.')}</p>
        <p className="mt-3 inline-block rounded-lg bg-slate-100 px-4 py-2 font-mono text-lg font-semibold tracking-widest text-slate-900">{receipt.tracker}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Your ballot" subtitle="Secret ballot · one vote per flat" action={<Lock className="size-5 text-slate-400" />} />
      <div className="space-y-5 p-5">
        {election.positions.map((pos) => (
          <div key={pos._id}>
            <p className="mb-2 text-sm font-semibold text-slate-800">{pos.title} <span className="font-normal text-slate-500">{t('— choose up to {n}', { n: pos.seats })}</span></p>
            <div className="grid gap-2 sm:grid-cols-2">
              {approved.filter((n) => n.position === pos._id).map((n) => {
                const on = (picks[pos._id] || []).includes(n._id);
                return (
                  <button key={n._id} type="button" onClick={() => toggle(pos, n._id)}
                    className={cn('rounded-lg border px-3 py-2.5 text-left text-sm transition', on ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300')}>
                    <p className="font-medium text-slate-900">{n.candidateName}</p>
                    {n.unitLabel && <p className="text-xs text-slate-500">{n.unitLabel}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!code ? (
          <Button icon={KeyRound} loading={requestCode.isPending} onClick={() => requestCode.mutate(election._id, { onSuccess: (r) => setCode(r) })}>Continue to confirm</Button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">{t('To confirm it is you, type this code below:')}</p>
            <p className="my-2 font-mono text-2xl font-bold tracking-[0.4em] text-slate-900">{code.code}</p>
            <div className="flex flex-wrap gap-2">
              <Input className="w-40" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={entered} onChange={(e) => setEntered(e.target.value.replace(/\D/g, ''))} />
              <Button icon={ShieldCheck} loading={cast.isPending} disabled={entered.length !== 6}
                onClick={() => cast.mutate({ id: election._id, code: entered, selections: election.positions.map((p) => ({ position: p._id, nominations: picks[p._id] || [] })) })}>
                Cast vote
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t('The code expires at {when}. Once cast, a vote cannot be changed.', { when: dateTime(code.expiresAt) })}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function Results({ election }) {
  const { data, isLoading, error } = useResults(election._id, true);
  const [tieFor, setTieFor] = useState(null);
  const [winner, setWinner] = useState('');
  const [note, setNote] = useState('');
  const { t } = useT();
  const resolve = useResolveTie({ onSuccess: () => { setTieFor(null); setNote(''); setWinner(''); } });
  if (isLoading) return <PageLoader />;
  if (error) return <Card className="p-5 text-sm text-slate-600">{errorText(error, t)}</Card>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t('Votes cast:')} <b>{data.votesCast}</b>{data.eligible ? ` ${t('of {eligible} eligible ({pct}% turnout)', { eligible: data.eligible, pct: Math.round((data.votesCast / data.eligible) * 100) })}` : ''}</p>
      {data.results.map((r) => {
        const max = Math.max(1, ...r.candidates.map((c) => c.votes));
        return (
          <Card key={r.position}>
            <CardHeader title={r.title} subtitle={t(r.unopposed ? '{seats} seat(s) · elected unopposed · {ballots} ballot(s)' : '{seats} seat(s) · {ballots} ballot(s)', { seats: r.seats, ballots: r.ballots })} action={r.tie && !r.tieResolution && election.isOfficer && election.status === 'closed' && <Button size="sm" onClick={() => setTieFor(r)}>Resolve tie</Button>} />
            <div className="space-y-3 p-5">
              {r.candidates.map((c) => (
                <div key={c.nomination}>
                  <div className="flex justify-between text-sm"><span className={cn('font-medium', c.elected ? 'text-emerald-700' : 'text-slate-800')}>{c.name}{c.unitLabel ? ` · ${c.unitLabel}` : ''}{c.elected && ` ✓ ${t('elected')}`}</span><span className="text-slate-600">{c.votes}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100"><div className={cn('h-2 rounded-full', c.elected ? 'bg-emerald-500' : 'bg-slate-400')} style={{ width: `${(c.votes / max) * 100}%` }} /></div>
                </div>
              ))}
              {r.tie && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{r.tieResolution ? t('Tie resolved: {result}', { result: r.tieResolution }) : r.tieNote}</p>}
            </div>
          </Card>
        );
      })}
      <Modal open={Boolean(tieFor)} onClose={() => setTieFor(null)} title={t('Resolve tie — {position}', { position: tieFor?.title })} description="Record the outcome of the draw of lots / re-poll as per bye-laws."
        footer={<><Button variant="secondary" onClick={() => setTieFor(null)}>Cancel</Button><Button loading={resolve.isPending} disabled={!winner || note.trim().length < 5} onClick={() => resolve.mutate({ id: election._id, position: tieFor.position, winners: [winner], note })}>Record</Button></>}>
        <div className="space-y-4">
          <Select label="Winner" placeholder="Choose" options={(tieFor?.candidates || []).filter((c) => tieFor.tiedCandidates.includes(c.nomination)).map((c) => ({ value: c.nomination, label: c.name }))} value={winner} onChange={(e) => setWinner(e.target.value)} />
          <Textarea label="How it was decided" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Draw of lots held at the AGM on ..." />
        </div>
      </Modal>
    </div>
  );
}

function Verify({ id }) {
  const toast = useToast();
  const [tracker, setTracker] = useState('');
  const [result, setResult] = useState(null);
  const { t } = useT();
  const check = async () => {
    try {
      setResult((await verifyTracker(id, tracker)).found);
    } catch (err) {
      toast.error(err);
    }
  };
  return (
    <Card className="p-5">
      <p className="mb-2 text-sm font-medium text-slate-800">{t('Check your ballot was counted')}</p>
      <div className="flex flex-wrap gap-2">
        <Input className="w-48" placeholder="Tracker code" value={tracker} onChange={(e) => { setTracker(e.target.value.toUpperCase()); setResult(null); }} />
        <Button variant="secondary" disabled={tracker.length < 6} onClick={check}>Verify</Button>
      </div>
      {result !== null && <p className={cn('mt-2 text-sm', result ? 'text-emerald-700' : 'text-red-600')}>{result ? t('Your ballot is in the count.') : t('No ballot matches this tracker.')}</p>}
    </Card>
  );
}

function OfficerPanel({ election }) {
  const { t } = useT();
  const { data: turnout } = useTurnout(election._id, election.isOfficer && ['voting', 'closed', 'published'].includes(election.status));
  return (
    <div className="space-y-4">
      {turnout && (
        <Card>
          <CardHeader title="Turnout" subtitle={t('{cast} of {eligible} voted · who voted, never how', { cast: turnout.votesCast, eligible: turnout.eligible })} />
          <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
            {turnout.voters.map((v, i) => <li key={`${v.unitLabel}-${i}`} className="flex justify-between px-5 py-2"><span>{v.unitLabel || '—'} · {v.name}</span><span className="text-slate-500">{dateTime(v.castAt)}</span></li>)}
          </ul>
        </Card>
      )}
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><ScrollText className="size-4" />{t('Audit trail')}</span>} />
        <ul className="divide-y divide-slate-100 text-sm">
          {[...(election.audit || [])].reverse().map((a, i) => <li key={`${a.at}-${i}`} className="px-5 py-2"><span className="font-medium text-slate-800">{a.action}</span>{a.note && <span className="text-slate-600"> — {a.note}</span>}<span className="block text-xs text-slate-500">{dateTime(a.at)}</span></li>)}
        </ul>
      </Card>
    </div>
  );
}

// Turns the published winners into an upcoming committee term; the admin activates it on the Committee page.
function SeatCommitteeModal({ election, onClose }) {
  const navigate = useNavigate();
  const { t } = useT();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ name: `Managing Committee ${year}-${year + 5}`, startDate: new Date().toLocaleDateString('en-CA'), endDate: `${year + 5}-03-31` });
  const seat = useApiMutation((b) => api.post('/committee/terms/from-election', b), {
    invalidate: ['committee'],
    success: (r) => (r.skipped?.length ? t('Committee created; {n} post(s) need attention', { n: r.skipped.length }) : 'Committee created — review and activate it'),
    onSuccess: () => navigate('/committee'),
  });
  const f = (k) => ({ value: form[k], onChange: (ev) => setForm({ ...form, [k]: ev.target.value }) });
  return (
    <Modal open onClose={onClose} title="Seat the elected committee" description="Creates an upcoming committee with the winners in their posts. Activate it on the Committee page when the term starts."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={seat.isPending} onClick={() => seat.mutate({ election: election._id, ...form })}>Create committee</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Committee name" {...f('name')} />
        <Input label="Term starts" type="date" {...f('startDate')} />
        <Input label="Term ends" type="date" {...f('endDate')} />
      </div>
    </Modal>
  );
}

export default function ElectionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: e, isLoading, error, refetch } = useElection(id);
  const { data: nominations = [] } = useNominations(e ? id : null);
  const transition = useTransition();
  const publish = usePublish();
  const [nominating, setNominating] = useState(false);
  const [seating, setSeating] = useState(false);
  const { t } = useT();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const resultsVisible = e.status === 'published' || (e.status === 'closed' && e.isOfficer);
  const canNominate = e.status === 'nominations' && e.nominationWindow === 'open' && user.role === ROLES.RESIDENT;
  const canVote = e.status === 'voting' && e.votingWindow === 'open' && e.me.eligible && !e.me.hasVoted;

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/elections" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('All elections')}</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-slate-500">{e.number}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{e.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ElectionStatus status={e.status} /><Badge>{t(ELIGIBILITY.find((x) => x.value === e.eligibility)?.label || '')}</Badge></div>
          <div className="mt-2 grid gap-x-6 text-xs text-slate-500 sm:grid-cols-2">
            {(e.nominationStart || e.nominationEnd) && <span>{t('Nominations: {from} → {to}', { from: e.nominationStart ? dateTime(e.nominationStart) : '—', to: e.nominationEnd ? dateTime(e.nominationEnd) : '—' })}</span>}
            {(e.votingStart || e.votingEnd) && <span>{t('Voting: {from} → {to}', { from: e.votingStart ? dateTime(e.votingStart) : '—', to: e.votingEnd ? dateTime(e.votingEnd) : '—' })}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canNominate && <Button icon={UserPlus} onClick={() => setNominating(true)}>Nominate</Button>}
          {e.isOfficer && (NEXT_ACTION[e.status] || []).map(([action, text]) => (
            <Button key={action} variant="secondary" loading={transition.isPending} onClick={() => { if (window.confirm(t('{action}?', { action: t(text) }))) transition.mutate({ id: e._id, action }); }}>{text}</Button>
          ))}
          {e.status === 'published' && user.role === ROLES.ADMIN && <Button icon={ShieldCheck} onClick={() => setSeating(true)}>Seat elected committee</Button>}
          {e.isOfficer && e.status === 'closed' && <Button loading={publish.isPending} onClick={() => { if (window.confirm(t('Publish the results to all members as a notice?'))) publish.mutate(e._id); }}>Publish results</Button>}
          {e.isOfficer && !['closed', 'published', 'cancelled'].includes(e.status) && (
            <Button variant="ghost" onClick={() => { const note = window.prompt(t('Reason for cancelling the election')); if (note?.trim()) transition.mutate({ id: e._id, action: 'cancel', note }); }}>Cancel</Button>
          )}
        </div>
      </div>
      {e.description && <Card className="mb-6 whitespace-pre-line p-4 text-sm text-slate-700">{e.description}</Card>}
      {e.turnout && e.status === 'voting' && <Card className="mb-6 p-4 text-sm text-slate-700">{t('Votes cast so far:')} <b>{e.turnout.votesCast}</b>{e.turnout.eligible ? ` ${t('of {n}', { n: e.turnout.eligible })}` : ''}. {t('Tallies stay sealed until voting closes.')}</Card>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canVote && <Ballot election={e} nominations={nominations} />}
          {e.status === 'voting' && e.me.hasVoted && <Card className="flex items-center gap-2 border-emerald-200 p-4 text-sm text-emerald-700"><CheckCircle2 className="size-5" />{e.eligibility === 'member' ? t('A vote has been cast by you.') : t('A vote has been cast for your flat.')}</Card>}
          {e.status === 'voting' && !e.me.eligible && <Card className="p-4 text-sm text-slate-600">{e.me.reason}</Card>}
          {resultsVisible ? <Results election={e} /> : <Nominations election={e} nominations={nominations} />}
          {e.status === 'closed' && !e.isOfficer && <Card className="p-4 text-sm text-slate-600">{t('Voting has closed. Results will appear once the election officer publishes them.')}</Card>}
        </div>
        <div className="space-y-6">
          {['voting', 'closed', 'published'].includes(e.status) && user.role === ROLES.RESIDENT && <Verify id={e._id} />}
          {e.isOfficer && <OfficerPanel election={e} />}
        </div>
      </div>
      {canNominate && <NominateModal election={e} open={nominating} onClose={() => setNominating(false)} />}
      {seating && <SeatCommitteeModal election={e} onClose={() => setSeating(false)} />}
    </div>
  );
}
