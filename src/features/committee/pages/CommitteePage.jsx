import { useState } from 'react';
import { History, PenLine, Plus, TriangleAlert, UserMinus, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, ErrorState, Input, Modal, PageLoader, Select, StatusBadge, Textarea } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { useForm } from '../../../hooks/useForm';
import { date, label } from '../../../lib/format';
import { useActivateTerm, useAddPosition, useCommitteeTerms, useCreateTerm, useDissolveTerm, useEndPosition, useGovernance, useMemberOptions, useRemovePosition, useUpdatePosition } from '../api';
import { POSITIONS, positionLabel } from '../lib';

function NewTermModal({ open, onClose }) {
  const { values, bind, applyServerErrors, reset } = useForm({ name: '', startDate: '', endDate: '', notes: '' });
  const create = useCreateTerm({ onSuccess: () => { reset(); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Start new committee" description="Add office-bearers, then seat the committee. Seating it replaces the sitting one."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...values, notes: values.notes || undefined }, { onError: applyServerErrors })}>Create</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required placeholder="Managing Committee 2026-2031" {...bind('name')} />
        <Input type="date" label="Term starts" required {...bind('startDate')} />
        <Input type="date" label="Term ends" required {...bind('endDate')} />
        <Textarea className="sm:col-span-2" label="Notes" placeholder="e.g. Elected at the AGM held on ..." {...bind('notes')} />
      </div>
    </Modal>
  );
}

function AddPositionModal({ term, onClose }) {
  const { data: members = [] } = useMemberOptions(Boolean(term));
  const { values, bind, set, applyServerErrors, reset } = useForm({ membership: '', position: 'member', title: '', isSignatory: false });
  const add = useAddPosition({ onSuccess: () => { reset(); onClose(); } });
  const { t } = useT();
  const taken = new Set((term?.positions || []).filter((p) => p.active).map((p) => String(p.user)));
  const options = members.filter((m) => !taken.has(String(m.user))).map((m) => ({ value: m._id, label: `${m.name}${m.unit?.label ? ` (${m.unit.label})` : ''} · ${t(label(m.role))}` }));
  return (
    <Modal open={Boolean(term)} onClose={onClose} title="Add office-bearer" description={term?.name}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={add.isPending} disabled={!values.membership} onClick={() => add.mutate({ id: term._id, ...values, title: values.title || undefined }, { onError: applyServerErrors })}>Add</Button></>}>
      <div className="space-y-4">
        <Select label="Member" placeholder="Choose a member" options={options} {...bind('membership')} />
        <Select label="Position" options={POSITIONS} {...bind('position')} />
        <Input label="Display title (optional)" placeholder="e.g. Joint Secretary (B wing)" {...bind('title')} />
        <Checkbox label="Signs letters, certificates and minutes" checked={values.isSignatory} onChange={(e) => set('isSignatory', e.target.checked)} />
      </div>
    </Modal>
  );
}

function PositionRow({ term, p, admin }) {
  const end = useEndPosition();
  const remove = useRemovePosition();
  const update = useUpdatePosition();
  const { t } = useT();
  const editable = admin && term.status !== 'dissolved' && p.active;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{p.name}{p.unitLabel && <span className="ml-1 text-sm font-normal text-slate-500">· {p.unitLabel}</span>}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{t(positionLabel(p))}</Badge>
          {p.isSignatory && <Badge tone="blue">{t('Can sign')}</Badge>}
          {!p.active && <Badge>{t('Ended {date}', { date: p.to ? date(p.to) : '' })}</Badge>}
          {p.from && <span className="text-xs text-slate-500">{t('since {date}', { date: date(p.from) })}</span>}
        </div>
      </div>
      {editable && (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" icon={PenLine} loading={update.isPending} onClick={() => update.mutate({ id: term._id, positionId: p._id, isSignatory: !p.isSignatory })}>{p.isSignatory ? 'Remove signing rights' : 'Give signing rights'}</Button>
          {term.status === 'upcoming' ? (
            <Button size="sm" variant="ghost" onClick={() => remove.mutate({ id: term._id, positionId: p._id })}>Remove</Button>
          ) : (
            <Button size="sm" variant="ghost" icon={UserMinus} onClick={() => { if (window.confirm(t("End {name}'s term as {position}?", { name: p.name, position: t(positionLabel(p)) }))) end.mutate({ id: term._id, positionId: p._id }); }}>Step down</Button>
          )}
        </div>
      )}
    </li>
  );
}

