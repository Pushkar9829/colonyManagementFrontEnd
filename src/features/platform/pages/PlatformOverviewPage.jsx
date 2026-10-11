import { Link } from 'react-router-dom';
import { Building2, Clock, IndianRupee, TrendingUp, Users, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, CardHeader, ErrorState, PageLoader, StatCard, Table } from '../../../components/ui';
import { dateTime, label, money, timeAgo } from '../../../lib/format';
import { usePlatformJobs, usePlatformStats } from '../api';

export default function PlatformOverviewPage() {
  const { data: s, isLoading, error, refetch } = usePlatformStats();
  const { data: jobs = [] } = usePlatformJobs();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Every society on ColonyHub." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Building2} label="Societies" value={s.societies} sub={`${s.activeSocieties} active · ${s.newSocieties30d} new in 30 days`} to="/platform/societies" />
        <StatCard icon={Users} tone="sky" label="Active members" value={s.activeMembers} sub={`${s.users} accounts · ${s.activeUsers30d} logged in (30d)`} />
        <StatCard icon={TrendingUp} tone="amber" label="Units managed" value={s.units} />
        <StatCard icon={Wallet} tone="green" label="Collected (30 days)" value={money(s.collected30d)} />
        <StatCard icon={IndianRupee} tone="red" label="Outstanding dues" value={money(s.outstanding)} />
        <Card className="flex flex-wrap items-center gap-2 p-4">
          <p className="w-full text-xs font-medium uppercase tracking-wide text-slate-500">Plans</p>
          {Object.entries(s.plans).map(([plan, count]) => <Badge key={plan} tone="brand">{label(plan)}: {count}</Badge>)}
        </Card>
      </div>
      <Card>
        <CardHeader title="Background jobs" subtitle="Reminders, late fees, auto-billing, SLA alerts" action={<Clock className="size-4 text-slate-400" />} />
        <Table rows={jobs} empty="Jobs haven't run yet"
          columns={[
            { key: '_id', header: 'Job', render: (j) => <span className="font-mono text-xs">{j._id}</span> },
            { key: 'lastRunAt', header: 'Last run', render: (j) => (j.lastRunAt ? `${dateTime(j.lastRunAt)} (${timeAgo(j.lastRunAt)})` : '—') },
            { key: 'lastDurationMs', header: 'Took', render: (j) => (j.lastDurationMs !== undefined ? `${j.lastDurationMs} ms` : '—') },
            { key: 'result', header: 'Result', className: 'max-w-xs truncate', render: (j) => (j.lastError ? <span className="text-red-600">{j.lastError}</span> : <span className="text-xs text-slate-500">{j.lastResult ? JSON.stringify(j.lastResult) : ''}</span>) },
          ]} />
      </Card>
      <p className="text-sm text-slate-500"><Link to="/platform/societies" className="font-medium text-brand-600 hover:underline">Manage societies →</Link></p>
    </div>
  );
}
