import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, FilterBar, Input, Modal, Pagination, Select, Spinner, Table, Textarea, Card } from '../../../components/ui';
import { date, dateTime, label, money, timeAgo } from '../../../lib/format';
import { PLANS, usePlatformSocieties, usePlatformSociety, useUpdatePlatformSociety } from '../api';
import { FeatureFlagsPanel, SubscriptionPanel } from '../components/SocietyBillingPanels';
import { PlatformPaymentsPanel } from '../../colonyPayments/components/PlatformPaymentsPanel';
import { SocietyMembersPanel } from '../../loginAs/components/SocietyMembersPanel';
import { PermissionGate } from '../components/PermissionGate';
import { WhatsAppPanel } from '../components/WhatsAppPanel';
import { useCan } from '../useCan';

function SocietyModal({ id, onClose }) {
  const { data: s, isLoading } = usePlatformSociety(id);
  const update = useUpdatePlatformSociety();
  const { startSupportSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [notes, setNotes] = useState(null);
  const can = useCan();
  const canEdit = can('societies.edit');

  if (isLoading || !s) {
    return <Modal open onClose={onClose} title="Society"><div className="flex justify-center py-10"><Spinner /></div></Modal>;
  }
  const currentPlan = plan ?? { name: s.plan?.name || 'free', unitLimit: s.plan?.unitLimit ?? '', validUntil: s.plan?.validUntil ? s.plan.validUntil.slice(0, 10) : '' };

  const savePlan = () =>
    update.mutate({
      id,
      plan: { name: currentPlan.name, unitLimit: currentPlan.unitLimit === '' ? null : Number(currentPlan.unitLimit), validUntil: currentPlan.validUntil ? new Date(currentPlan.validUntil).toISOString() : null },
      ...(notes !== null ? { platformNotes: notes } : {}),
    });

  return (
    <Modal open onClose={onClose} size="lg" title={s.name} description={`${[s.city, s.state].filter(Boolean).join(', ') || 'No address'} · code ${s.code} · since ${date(s.createdAt)}`}
      footer={s.active ? (
        (can('support.access') || can('societies.suspend')) && <>
          {can('support.access') && <Button variant="secondary" onClick={async () => {
            // Audited, 1-hour admin access; the society's admins are notified.
            const reason = window.prompt('Why do you need support access? (visible to the society admins)');
            if (reason === null) return;
            try {
              await startSupportSession(id, reason || undefined);
              navigate('/');
            } catch (err) {
              toast.error(err);
            }
          }}>Open support session</Button>}
          {can('societies.suspend') && <Button variant="danger" loading={update.isPending} onClick={() => { const reason = window.prompt('Reason for suspending (shown to the society)?'); if (reason !== null) update.mutate({ id, active: false, suspendedReason: reason || undefined }); }}>Suspend society</Button>}
        </>
      ) : (
        can('societies.suspend') && <Button variant="success" loading={update.isPending} onClick={() => update.mutate({ id, active: true })}>Reactivate society</Button>
      )}>
      <div className="space-y-5 text-sm">
        {!s.active && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">Suspended{s.suspendedReason ? `: ${s.suspendedReason}` : ''}. Members cannot use the app.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Units</p><p className="text-lg font-semibold">{s.units}</p></div>
          {Object.entries(s.membersByRole).map(([r, n]) => <div key={r} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label(r)}</p><p className="text-lg font-semibold">{n}</p></div>)}
        </div>
        <div>
          <p className="mb-2 font-medium text-slate-700">Admins</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {s.admins.map((a) => <li key={a._id} className="flex justify-between px-3 py-2"><span>{a.name}{a.designation ? ` (${a.designation})` : ''}</span><span className="text-slate-500">{a.email || a.phone} · {a.lastLoginAt ? `seen ${timeAgo(a.lastLoginAt)}` : 'never logged in'}</span></li>)}
          </ul>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Plan" disabled={!canEdit} options={PLANS} value={currentPlan.name} onChange={(e) => setPlan({ ...currentPlan, name: e.target.value, unitLimit: '' })} />
          <Input label="Unit limit" disabled={!canEdit} type="number" min={1} hint="Blank = plan default / unlimited" value={currentPlan.unitLimit ?? ''} onChange={(e) => setPlan({ ...currentPlan, unitLimit: e.target.value })} />
          <Input label={currentPlan.name === 'trial' ? 'Trial ends' : 'Paid until'} disabled={!canEdit} type="date" value={currentPlan.validUntil} onChange={(e) => setPlan({ ...currentPlan, validUntil: e.target.value })} />
          <Textarea className="sm:col-span-3" label="Internal notes" disabled={!canEdit} rows={2} value={notes ?? s.platformNotes ?? ''} onChange={(e) => setNotes(e.target.value)} />
          {canEdit && <div className="sm:col-span-3"><Button loading={update.isPending} onClick={savePlan}>Save plan & notes</Button></div>}
        </div>
        <SubscriptionPanel societyId={id} />
        <PlatformPaymentsPanel societyId={id} />
        <FeatureFlagsPanel societyId={id} />
        {s.active && <SocietyMembersPanel societyId={id} />}
        {can('whatsapp.manage') && <WhatsAppPanel societyId={id} />}
        <div>
          <p className="mb-2 font-medium text-slate-700">Recent activity</p>
          <ul className="space-y-1 text-xs text-slate-500">
            {!s.recentActivity.length && <li>No activity yet</li>}
            {s.recentActivity.map((l) => <li key={l._id}>{dateTime(l.createdAt)} · {l.actor?.name || 'System'} · <span className="font-mono">{l.action}</span></li>)}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

export default function PlatformSocietiesPage() {
  return (
    <PermissionGate permission="societies.view">
      <SocietiesList />
    </PermissionGate>
  );
}

function SocietiesList() {
  const [params] = useSearchParams();
  // The overview's tiles link here with ?plan=trial or ?status=suspended.
  const [filters, setFilters] = useState({ search: '', status: params.get('status') || '', plan: params.get('plan') || '', page: 1 });
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = usePlatformSocieties({ search: filters.search || undefined, status: filters.status || undefined, plan: filters.plan || undefined, page: filters.page });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const expired = (s) => s.plan?.validUntil && new Date(s.plan.validUntil) < new Date();
  const daysLeft = (s) => Math.ceil((new Date(s.plan.validUntil) - Date.now()) / 86400000);
  const until = (s) => {
    if (!s.plan?.validUntil) return <span className="text-slate-400">No end date</span>;
    const d = daysLeft(s);
    const tone = d < 0 ? 'text-red-600 font-medium' : d <= 7 ? 'text-amber-700 font-medium' : '';
    return <span className={tone}>{date(s.plan.validUntil)}{d >= 0 && d <= 30 ? ` · ${d === 0 ? 'today' : `${d} day${d === 1 ? '' : 's'} left`}` : ''}</span>;
  };

  return (
    <div>
      <PageHeader title="Societies" description="Plans, limits and account status for every society." />
      <Card>
        <FilterBar cols={3} active={[filters.status, filters.plan].filter(Boolean).length}
          search={<Input aria-label="Search societies" placeholder="Search name, city or code" value={filters.search} onChange={set('search')} />}>
          <Select aria-label="Status" placeholder="Any status" value={filters.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
          <Select aria-label="Plan" placeholder="Any plan" value={filters.plan} onChange={set('plan')} options={PLANS} />
        </FilterBar>
        <Table loading={isLoading} rows={data?.data} empty="No societies" onRowClick={(s) => setOpenId(s._id)}
          columns={[
            { key: 'name', header: 'Society', render: (s) => <div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.city || '—'} · {s.code}</p></div> },
            { key: 'plan', header: 'Plan', render: (s) => <div className="flex gap-1"><Badge tone="brand">{label(s.plan?.name || 'free')}</Badge>{expired(s) && <Badge tone="red">{s.plan?.name === 'trial' ? 'Trial over' : 'Expired'}</Badge>}</div> },
            { key: 'validUntil', header: 'Trial ends / paid until', mobileLabel: 'Ends', render: until },
            { key: 'active', header: 'Status', render: (s) => (s.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>) },
            { key: 'units', header: 'Units', render: (s) => `${s.units}${s.plan?.unitLimit ? ` / ${s.plan.unitLimit}` : ''}` },
            { key: 'members', header: 'Members', mobile: false },
            { key: 'collectedThisMonth', header: 'Society collections (month)', mobile: false, render: (s) => money(s.collectedThisMonth) },
            { key: 'lastActivityAt', header: 'Last activity', mobile: false, render: (s) => (s.lastActivityAt ? timeAgo(s.lastActivityAt) : '—') },
            { key: 'open', header: '', className: 'w-8 text-right', mobile: false, render: () => <ChevronRight className="ml-auto size-4 text-slate-400" aria-hidden="true" /> },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {openId && <SocietyModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