function TermCard({ term, admin, onAdd }) {
  const activate = useActivateTerm();
  const dissolve = useDissolveTerm();
  const [confirming, setConfirming] = useState(false);
  const { t } = useT();
  const positions = term.positions || [];
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2">{term.name} <StatusBadge status={term.status === 'upcoming' ? 'pending' : term.status === 'dissolved' ? 'closed' : 'active'} /></span>}
        subtitle={`${date(term.startDate)} – ${date(term.endDate)}${term.notes ? ` · ${term.notes}` : ''}`}
        action={admin && term.status !== 'dissolved' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => onAdd(term)}>Add</Button>
            {term.status === 'upcoming' && <Button size="sm" loading={activate.isPending} onClick={() => { if (window.confirm(t('Seat this committee? The current committee will be dissolved.'))) activate.mutate(term._id); }}>Seat committee</Button>}
          </div>
        )}
      />
      {positions.length ? (
        <ul className="divide-y divide-slate-100 px-5">{positions.map((p) => <PositionRow key={p._id} term={term} p={p} admin={admin} />)}</ul>
      ) : (
        <EmptyState icon={Users} title="No office-bearers yet" description={admin ? 'Add the elected or appointed members.' : undefined} />
      )}
      {admin && term.status === 'active' && (
        // Kept apart from everyday buttons: dissolving ends every office-bearer's term at once.
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-100 bg-red-50/40 px-5 py-3">
          <p className="min-w-0 flex-1 basis-56 text-xs text-slate-600"><span className="font-semibold text-red-700">{t('Danger zone')} · </span>{t("Dissolving ends this committee and every office-bearer's term.")}</p>
          <Button size="sm" variant="secondary" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setConfirming(true)}>Dissolve committee…</Button>
        </div>
      )}
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Dissolve this committee?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Keep committee</Button><Button variant="danger" loading={dissolve.isPending} onClick={() => dissolve.mutate(term._id, { onSuccess: () => setConfirming(false) })}>Dissolve</Button></>}>
        <div className="flex gap-3 text-sm text-slate-600">
          <TriangleAlert className="size-5 shrink-0 text-red-600" />
          <p>{t('{name} will end today and all {n} office-bearers will step down. It moves to past committees and cannot be seated again. Start and seat a new committee instead if you are replacing it.', { name: term.name, n: positions.filter((p) => p.active).length })}</p>
        </div>
      </Modal>
    </Card>
  );
}

export default function CommitteePage() {
  const { data: access } = useGovernance();
  const { data: terms, isLoading, error, refetch } = useCommitteeTerms();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(null);
  const admin = Boolean(access?.isAdmin);
  const { t } = useT();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const live = terms.filter((x) => x.status !== 'dissolved');
  const past = terms.filter((x) => x.status === 'dissolved');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Managing Committee"
        description="Office-bearers of the society and the history of past committees."
        actions={admin && <Button icon={Plus} onClick={() => setCreating(true)}>Start new committee</Button>}
      />
      {access?.positions?.length > 0 && (
        <Card className="mb-6 border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-800">
          {t('You serve as {positions} and can manage meetings, registers, documents and requests.', { positions: access.positions.map((p) => t(positionLabel(p))).join(', ') })}
        </Card>
      )}
      <div className="space-y-6">
        {live.length ? live.map((x) => <TermCard key={x._id} term={x} admin={admin} onAdd={setAdding} />) : (
          <Card><EmptyState icon={Users} title="No committee on record" description={admin ? 'Start a new committee and add its office-bearers.' : 'The committee has not been recorded yet.'} /></Card>
        )}
        {past.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><History className="size-4" /> {t('Past committees')}</h2>
            <div className="space-y-4">{past.map((x) => <TermCard key={x._id} term={x} admin={admin} onAdd={setAdding} />)}</div>
          </div>
        )}
      </div>
      <NewTermModal open={creating} onClose={() => setCreating(false)} />
      <AddPositionModal term={adding} onClose={() => setAdding(null)} />
    </div>
  );
}
