import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  DoorOpen,
  IndianRupee,
  Megaphone,
  Receipt,
  ShieldCheck,
  Siren,
  UserCheck,
  UserPlus,
  Users,
  Vote,
  Wallet,
  Wrench,
} from 'lucide-react';
import { api } from '../../../api/client';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, EmptyState, ErrorState, PageLoader, StatCard, StatusBadge } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date, label, money, periodLabel, timeAgo } from '../../../lib/format';
import { useApproveVisitor, useDenyVisitor } from '../../visitors/api';
import { useT } from '../../../context/LanguageContext';

function useDashboard() {
  const refetchInterval = useLiveInterval(30000);
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard'), refetchInterval });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; // translated by the caller
}

function Management({ d }) {
  const m = d.billing.month;
  const rate = m.billed ? Math.round((m.collected / m.billed) * 100) : 0;
  return (
    <div className="space-y-6">
      {d.activeSos > 0 && (
        <Link to="/sos" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <Siren className="size-5 animate-pulse" />
          <span className="font-semibold">{d.activeSos} open SOS alert{d.activeSos > 1 ? 's' : ''}</span>
          <span className="ml-auto text-sm underline">View</span>
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Units" value={d.units} sub={`${d.occupancy.owner_occupied || 0} owner · ${d.occupancy.rented || 0} rented · ${d.occupancy.vacant || 0} vacant`} to="/units" />
        <StatCard icon={Users} tone="sky" label="Residents" value={d.residents} sub={d.pendingApprovals ? `${d.pendingApprovals} awaiting approval` : 'No pending requests'} to="/members" />
        <StatCard icon={DoorOpen} tone="green" label="Visitors today" value={d.visitorsToday} sub={`${d.insideNow} inside now`} to="/visitors" />
        <StatCard icon={CalendarDays} tone="amber" label="Bookings today" value={d.bookingsToday} to="/amenities" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Receipt} label={`Billed · ${periodLabel(d.billing.period)}`} value={money(m.billed)} sub={`${m.paidBills}/${m.bills} bills paid`} to="/billing" />
        <StatCard icon={Wallet} tone="green" label="Collected this month" value={money(m.collected)} sub={`${rate}% collection`} to="/billing" />
        <StatCard icon={IndianRupee} tone="red" label="Total overdue" value={money(d.billing.allTime.overdue)} to="/billing" />
        <StatCard icon={Wrench} tone="amber" label="Open complaints" value={d.complaints.active} sub={d.complaints.overdue ? `${d.complaints.overdue} past SLA` : 'All within SLA'} to="/complaints" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent gate activity" action={<Link to="/visitors" className="text-sm font-medium text-brand-600 hover:underline">All</Link>} />
          {!d.recentVisitors.length ? <EmptyState title="No visitors yet" /> : (
            <ul className="divide-y divide-slate-100">
              {d.recentVisitors.map((v) => (
                <li key={v._id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{v.name}</p>
                    <p className="text-xs text-slate-500">{label(v.purpose)} · {v.unit?.label} · {timeAgo(v.createdAt)}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Complaints by category" subtitle="Currently open" action={<Link to="/complaints" className="text-sm font-medium text-brand-600 hover:underline">Helpdesk</Link>} />
          {!d.complaints.byCategory.length ? <EmptyState title="No open complaints" /> : (
            <ul className="space-y-3 p-5">
              {d.complaints.byCategory.map((c) => {
                const pct = Math.round((c.count / d.complaints.active) * 100);
                return (
                  <li key={c._id} className="text-sm">
                    <div className="mb-1 flex justify-between"><span className="text-slate-700">{label(c._id)}</span><span className="text-slate-500">{c.count}</span></div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Resident({ d }) {
  const { t } = useT();
  const approve = useApproveVisitor();
  const deny = useDenyVisitor();
  return (
    <div className="space-y-6">
      {d.pendingVisitors.length > 0 && (
        <Card className="border-amber-200">
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 font-semibold text-amber-800">{t('Someone is at the gate')}</div>
          <ul className="divide-y divide-slate-100">
            {d.pendingVisitors.map((v) => (
              <li key={v._id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{v.name}</p>
                  <p className="text-sm text-slate-500">{label(v.purpose)}{v.company ? ` · ${v.company}` : ''} · {timeAgo(v.createdAt)}</p>
                </div>
                <Button size="sm" variant="success" onClick={() => approve.mutate(v._id)}>{t('Allow')}</Button>
                <Button size="sm" variant="danger" onClick={() => deny.mutate(v._id)}>{t('Deny')}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={IndianRupee} tone={d.dues.outstanding ? 'red' : 'green'} label={t('Dues outstanding')} value={money(d.dues.outstanding)} sub={d.dues.overdue ? `${money(d.dues.overdue)} overdue` : 'Nothing overdue'} to="/billing" />
        <StatCard icon={Wrench} tone="amber" label={t('My open complaints')} value={d.openComplaints} to="/complaints" />
        <StatCard icon={Megaphone} tone="sky" label={t('Unread notices')} value={d.unreadNotices} to="/notices" />
        <StatCard icon={Vote} tone="brand" label={t('Open polls')} value={d.openPolls} to="/polls" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('Unpaid bills')} action={<Link to="/billing" className="text-sm font-medium text-brand-600 hover:underline">All bills</Link>} />
          {!d.unpaidBills.length ? <EmptyState title="You're all paid up" /> : (
            <ul className="divide-y divide-slate-100">
              {d.unpaidBills.map((b) => (
                <li key={b._id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div><p className="font-medium text-slate-800">{b.period === 'OPENING' ? 'Opening balance' : periodLabel(b.period)}</p><p className="text-xs text-slate-500">Due {date(b.dueDate)}</p></div>
                  <span className="font-semibold text-slate-900">{money(b.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={t('Upcoming bookings')} action={<Link to="/amenities" className="text-sm font-medium text-brand-600 hover:underline">Book</Link>} />
          {!d.upcomingBookings.length ? <EmptyState title="No upcoming bookings" /> : (
            <ul className="divide-y divide-slate-100">
              {d.upcomingBookings.map((b) => (
                <li key={b._id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div><p className="font-medium text-slate-800">{b.amenity?.name}</p><p className="text-xs text-slate-500">{date(b.date)} · {b.startTime}–{b.endTime}</p></div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/visitors"><Button variant="secondary" icon={UserPlus}>{t('Pre-approve a guest')}</Button></Link>
        <Link to="/complaints"><Button variant="secondary" icon={Wrench}>{t('Raise a complaint')}</Button></Link>
        <Link to="/daily-help"><Button variant="secondary" icon={UserCheck}>{t('My daily help')}</Button></Link>
      </div>
    </div>
  );
}

function Guard({ d }) {
  return (
    <div className="space-y-6">
      {d.activeSos > 0 && (
        <Link to="/sos" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <Siren className="size-5 animate-pulse" /><span className="font-semibold">{d.activeSos} open SOS alert{d.activeSos > 1 ? 's' : ''} — respond now</span>
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={AlertTriangle} tone="amber" label="Awaiting approval" value={d.pendingVisitors} to="/gate" />
        <StatCard icon={DoorOpen} tone="green" label="Visitors inside" value={d.insideNow} to="/gate" />
        <StatCard icon={UserCheck} tone="sky" label="Daily help inside" value={d.helpInside} to="/daily-help" />
        <StatCard icon={Siren} tone="red" label="Open SOS" value={d.activeSos} to="/sos" />
      </div>
      <Link to="/gate"><Button size="lg" icon={ShieldCheck}>Open gate console</Button></Link>
    </div>
  );
}

function Staff({ d }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard icon={Wrench} label="Assigned to me" value={d.assignedComplaints} to="/complaints" />
      <StatCard icon={AlertTriangle} tone="red" label="Past SLA" value={d.overdueComplaints} to="/complaints?overdue=true" />
    </div>
  );
}

const VIEWS = { management: Management, resident: Resident, guard: Guard, staff: Staff };

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useT();
  const { data, isLoading, error, refetch } = useDashboard();
  const View = data ? VIEWS[data.view] : null;
  return (
    <div>
      <PageHeader title={`${t(greeting())}, ${user.name.split(' ')[0]}`} description={`${user.society?.name}${user.unit?.label ? ` · ${user.unit.label}` : ''}`} />
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : <View d={data} />}
    </div>
  );
}
