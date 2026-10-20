import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Dices, Gift, Lock, Pencil, PackageCheck, Send, ShieldCheck, Trophy, UserRoundPlus, Users } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ErrorState, FilterBar, Input, Modal, PageLoader, Pagination, Select, StatCard, Table, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useT } from '../../../context/LanguageContext';
import { date, dateTime, todayISO } from '../../../lib/format';
import { useCancelDraw, useCloseDraw, useDrawEntries, useEnterDraw, useHandover, useLuckyDraw, usePromoteReserve, usePublishDraw, useRunDraw, useVerifyDraw, useWithdrawEntry } from '../api';
import { ConfirmModal } from '../components/ConfirmModal';
import { DrawFormModal } from '../components/DrawFormModal';
import { ParticipateButton } from '../components/ParticipateButton';
import { eligibilityText, timingText } from '../lib';
import { PhaseBadge, useTick } from './LuckyDrawsPage';

const short = (h) => (h ? `${h.slice(0, 12)}…${h.slice(-6)}` : '—');
const Code = ({ children }) => <code className="block break-all rounded-md bg-slate-100 px-2 py-1.5 font-mono text-xs text-slate-700">{children}</code>;

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------- admin actions ----------------

function ManagerActions({ d, onEdit }) {
  const { t } = useT();
  const [confirm, setConfirm] = useState(null);
  const close = () => setConfirm(null);
  const publish = usePublishDraw({ onSuccess: close });
  const closeEntries = useCloseDraw({ onSuccess: close });
  const run = useRunDraw({ onSuccess: close });
  const cancel = useCancelDraw({ onSuccess: close });
  const early = d.phase === 'open' || d.phase === 'upcoming';
  const dialogs = {
    publish: { title: 'Publish this draw?', message: t("Eligible members will be notified. The sealed fairness code is fixed now, and prizes, dates and rules can't change after publishing."), confirmLabel: 'Publish', run: () => publish.mutate(d._id), loading: publish.isPending },
    close: { title: 'Close entries now?', message: t("Entries are due to close {date}. Closing early stops anyone else from joining. This can't be undone.", { date: dateTime(d.entryClosesAt) }), confirmLabel: 'Close entries', variant: 'danger', run: () => closeEntries.mutate(d._id), loading: closeEntries.isPending },
    run: { title: 'Run the draw now?', message: t("{entrants} entrant(s) for {prizes} prize(s). Winners are picked by the fair method below and notified straight away. This can't be undone.", { entrants: d.entrantCount, prizes: d.totalPrizes }), confirmLabel: 'Run draw', run: () => run.mutate(d._id), loading: run.isPending },
    cancel: { title: 'Cancel this draw?', message: 'Everyone who entered will be told. This cannot be undone.', confirmLabel: 'Cancel draw', variant: 'danger', reasonLabel: 'Reason (shown to entrants)', run: (reason) => cancel.mutate({ id: d._id, reason }), loading: cancel.isPending },
  };
  const c = confirm && dialogs[confirm];
  return (
    <div className="flex flex-wrap gap-2">
      {['draft', 'open', 'upcoming'].includes(d.phase) && <Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit</Button>}
      {d.status === 'draft' && <Button icon={Send} onClick={() => setConfirm('publish')}>Publish</Button>}
      {d.status === 'open' && early && <Button variant="secondary" icon={Lock} onClick={() => setConfirm('close')}>Close entries early</Button>}
      {d.status === 'open' && !early && <Button variant="secondary" icon={Lock} onClick={() => setConfirm('close')}>Close entries</Button>}
      {d.status === 'closed' && <Button icon={Dices} onClick={() => setConfirm('run')}>Run draw now</Button>}
      {['draft', 'open', 'closed'].includes(d.status) && <Button variant="ghost" icon={Ban} onClick={() => setConfirm('cancel')}>Cancel draw</Button>}
      {c && <ConfirmModal {...c} onConfirm={c.run} onClose={close} />}
    </div>
  );
}

