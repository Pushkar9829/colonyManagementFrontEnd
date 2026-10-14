import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardX,
  DoorOpen,
  Footprints,
  Hammer,
  IndianRupee,
  Megaphone,
  Package,
  QrCode,
  Receipt,
  Siren,
  UserCheck,
  UserPlus,
  Users,
  Vote,
  Wallet,
  Wrench,
} from 'lucide-react';
import { MapPin } from 'lucide-react';
import { api } from '../../../api/client';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, EmptyState, ErrorState, PageLoader, StatCard, StatusBadge } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/cn';
import { date, label, money, periodLabel, time, timeAgo, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useApproveVisitor, useDenyVisitor } from '../../visitors/api';
import { useFeatures } from '../../features/api';
import { PunchCard } from '../../staffhr/components/PunchCard';
import { MyTicketsCard } from '../../staffhr/components/MyTicketsCard';
import { useT } from '../../../context/LanguageContext';
import { SetupChecklist } from '../components/SetupChecklist';
import { TodayJobs } from '../components/TodayJobs';
import { useChecklistDay, useCurrentPatrol, useMaintenanceNumbers, useParcelWaiting, useStaffToday, useWorkOrderNumbers } from '../api';

function useDashboard() {
  const refetchInterval = useLiveInterval(30000);
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard'), refetchInterval });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; // translated by the caller
}

// StatCard keeps its sub-line on one row; this lets a longer one wrap instead of being cut off.
const wrap = (text) => <span className="whitespace-normal">{text}</span>;

function SosBanner({ count, urgent }) {
  if (!count) return null;
  return (
    <Link to="/sos" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <Siren className="size-5 shrink-0 animate-pulse" />
      <span className="font-semibold">{count} open SOS alert{count > 1 ? 's' : ''}{urgent ? ' — respond now' : ''}</span>
      <span className="ml-auto text-sm underline">View</span>
    </Link>
  );
}

// Large tap targets for the jobs people come to the home screen for.
function BigAction({ to, icon: Icon, children, primary, className }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-16 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-center font-semibold shadow-sm transition',
        primary ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
        className,
      )}
    >
      <Icon className="size-6 shrink-0" />
      <span>{children}</span>
    </Link>
  );
}

