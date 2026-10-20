import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Gift, Plus, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Pagination, Spinner, Tabs } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useT } from '../../../context/LanguageContext';
import { useGovernance } from '../../committee/api';
import { useEnterDraw, useLuckyDraws, useWithdrawEntry } from '../api';
import { DrawFormModal } from '../components/DrawFormModal';
import { ParticipateButton } from '../components/ParticipateButton';
import { PHASE, prizeSummary, timingText } from '../lib';

// Re-render every 30 s so "closes in …" stays current.
export function useTick(ms = 30000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export function PhaseBadge({ phase }) {
  const { t } = useT();
  const [tone, text] = PHASE[phase] || PHASE.draft;
  return <Badge tone={tone}>{t(text)}</Badge>;
}

function DrawCard({ d }) {
  const navigate = useNavigate();
  const { t } = useT();
  const enter = useEnterDraw();
  const withdraw = useWithdrawEntry();
  const won = d.myWins?.length > 0;
  return (
    <Card className={cn('flex cursor-pointer flex-col overflow-hidden transition hover:border-brand-200', won && 'border-amber-300 ring-1 ring-amber-200')} onClick={() => navigate(`/lucky-draws/${d._id}`)}>
      {d.coverImage?.url ? (
        <img src={d.coverImage.url} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-20 items-center justify-center bg-gradient-to-r from-brand-50 to-amber-50 text-brand-600"><Gift className="size-8" /></div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="min-w-0 break-words font-semibold text-slate-900">{d.title}</h3>
          <PhaseBadge phase={d.phase} />
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">{prizeSummary(d.prizes)}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{timingText(d, undefined, t)}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{d.entrantCount === 1 ? t('{n} entrant', { n: d.entrantCount }) : t('{n} entrants', { n: d.entrantCount })}</span>
          <span className="inline-flex items-center gap-1"><Gift className="size-3.5" />{d.totalPrizes === 1 ? t('{n} prize', { n: d.totalPrizes }) : t('{n} prizes', { n: d.totalPrizes })}</span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
          <ParticipateButton draw={d} onEnter={(id) => enter.mutate(id)} onWithdraw={(id) => withdraw.mutate(id)} entering={enter.isPending} withdrawing={withdraw.isPending} />
        </div>
      </div>
    </Card>
  );
}

function DrawList({ when, canManage }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLuckyDraws({ when, page });
  useTick();
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data?.data.length) {
    return (
      <Card>
        <EmptyState
          icon={Gift}
          title={when === 'past' ? 'No past draws yet' : 'No lucky draws right now'}
          description={when === 'past' ? 'Finished draws and their winners show up here.' : canManage ? 'Create a free draw for festivals or society events.' : 'When the committee starts a draw you can join it here for free.'}
        />
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.data.map((d) => <DrawCard key={d._id} d={d} />)}</div>
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}

export default function LuckyDrawsPage() {
  const navigate = useNavigate();
  const { data: access } = useGovernance();
  const canManage = Boolean(access?.canManage);
  const [tab, setTab] = useState('active');
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <PageHeader title="Lucky draws" description="Free draws run by the society. Join in one tap." actions={canManage && <Button icon={Plus} onClick={() => setCreating(true)}>New draw</Button>} />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'active', label: 'Open & upcoming' }, { value: 'past', label: 'Past draws' }]} />
      <DrawList key={tab} when={tab} canManage={canManage} />
      {creating && <DrawFormModal onClose={() => setCreating(false)} onSaved={(d) => navigate(`/lucky-draws/${d._id}`)} />}
    </div>
  );
}