function HandoverModal({ d, winner, onClose }) {
  const { t } = useT();
  const [v, setV] = useState({ on: todayISO(), note: '' });
  const m = useHandover({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Hand over: {prize}', { prize: winner.prizeTitle })} description={`${winner.name}${winner.unitLabel ? ` · ${winner.unitLabel}` : ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Back</Button><Button variant="success" icon={PackageCheck} loading={m.isPending} onClick={() => m.mutate({ id: d._id, winnerId: winner._id, handedOverAt: new Date(`${v.on}T12:00:00`).toISOString(), note: v.note || undefined })}>Mark handed over</Button></>}>
      <div className="space-y-3">
        <Input label="Handed over on" type="date" max={todayISO()} value={v.on} onChange={(e) => setV({ ...v, on: e.target.value })} />
        <Textarea label="Note (optional)" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="Collected at the society office" />
      </div>
    </Modal>
  );
}

// ---------------- results ----------------

function Results({ d }) {
  const { t } = useT();
  const [handover, setHandover] = useState(null);
  const [promote, setPromote] = useState(null);
  const promoteM = usePromoteReserve({ onSuccess: () => setPromote(null) });
  const reservesLeft = (d.reservesList || []).filter((r) => !r.usedFor).length;
  if (d.noEntrants) {
    return <Card className="p-5 text-sm text-slate-600">{t('Nobody entered this draw, so there are no winners.')}</Card>;
  }
  return (
    <Card>
      <CardHeader title="Winners" subtitle={`${t('Drawn {date}', { date: dateTime(d.drawnAt) })}${d.drawnBy?.name ? ` · ${d.drawnBy.name}` : ''}`} />
      <div className="divide-y divide-slate-100">
        {d.results.map((r) => (
          <div key={r.prize} className="px-5 py-4">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-slate-900"><Trophy className="size-4 text-amber-500" />{r.title}</p>
            {!r.winners.length && <p className="text-sm text-slate-500">{t('Not enough entrants for this prize.')}</p>}
            <ul className="space-y-2">
              {r.winners.map((w) => {
                const replaced = w.status === 'replaced';
                return (
                  <li key={w._id} className={cn('flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm', w.isMe ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-slate-50')}>
                    <div className="min-w-0">
                      <span className={cn('font-medium text-slate-800', replaced && 'text-slate-400 line-through')}>{w.name}</span>
                      {w.unitLabel && <span className="text-slate-500"> · {w.unitLabel}</span>}
                      {w.isMe && <Badge tone="amber" className="ml-2">{t('You won!')}</Badge>}
                      {w.promotedFrom && <Badge tone="blue" className="ml-2">{t('From reserves')}</Badge>}
                      {replaced && <p className="text-xs text-slate-500">{t('Replaced {date}: {reason}', { date: date(w.replacedAt), reason: w.replacedReason || '' })}</p>}
                      {w.handedOverAt && <p className="text-xs text-emerald-700">{t('Handed over {date}', { date: date(w.handedOverAt) })}{w.handoverNote ? ` · ${w.handoverNote}` : ''}</p>}
                    </div>
                    {d.canManage && !replaced && !w.handedOverAt && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" icon={PackageCheck} onClick={() => setHandover({ ...w, prizeTitle: r.title })}>Mark handed over</Button>
                        <Button size="sm" variant="ghost" icon={UserRoundPlus} disabled={!reservesLeft} title={reservesLeft ? undefined : t('No reserves left')} onClick={() => setPromote({ ...w, prizeTitle: r.title })}>Promote reserve</Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {d.canManage && d.reservesList?.length > 0 && (
          <div className="px-5 py-4 text-sm">
            <p className="mb-2 font-medium text-slate-700">{t('Reserves (in order)')}</p>
            <ol className="list-decimal space-y-1 pl-5 text-slate-600">
              {d.reservesList.map((r) => <li key={r._id} className={cn(r.usedFor && 'text-slate-400')}>{r.name}{r.unitLabel ? ` · ${r.unitLabel}` : ''}{r.usedFor ? ` — ${t('promoted')}` : ''}</li>)}
            </ol>
          </div>
        )}
      </div>
      {handover && <HandoverModal d={d} winner={handover} onClose={() => setHandover(null)} />}
      {promote && (
        <ConfirmModal title={t('Promote next reserve for {prize}?', { prize: promote.prizeTitle })} message={t('{name} will lose this prize and the next person on the reserve list will be told they won.', { name: promote.name })}
          confirmLabel="Promote reserve" reasonLabel="Why can't the winner receive it?" loading={promoteM.isPending}
          onConfirm={(reason) => promoteM.mutate({ id: d._id, winnerId: promote._id, reason })} onClose={() => setPromote(null)} />
      )}
    </Card>
  );
}

// ---------------- entrants (managers) ----------------

function Entrants({ d }) {
  const { t } = useT();
  const [f, setF] = useState({ search: '', status: 'entered', page: 1 });
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
  const { data, isLoading } = useDrawEntries(d._id, params, true);
  const columns = [
    { key: 'name', header: 'Name', render: (e) => e.name || t('Member') },
    { key: 'unitLabel', header: 'Flat', render: (e) => e.unitLabel || '—' },
    { key: 'createdAt', header: 'Entered', render: (e) => dateTime(e.createdAt) },
    { key: 'status', header: 'Status', render: (e) => <Badge tone={e.status === 'entered' ? 'green' : 'slate'}>{e.status === 'entered' ? t('Entered') : t('Withdrawn')}</Badge> },
    { key: '_id', header: 'Entry id', mobile: false, render: (e) => <span className="font-mono text-xs text-slate-500">{e._id}</span> },
  ];
  return (
    <Card>
      <CardHeader title="Entrants" subtitle={t('{n} active', { n: d.entrantCount })} />
      <FilterBar active={f.status !== 'entered' ? 1 : 0} cols={3}
        search={<Input aria-label="Search entrants" placeholder="Search name or flat" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} />}>
        <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[{ value: 'entered', label: 'Entered' }, { value: 'withdrawn', label: 'Withdrawn' }, { value: '', label: 'All' }]} />
      </FilterBar>
      <Table columns={columns} rows={data?.data} loading={isLoading} empty="No entrants yet" emptyHint="Members who join appear here." />
      <Pagination meta={data?.meta} onPage={(page) => setF({ ...f, page })} />
    </Card>
  );
}

// ---------------- fairness ----------------

function Fairness({ d }) {
  const { t } = useT();
  const drawn = d.status === 'drawn';
  const [open, setOpen] = useState(false);
  const { data: v, isLoading } = useVerifyDraw(d._id, open && drawn);
  const [check, setCheck] = useState(null);
  const runCheck = async () => setCheck({ seed: (await sha256Hex(v.seed)) === v.seedHash, entries: (await sha256Hex([...v.entryIds].sort().join('\n'))) === v.entriesHash });
  return (
    <Card>
      <CardHeader title={<span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-emerald-600" />{t('How we keep it fair')}</span>} />
      <div className="space-y-4 px-5 py-4 text-sm text-slate-600">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>{t("When the draw opened, the computer picked a secret random code and showed you only its fingerprint (the sealed code). The secret can't be changed later without the fingerprint changing.")}</li>
          <li>{t('When entries closed, we published a fingerprint of the full entry list, so nobody can be added or removed afterwards.')}</li>
          <li>{d.eligibility?.perFlat ? t("Each entry gets a score made from the secret code and the entry's id (HMAC-SHA256). Lowest score is drawn first. Prizes go in the listed order, one per person (one per flat); the next people become reserves.") : t("Each entry gets a score made from the secret code and the entry's id (HMAC-SHA256). Lowest score is drawn first. Prizes go in the listed order, one per person; the next people become reserves.")}</li>
          <li>{t('After the draw the secret code is revealed. Anyone can check it matches the sealed code and recompute every score.')}</li>
        </ol>
        <div className="space-y-1.5">
          <p className="font-medium text-slate-700">{t('Sealed code (SHA-256 of the secret)')}</p>
          <Code>{d.fairness.seedHash || t('Created when the draw is published')}</Code>
        </div>
        {d.fairness.entriesHash && (
          <div className="space-y-1.5">
            <p className="font-medium text-slate-700">{t('Entry list fingerprint · {n} entries', { n: d.fairness.entryCount })}</p>
            <Code>{d.fairness.entriesHash}</Code>
          </div>
        )}
        {drawn && (
          <div className="space-y-1.5">
            <p className="font-medium text-slate-700">{t('Revealed secret code')}</p>
            <Code>{d.fairness.seed}</Code>
          </div>
        )}
        {d.myEntry && <p className="text-xs text-slate-500">{t('Your entry id:')} <span className="font-mono">{d.myEntry._id}</span></p>}
        {drawn && !open && <Button variant="secondary" icon={CheckCircle2} onClick={() => setOpen(true)}>Verify this draw</Button>}
        {open && (isLoading || !v ? <p>{t('Loading…')}</p> : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={runCheck}>Check in my browser</Button>
              {check && <Badge tone={check.seed && check.entries ? 'green' : 'red'}>{check.seed && check.entries ? t('Secret and entry list match the sealed codes') : t('Mismatch — contact the committee')}</Badge>}
            </div>
            <p className="text-xs text-slate-500">{t('To recompute a score yourself: HMAC-SHA256 with key = revealed secret code and message = entry id. Sort ascending.')}</p>
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">{t('Entry id')}</th><th className="px-3 py-2">{t('Score')}</th><th className="px-3 py-2">{t('Result')}</th></tr></thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {v.order.map((o) => (
                    <tr key={o.entryId} className={cn(o.entryId === d.myEntry?._id && 'bg-amber-50')}>
                      <td className="px-3 py-1.5">{o.rank}</td>
                      <td className="break-all px-3 py-1.5">{o.entryId}</td>
                      <td className="px-3 py-1.5" title={o.score}>{short(o.score)}</td>
                      <td className="px-3 py-1.5 font-sans">{o.outcome === 'Reserve' ? t('Reserve') : o.outcome || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- page ----------------

export default function LuckyDrawDetailPage() {
  const { id } = useParams();
  const { data: d, isLoading, error, refetch } = useLuckyDraw(id);
  const [editing, setEditing] = useState(false);
  const { t } = useT();
  const enter = useEnterDraw();
  const withdraw = useWithdrawEntry();
  useTick();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-4">
      <Link to="/lucky-draws" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('Lucky draws')}</Link>
      {d.coverImage?.url && <img src={d.coverImage.url} alt="" className="h-40 w-full rounded-xl object-cover sm:h-56" />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900">{d.title}</h1>
            <PhaseBadge phase={d.phase} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{d.number} · {t('free to enter')}</p>
        </div>
        {d.canManage && <ManagerActions d={d} onEdit={() => setEditing(true)} />}
      </div>
      {d.status === 'cancelled' && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{d.cancelledReason ? t('Cancelled: {reason}', { reason: d.cancelledReason }) : t('Cancelled')}</Card>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Status" value={timingText(d, undefined, t)} icon={Dices} />
        <StatCard label="Entrants" value={d.entrantCount} icon={Users} tone="sky" />
        <StatCard label="Prizes" value={d.totalPrizes} icon={Gift} tone="amber" />
      </div>

      <ParticipateButton draw={d} onEnter={(x) => enter.mutate(x)} onWithdraw={(x) => withdraw.mutate(x)} entering={enter.isPending} withdrawing={withdraw.isPending} />

      {d.status === 'drawn' && <Results d={d} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Prizes" subtitle="Given in this order" />
          <ul className="divide-y divide-slate-100">
            {d.prizes.map((p, i) => (
              <li key={p._id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{i + 1}. {p.title}</p>
                  {(p.value || p.description) && <p className="text-xs text-slate-500">{[p.value, p.description].filter(Boolean).join(' · ')}</p>}
                </div>
                <Badge tone="brand">× {p.quantity}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Who can join & when" />
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <p>{eligibilityText(d, t)}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-500">{t('Entries open')}</dt><dd>{dateTime(d.entryOpensAt)}</dd>
              <dt className="text-slate-500">{t('Entries close')}</dt><dd>{dateTime(d.entryClosesAt)}</dd>
              <dt className="text-slate-500">{t('Draw')}</dt><dd>{dateTime(d.drawAt)}</dd>
              {d.reserves > 0 && <><dt className="text-slate-500">{t('Reserves')}</dt><dd>{d.reserves}</dd></>}
            </dl>
            {d.description && <p className="whitespace-pre-line">{d.description}</p>}
          </div>
        </Card>
      </div>

      {d.terms && (
        <Card>
          <CardHeader title="Terms" />
          <p className="whitespace-pre-line px-5 py-4 text-sm text-slate-600">{d.terms}</p>
        </Card>
      )}

      {d.canManage && d.status !== 'draft' && <Entrants d={d} />}
      <Fairness d={d} />
      {editing && <DrawFormModal draw={d} onClose={() => setEditing(false)} />}
    </div>
  );
}