function RecentGate({ d }) {
  return (
    <Card>
      <CardHeader title="Recent gate activity" action={<Link to="/visitors" className="text-sm font-medium text-brand-600 hover:underline">All</Link>} />
      {!d.recentVisitors.length ? <EmptyState title="No visitors yet" /> : (
        <ul className="divide-y divide-slate-100">
          {d.recentVisitors.map((v) => (
            <li key={v._id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{v.name}</p>
                <p className="text-xs text-slate-500">{label(v.purpose)} · {v.unit?.label}{v.entryGateName ? ` · ${v.entryGateName}` : ''} · {timeAgo(v.createdAt)}</p>
              </div>
              <StatusBadge status={v.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ComplaintsByCategory({ d }) {
  return (
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
  );
}

function Management({ d }) {
  const m = d.billing.month;
  const rate = m.billed ? Math.round((m.collected / m.billed) * 100) : 0;
  return (
    <div className="space-y-6">
      <SosBanner count={d.activeSos} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Units" value={d.units} sub={wrap(`${d.occupancy.owner_occupied || 0} owner · ${d.occupancy.rented || 0} rented · ${d.occupancy.vacant || 0} vacant`)} to="/units" />
        <StatCard icon={Users} tone="sky" label="Residents" value={d.residents} sub={d.pendingApprovals ? `${d.pendingApprovals} awaiting approval` : 'No pending requests'} to="/members" />
        <StatCard icon={DoorOpen} tone="green" label="Visitors today" value={d.visitorsToday} sub={`${d.insideNow} inside now`} to="/visitors" />
        <StatCard icon={CalendarDays} tone="amber" label="Bookings today" value={d.bookingsToday} to="/amenities" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Receipt} label={`Billed · ${periodLabel(d.billing.period)}`} value={money(m.billed)} sub={`${m.paidBills}/${m.bills} bills paid`} to="/billing" />
        <StatCard icon={Wallet} tone="green" label="Collected this month" value={money(m.collected)} sub={`${rate}% collection`} to="/billing" />
        <StatCard icon={IndianRupee} tone="red" label="Total overdue" value={money(d.billing.allTime.overdue)} sub={wrap('Bills past their due date, all months')} to="/billing" />
        <StatCard icon={Wrench} tone="amber" label="Open complaints" value={d.complaints.active} sub={d.complaints.overdue ? `${d.complaints.overdue} late` : 'None late'} to="/complaints" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentGate d={d} />
        <ComplaintsByCategory d={d} />
      </div>
    </div>
  );
}

// Facility manager: the day's operations come first; money is the admin's and accountant's view.
// Tiles from switchable modules only appear when their numbers load.
function Operations({ d }) {
  const { isEnabled } = useFeatures();
  const today = todayISO();
  const staff = useStaffToday(today, true);
  const wo = useWorkOrderNumbers(true);
  const ppm = useMaintenanceNumbers(isEnabled('assets'));
  const runs = useChecklistDay(today, true);
  const st = staff.data?.totals;
  const sum = (k) => (runs.data?.rows || []).reduce((n, r) => n + (r[k] || 0), 0);
  return (
    <div className="space-y-6">
      <SosBanner count={d.activeSos} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {st && <StatCard icon={UserCheck} tone="green" label="Staff present today" value={`${st.present} / ${st.employees}`} sub={wrap(`${st.notMarked} not marked · ${st.onLeave} on leave`)} to="/staff/attendance" />}
        <StatCard icon={Wrench} tone="amber" label="Open complaints" value={d.complaints.active} to="/complaints" />
        <StatCard icon={AlertTriangle} tone="red" label="Late jobs" value={d.complaints.overdue} sub={d.complaints.overdue ? 'Past the promised time' : 'None late'} to="/complaints?overdue=true" />
        {wo.data && <StatCard icon={Hammer} tone="sky" label="Work orders open" value={wo.data.open} sub={wo.data.awaitingVerification ? `${wo.data.awaitingVerification} to verify` : undefined} to="/work-orders" />}
        {ppm.data && <StatCard icon={CalendarCheck} tone="amber" label="Maintenance due" value={ppm.data.dueToday + ppm.data.overdue} sub={ppm.data.overdue ? `${ppm.data.overdue} overdue` : 'Due today'} to="/maintenance" />}
        {runs.data && <StatCard icon={ClipboardX} tone={sum('missed') ? 'red' : 'slate'} label="Checklists missed" value={sum('missed')} sub={sum('pending') ? `${sum('pending')} still to do today` : 'Today'} to="/checklists" />}
        <StatCard icon={DoorOpen} tone="green" label="Visitors today" value={d.visitorsToday} sub={`${d.insideNow} inside now`} to="/visitors" />
        <StatCard icon={CalendarDays} tone="brand" label="Bookings today" value={d.bookingsToday} to="/amenities" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ComplaintsByCategory d={d} />
        <RecentGate d={d} />
      </div>
    </div>
  );
}

// Amber while something is due, red only once it is overdue.
function DuesCard({ dues }) {
  const { t } = useT();
  const due = Math.max(0, dues.outstanding || 0);
  const overdue = dues.overdue > 0;
  const tone = overdue ? 'border-red-200 bg-red-50' : due ? 'border-amber-200 bg-amber-50' : '';
  return (
    <Card className={cn('flex h-full flex-col gap-2 p-3 sm:p-4', tone)}>
      <Link to="/billing" className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{t('Amount due')}</p>
        <p className={cn('mt-0.5 break-words text-lg font-semibold sm:text-xl', overdue ? 'text-red-700' : due ? 'text-amber-800' : 'text-slate-900')}>{money(due)}</p>
        <p className={cn('text-xs', overdue ? 'font-medium text-red-700' : 'text-slate-500')}>{overdue ? `${money(dues.overdue)} overdue` : due ? 'Not overdue yet' : 'Nothing to pay'}</p>
      </Link>
      {due > 0 && (
        <Link to="/billing" className={cn('mt-auto inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white shadow-sm', overdue ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700')}>
          Pay {money(due)}
        </Link>
      )}
    </Card>
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DuesCard dues={d.dues} />
        <StatCard icon={Wrench} tone="amber" label={t('My open complaints')} value={d.openComplaints} to="/complaints" />
        <StatCard icon={Megaphone} tone="sky" label={t('Unread notices')} value={d.unreadNotices} to="/notices" />
        <StatCard icon={Vote} tone="brand" label={t('Open polls')} value={d.openPolls} to="/polls" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigAction to="/visitors?new=pass" icon={UserPlus} className="flex-col text-sm sm:flex-row sm:text-base">{t('Pre-approve a guest')}</BigAction>
        <BigAction to="/complaints" icon={Wrench} className="flex-col text-sm sm:flex-row sm:text-base">{t('Raise a complaint')}</BigAction>
        <BigAction to="/amenities" icon={CalendarDays} className="flex-col text-sm sm:flex-row sm:text-base">Book amenity</BigAction>
        <BigAction to="/billing" icon={IndianRupee} className="flex-col text-sm sm:flex-row sm:text-base">Pay</BigAction>
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
      <Link to="/daily-help" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
        <UserCheck className="size-4" />{t('My daily help')}
      </Link>
    </div>
  );
}

// The round running now (not yet finished), else the soonest upcoming one.
function nextPatrol(items) {
  if (!items?.length) return null;
  const running = items.find((i) => i.slot && !['completed', 'missed'].includes(i.status));
  if (running) return { value: 'Due now', sub: `${running.route.name} · until ${time(running.slot.windowEnd)}`, tone: 'red' };
  const next = items.filter((i) => i.nextDueAt).sort((a, b) => new Date(a.nextDueAt) - new Date(b.nextDueAt))[0];
  if (!next) return null;
  const sameDay = new Date(next.nextDueAt).toDateString() === new Date().toDateString();
  return { value: sameDay ? time(next.nextDueAt) : `${date(next.nextDueAt)} ${time(next.nextDueAt)}`, sub: next.route.name, tone: 'sky' };
}

function Guard({ d }) {
  const { isEnabled } = useFeatures();
  const parcels = useParcelWaiting(isEnabled('parcels'));
  const patrols = useCurrentPatrol(isEnabled('patrols'));
  const patrol = nextPatrol(patrols.data);
  return (
    <div className="space-y-6">
      <SosBanner count={d.activeSos} urgent />
      <Link to="/gate" className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <MapPin className="size-6 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Your gate</p>
          <p className="truncate text-lg font-bold text-slate-900">{d.gate ? d.gate.name : 'Choose your gate in the gate console'}</p>
        </div>
        {d.atGate && <span className="shrink-0 text-right text-xs text-slate-600">{d.atGate.today} today<br />{d.atGate.inside} inside</span>}
      </Link>
      <div className="grid gap-3 sm:grid-cols-3">
        <BigAction to="/gate" icon={UserPlus} primary className="text-lg">New visitor</BigAction>
        <BigAction to="/gate?tab=scan" icon={QrCode} className="text-lg">Scan pass / code</BigAction>
        {isEnabled('parcels') && <BigAction to="/gate?tab=parcels" icon={Package} className="text-lg">Log parcel</BigAction>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={AlertTriangle} tone="amber" label="Waiting at gate" value={d.pendingVisitors} sub={d.pendingVisitors ? 'Waiting for the resident' : 'No one waiting'} to="/gate?tab=pending" />
        <StatCard icon={DoorOpen} tone="green" label="Inside now" value={d.insideNow} sub={d.helpInside ? `+ ${d.helpInside} daily help` : 'Visitors'} to="/gate?tab=inside" />
        {parcels.data && <StatCard icon={Package} tone="sky" label="Parcels waiting" value={parcels.data.waiting} sub={parcels.data.ageing?.over3days ? `${parcels.data.ageing.over3days} over 3 days` : undefined} to="/parcels" />}
        {patrol ? (
          <StatCard icon={Footprints} tone={patrol.tone} label="Next patrol" value={patrol.value} sub={wrap(patrol.sub)} to="/patrols" />
        ) : (
          <StatCard icon={Siren} tone="red" label="Open SOS" value={d.activeSos} to="/sos" />
        )}
      </div>
    </div>
  );
}

function Staff({ d }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard icon={Wrench} label="Assigned to me" value={d.assignedComplaints} sub="Open complaints" to="/complaints" />
        <StatCard icon={AlertTriangle} tone="red" label="Late jobs" value={d.overdueComplaints} sub={d.overdueComplaints ? 'Past the promised time' : 'None late'} to="/complaints?overdue=true" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PunchCard />
          <TodayJobs />
        </div>
        <MyTicketsCard />
      </div>
    </div>
  );
}

const VIEWS = { management: Management, resident: Resident, guard: Guard, staff: Staff };

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useT();
  const { data, isLoading, error, refetch } = useDashboard();
  const View = data ? (data.view === 'management' && user.role === ROLES.FACILITY_MANAGER ? Operations : VIEWS[data.view]) : null;
  // People with more than one home see which flat the numbers are for.
  const showing = user.unit?.label && (user.memberships || []).length > 1 ? `Showing ${user.unit.label}` : '';
  return (
    <div>
      <PageHeader
        title={`${t(greeting())}, ${user.name.split(' ')[0]}`}
        description={showing ? `${showing} · ${user.society?.name}` : `${user.society?.name}${user.unit?.label ? ` · ${user.unit.label}` : ''}`}
      />
      {user.role === 'admin' && user.society && <SetupChecklist />}
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : <View d={data} />}
    </div>
  );
}
