import { Link } from 'react-router-dom';
import { AlertTriangle, Ban, Building2, Clock, FileText, Hourglass, IndianRupee, LayoutGrid, TrendingUp, Users, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, StatCard, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { useCan } from '../useCan';
import { dateTime, label, money, timeAgo } from '../../../lib/format';
import { usePlatformJobs, usePlatformSocieties, usePlatformStats } from '../api';
import { useInvoiceSummary, usePlans } from '../billingApi';
import { estimatedMrr, trialsEndingWithin } from '../lib';

// Background job results are small objects ({ sent: 3, skipped: 1 }); show them as words.
const resultText = (r, t) => (r && typeof r === 'object' ? Object.entries(r).map(([k, v]) => `${t(label(k))}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : String(r ?? ''));

function SubscriptionTiles({ stats }) {
  const { t } = useT();
  const { data: sum } = useInvoiceSummary();
  const { data: plans } = usePlans();
  // The list endpoint pages at 100; for a large platform these two tiles cover the first 100 societies.
  const trials = usePlatformSocieties({ plan: 'trial', limit: 100 });
  const active = usePlatformSocieties({ status: 'active', limit: 100 });
  const ending = trialsEndingWithin(trials.data?.data, 7);
  const mrr = plans && active.data ? estimatedMrr(active.data.data, plans) : null;
  const partial = (active.data?.meta?.total || 0) > 100;
  const suspended = stats.societies - stats.activeSocieties;
  const invoices = (n) => (n === 1 ? t('{n} invoice', { n }) : t('{n} invoices', { n }));
  const trialCount = trials.data?.meta?.total || 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard icon={TrendingUp} tone="green" label="Monthly revenue (est.)" value={mrr === null ? '—' : money(mrr)}
        sub={partial ? 'Plan prices × units · first 100 societies' : 'Plan prices × units, before GST'} to="/platform/plans" />
      <StatCard icon={FileText} tone={sum?.overdue.count ? 'red' : 'amber'} label="Unpaid invoices" value={sum ? money(sum.unpaid.total) : '—'}
        sub={sum ? (sum.overdue.count ? t('{invoices} · {n} overdue', { invoices: invoices(sum.unpaid.count), n: sum.overdue.count }) : invoices(sum.unpaid.count)) : undefined} to="/platform/invoices" />
      <StatCard icon={Hourglass} tone={ending.length ? 'amber' : 'slate'} label="Trials ending in 7 days" value={ending.length}
        sub={ending.length ? ending.slice(0, 2).map((s) => s.name).join(', ') + (ending.length > 2 ? '…' : '') : trialCount === 1 ? t('{n} society on trial', { n: trialCount }) : t('{n} societies on trial', { n: trialCount })} to="/platform/societies?plan=trial" />
      <StatCard icon={Ban} tone={suspended ? 'red' : 'slate'} label="Suspended" value={suspended} sub={suspended ? 'Cannot use the app' : 'None'} to="/platform/societies?status=suspended" />
    </div>
  );
}

// Members whose role has no society access still land on "/": tell them where their pages are.
function Welcome() {
  const { user } = useAuth();
  const { t } = useT();
  return (
    <div>
      <PageHeader title="Platform console" description={t('Signed in as {role}. Your role decides which pages appear in the menu.', { role: t(user.platformRoleName || 'platform team') })} />
      <Card><EmptyState icon={LayoutGrid} title="Open a page from the menu" description="Ask a platform owner if you need access to something that is not there." /></Card>
    </div>
  );
}

export default function PlatformOverviewPage() {
  const can = useCan();
  return can('societies.view') ? <Overview can={can} /> : <Welcome />;
}

function Overview({ can }) {
  const { t } = useT();
  const { data: s, isLoading, error, refetch } = usePlatformStats();
  const showJobs = can('jobs.view');
  const { data: jobs = [] } = usePlatformJobs(showJobs);
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const failing = jobs.filter((j) => j.lastError).length;
  return (
    <div className="space-y-8">
      <PageHeader title="Platform overview" description="Subscriptions first, then how the societies on ColonyHub are doing." />

      {can('invoices.view') && can('plans.view') && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('Subscriptions')}</h2>
          <SubscriptionTiles stats={s} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('Societies')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard icon={Building2} label="Societies" value={s.societies} sub={t('{active} active · {n} new in 30 days', { active: s.activeSocieties, n: s.newSocieties30d })} to="/platform/societies" />
          <StatCard icon={Users} tone="sky" label="Active members" value={s.activeMembers} sub={t('{users} accounts · {n} logged in (30d)', { users: s.users, n: s.activeUsers30d })} />
          <StatCard icon={TrendingUp} tone="amber" label="Units managed" value={s.units} />
          <StatCard icon={Wallet} tone="green" label="Society collections (30 days)" value={money(s.collected30d)} sub="Paid by residents to their societies" />
          <StatCard icon={IndianRupee} tone="red" label="Society dues outstanding" value={money(s.outstanding)} sub="Unpaid resident bills" />
          <Card className="flex flex-wrap items-center gap-2 p-4">
            <p className="w-full text-xs font-medium uppercase tracking-wide text-slate-500">{t('Plans')}</p>
            {Object.entries(s.plans).map(([plan, count]) => <Badge key={plan} tone="brand">{t(label(plan))}: {count}</Badge>)}
          </Card>
        </div>
      </section>

      {showJobs && <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('System health')} {failing > 0 && <Badge tone="red"><AlertTriangle className="mr-1 size-3" />{failing === 1 ? t('{n} job failing', { n: failing }) : t('{n} jobs failing', { n: failing })}</Badge>}
        </h2>
        <Card>
          <CardHeader title="Background jobs" subtitle="Reminders, late fees, auto-billing and complaint alerts" action={<Clock className="size-4 text-slate-400" />} />
          <Table rows={jobs} empty="Jobs haven't run yet"
            columns={[
              { key: '_id', header: 'Job', render: (j) => <span title={j._id}>{label(j._id.replace(/[.:-]/g, '_'))}</span> },
              { key: 'lastRunAt', header: 'Last run', render: (j) => (j.lastRunAt ? <span title={dateTime(j.lastRunAt)}>{timeAgo(j.lastRunAt)}</span> : '—') },
              { key: 'lastDurationMs', header: 'Took', mobile: false, render: (j) => (j.lastDurationMs !== undefined ? `${j.lastDurationMs} ms` : '—') },
              { key: 'result', header: 'Result', className: 'max-w-xs truncate', render: (j) => (j.lastError ? <span className="text-red-600">{j.lastError}</span> : <span className="text-xs text-slate-500">{j.lastResult ? resultText(j.lastResult, t) : t('OK')}</span>) },
            ]} />
        </Card>
      </section>}
      <p className="text-sm text-slate-500"><Link to="/platform/societies" className="font-medium text-brand-600 hover:underline">{t('Manage societies →')}</Link></p>
    </div>
  );
}
