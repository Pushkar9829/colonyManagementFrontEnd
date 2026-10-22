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
import { BriefcaseBusiness, MapPin } from 'lucide-react';
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
import { TodayBirthdaysCard } from '../../celebrations/components/TodayBirthdaysCard';
import { useTemplate } from '../../../context/TemplateContext';
import { HomeView } from '../components/HomeLayouts';
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
  const { t } = useT();
  if (!count) return null;
  return (
    <Link to="/sos" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <Siren className="size-5 shrink-0 animate-pulse" />
      <span className="font-semibold">{t(count > 1 ? (urgent ? '{count} open SOS alerts — respond now' : '{count} open SOS alerts') : (urgent ? '{count} open SOS alert — respond now' : '{count} open SOS alert'), { count })}</span>
      <span className="ml-auto text-sm underline">{t('View')}</span>
    </Link>
  );
}

function RecentGate({ d }) {
  const { t } = useT();
  return (
    <Card>
      <CardHeader title="Recent gate activity" action={<Link to="/visitors" className="text-sm font-medium text-brand-600 hover:underline">{t('All')}</Link>} />
      {!d.recentVisitors.length ? <EmptyState title="No visitors yet" /> : (
        <ul className="divide-y divide-slate-100">
          {d.recentVisitors.map((v) => (
            <li key={v._id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{v.name}</p>
                <p className="text-xs text-slate-500">{t(label(v.purpose))} · {v.unit?.label}{v.entryGateName ? ` · ${v.entryGateName}` : ''} · {timeAgo(v.createdAt)}</p>
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
  const { t } = useT();
  return (
    <Card>
      <CardHeader title="Complaints by category" subtitle="Currently open" action={<Link to="/complaints" className="text-sm font-medium text-brand-600 hover:underline">{t('Helpdesk')}</Link>} />
      {!d.complaints.byCategory.length ? <EmptyState title="No open complaints" /> : (
        <ul className="space-y-3 p-5">
          {d.complaints.byCategory.map((c) => {
            const pct = Math.round((c.count / d.complaints.active) * 100);
            return (
              <li key={c._id} className="text-sm">
                <div className="mb-1 flex justify-between"><span className="text-slate-700">{t(label(c._id))}</span><span className="text-slate-500">{c.count}</span></div>
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
  const { t } = useT();
  return (
    <div className="space-y-6">
      <SosBanner count={d.activeSos} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Units" value={d.units} sub={wrap(t('{owner} owner · {rented} rented · {vacant} vacant', { owner: d.occupancy.owner_occupied || 0, rented: d.occupancy.rented || 0, vacant: d.occupancy.vacant || 0 }))} to="/units" />
        <StatCard icon={Users} tone="sky" label="Residents" value={d.residents} sub={d.pendingApprovals ? t('{n} awaiting approval', { n: d.pendingApprovals }) : 'No pending requests'} to="/members" />
        <StatCard icon={DoorOpen} tone="green" label="Visitors today" value={d.visitorsToday} sub={t('{n} inside now', { n: d.insideNow })} to="/visitors" />
        <StatCard icon={CalendarDays} tone="amber" label="Bookings today" value={d.bookingsToday} to="/amenities" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Receipt} label={t('Billed · {period}', { period: periodLabel(d.billing.period) })} value={money(m.billed)} sub={t('{paid}/{total} bills paid', { paid: m.paidBills, total: m.bills })} to="/billing" />
        <StatCard icon={Wallet} tone="green" label="Collected this month" value={money(m.collected)} sub={t('{rate}% collection', { rate })} to="/billing" />
        <StatCard icon={IndianRupee} tone="red" label="Total overdue" value={money(d.billing.allTime.overdue)} sub={wrap(t('Bills past their due date, all months'))} to="/billing" />
        <StatCard icon={Wrench} tone="amber" label="Open complaints" value={d.complaints.active} sub={d.complaints.overdue ? t('{n} late', { n: d.complaints.overdue }) : 'None late'} to="/complaints" />
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
  const { t } = useT();
  return (
    <div className="space-y-6">
      <SosBanner count={d.activeSos} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {st && <StatCard icon={UserCheck} tone="green" label="Staff present today" value={`${st.present} / ${st.employees}`} sub={wrap(t('{notMarked} not marked · {onLeave} on leave', { notMarked: st.notMarked, onLeave: st.onLeave }))} to="/staff/attendance" />}
        <StatCard icon={Wrench} tone="amber" label="Open complaints" value={d.complaints.active} to="/complaints" />
        <StatCard icon={AlertTriangle} tone="red" label="Late jobs" value={d.complaints.overdue} sub={d.complaints.overdue ? 'Past the promised time' : 'None late'} to="/complaints?overdue=true" />
        {wo.data && <StatCard icon={Hammer} tone="sky" label="Work orders open" value={wo.data.open} sub={wo.data.awaitingVerification ? t('{n} to verify', { n: wo.data.awaitingVerification }) : undefined} to="/work-orders" />}
        {ppm.data && <StatCard icon={CalendarCheck} tone="amber" label="Maintenance due" value={ppm.data.dueToday + ppm.data.overdue} sub={ppm.data.overdue ? t('{n} overdue', { n: ppm.data.overdue }) : 'Due today'} to="/maintenance" />}
        {runs.data && <StatCard icon={ClipboardX} tone={sum('missed') ? 'red' : 'slate'} label="Checklists missed" value={sum('missed')} sub={sum('pending') ? t('{n} still to do today', { n: sum('pending') }) : 'Today'} to="/checklists" />}
        <StatCard icon={DoorOpen} tone="green" label="Visitors today" value={d.visitorsToday} sub={t('{n} inside now', { n: d.insideNow })} to="/visitors" />
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
        <p className={cn('text-xs', overdue ? 'font-medium text-red-700' : 'text-slate-500')}>{overdue ? t('{amount} overdue', { amount: money(dues.overdue) }) : due ? t('Not overdue yet') : t('Nothing to pay')}</p>
      </Link>
      {due > 0 && (
        <Link to="/billing" className={cn('mt-auto inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white shadow-sm', overdue ? 'bg-red-600 hover:bg-red-700' : 'tpl-btn-primary bg-brand-600 hover:bg-brand-700')}>
          {t('Pay {amount}', { amount: money(due) })}
        </Link>
      )}
    </Card>
  );
}

function Resident({ d, home }) {
  const { t } = useT();
  const approve = useApproveVisitor();
  const deny = useDenyVisitor();
  const due = Math.max(0, d.dues.outstanding || 0);
  const overdue = d.dues.overdue > 0;
  const alerts = d.pendingVisitors.length > 0 && (
    <Card className="border-amber-200">
      <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 font-semibold text-amber-800">{t('Someone is at the gate')}</div>
      <ul className="divide-y divide-slate-100">
        {d.pendingVisitors.map((v) => (
          <li key={v._id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{v.name}</p>
              <p className="text-sm text-slate-500">{t(label(v.purpose))}{v.company ? ` · ${v.company}` : ''} · {timeAgo(v.createdAt)}</p>
            </div>
            <Button size="sm" variant="success" onClick={() => approve.mutate(v._id)}>{t('Allow')}</Button>
            <Button size="sm" variant="danger" onClick={() => deny.mutate(v._id)}>{t('Deny')}</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
  const stats = [
    {
      key: 'dues',
      node: <DuesCard dues={d.dues} />,
      icon: IndianRupee,
      tone: overdue ? 'red' : due ? 'amber' : 'green',
      label: t('Amount due'),
      value: money(due),
      sub: overdue ? t('{amount} overdue', { amount: money(d.dues.overdue) }) : due ? t('Not overdue yet') : t('Nothing to pay'),
      to: '/billing',
    },
    { key: 'complaints', icon: Wrench, tone: 'amber', label: t('My open complaints'), value: d.openComplaints, to: '/complaints' },
    { key: 'notices', icon: Megaphone, tone: 'sky', label: t('Unread notices'), value: d.unreadNotices, to: '/notices' },
    { key: 'polls', icon: Vote, tone: 'brand', label: t('Open polls'), value: d.openPolls, to: '/polls' },
  ];
  const actions = [
    { to: '/visitors?new=pass', icon: UserPlus, label: t('Pre-approve a guest') },
    { to: '/complaints', icon: Wrench, label: t('Raise a complaint') },
    { to: '/amenities', icon: CalendarDays, label: t('Book amenity') },
    { to: '/billing', icon: IndianRupee, label: t('Pay') },
  ];
  const extras = (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('Unpaid bills')} action={<Link to="/billing" className="text-sm font-medium text-brand-600 hover:underline">{t('All bills')}</Link>} />
          {!d.unpaidBills.length ? <EmptyState title="You're all paid up" /> : (
            <ul className="divide-y divide-slate-100">
              {d.unpaidBills.map((b) => (
                <li key={b._id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div><p className="font-medium text-slate-800">{b.period === 'OPENING' ? t('Opening balance') : periodLabel(b.period)}</p><p className="text-xs text-slate-500">{t('Due {date}', { date: date(b.dueDate) })}</p></div>
                  <span className="font-semibold text-slate-900">{money(b.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={t('Upcoming bookings')} action={<Link to="/amenities" className="text-sm font-medium text-brand-600 hover:underline">{t('Book')}</Link>} />
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
    </>
  );
  return <HomeView {...home} alerts={alerts} stats={stats} actions={actions} extras={extras} />;
}

// The round running now (not yet finished), else the soonest upcoming one.
function nextPatrol(items, t) {
  if (!items?.length) return null;
  const running = items.find((i) => i.slot && !['completed', 'missed'].includes(i.status));
  if (running) return { value: t('Due now'), sub: t('{route} · until {time}', { route: running.route.name, time: time(running.slot.windowEnd) }), tone: 'red' };
  const next = items.filter((i) => i.nextDueAt).sort((a, b) => new Date(a.nextDueAt) - new Date(b.nextDueAt))[0];
  if (!next) return null;
  const sameDay = new Date(next.nextDueAt).toDateString() === new Date().toDateString();
  return { value: sameDay ? time(next.nextDueAt) : `${date(next.nextDueAt)} ${time(next.nextDueAt)}`, sub: next.route.name, tone: 'sky' };
}

function Guard({ d, home }) {
  const { isEnabled } = useFeatures();
  const parcels = useParcelWaiting(isEnabled('parcels'));
  const patrols = useCurrentPatrol(isEnabled('patrols'));
  const { t } = useT();
  const patrol = nextPatrol(patrols.data, t);
  const alerts = (
    <>
      <SosBanner count={d.activeSos} urgent />
      <Link to="/gate" className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <MapPin className="size-6 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{t('Your gate')}</p>
          <p className="truncate text-lg font-bold text-slate-900">{d.gate ? d.gate.name : t('Choose your gate in the gate console')}</p>
        </div>
        {d.atGate && <span className="shrink-0 text-right text-xs text-slate-600">{t('{n} today', { n: d.atGate.today })}<br />{t('{n} inside', { n: d.atGate.inside })}</span>}
      </Link>
    </>
  );
  const actions = [
    { to: '/gate', icon: UserPlus, label: t('New visitor'), primary: true },
    { to: '/gate?tab=scan', icon: QrCode, label: t('Scan pass / code') },
    ...(isEnabled('parcels') ? [{ to: '/gate?tab=parcels', icon: Package, label: t('Log parcel') }] : []),
  ];
  const stats = [
    { key: 'waiting', icon: AlertTriangle, tone: 'amber', label: 'Waiting at gate', value: d.pendingVisitors, sub: d.pendingVisitors ? 'Waiting for the resident' : 'No one waiting', to: '/gate?tab=pending' },
    { key: 'inside', icon: DoorOpen, tone: 'green', label: 'Inside now', value: d.insideNow, sub: d.helpInside ? t('+ {n} daily help', { n: d.helpInside }) : 'Visitors', to: '/gate?tab=inside' },
    ...(parcels.data ? [{ key: 'parcels', icon: Package, tone: 'sky', label: 'Parcels waiting', value: parcels.data.waiting, sub: parcels.data.ageing?.over3days ? t('{n} over 3 days', { n: parcels.data.ageing.over3days }) : undefined, to: '/parcels' }] : []),
    patrol
      ? { key: 'patrol', icon: Footprints, tone: patrol.tone, label: 'Next patrol', value: patrol.value, sub: home.layout === 'cards' ? wrap(patrol.sub) : patrol.sub, to: '/patrols' }
      : { key: 'sos', icon: Siren, tone: 'red', label: 'Open SOS', value: d.activeSos, to: '/sos' },
  ];
  return <HomeView {...home} alerts={alerts} stats={stats} actions={actions} actionsFirst bigActions />;
}

function Staff({ d, home }) {
  const { t } = useT();
  const stats = [
    { key: 'assigned', icon: Wrench, tone: 'brand', label: 'Assigned to me', value: d.assignedComplaints, sub: 'Open complaints', to: '/complaints' },
    { key: 'late', icon: AlertTriangle, tone: 'red', label: 'Late jobs', value: d.overdueComplaints, sub: d.overdueComplaints ? 'Past the promised time' : 'None late', to: '/complaints?overdue=true' },
  ];
  // grid-cols-1: the attendance card's columns must not push the page wider than a phone
  const extras = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-6">
        <PunchCard />
        <TodayJobs />
      </div>
      <MyTicketsCard />
    </div>
  );
  // The classic card layout keeps the staff home as it was; the other layouts add shortcuts to the two
  // pages staff open most.
  if (home.layout === 'cards') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {stats.map((s) => <StatCard key={s.key} icon={s.icon} tone={s.tone} label={s.label} value={s.value} sub={s.sub} to={s.to} />)}
        </div>
        {extras}
      </div>
    );
  }
  const actions = [
    { to: '/complaints', icon: Wrench, label: t('My jobs') },
    { to: '/my-work', icon: BriefcaseBusiness, label: t('My work') },
  ];
  return <HomeView {...home} stats={stats} actions={actions} extras={extras} />;
}

const VIEWS = { management: Management, resident: Resident, guard: Guard, staff: Staff };

// Resident, guard and staff homes follow the colony's app template (its home layout); the management
// dashboards keep their layout and only take the template's colours and shapes.
const TEMPLATED_VIEWS = ['resident', 'guard', 'staff'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useT();
  const { template, appearance } = useTemplate();
  const { data, isLoading, error, refetch } = useDashboard();
  const View = data ? (data.view === 'management' && user.role === ROLES.FACILITY_MANAGER ? Operations : VIEWS[data.view]) : null;
  // People with more than one home see which flat the numbers are for.
  const showing = user.unit?.label && (user.memberships || []).length > 1 ? t('Showing {unit}', { unit: user.unit.label }) : '';
  const title = `${t(greeting())}, ${user.name.split(' ')[0]}`;
  const description = showing ? `${showing} · ${user.society?.name}` : `${user.society?.name}${user.unit?.label ? ` · ${user.unit.label}` : ''}`;
  const layout = TEMPLATED_VIEWS.includes(data?.view) ? template.home || 'cards' : 'cards';
  const home = {
    layout,
    icons: template.icons || 'circle',
    hero: { greeting: title, description: showing || user.unit?.label || '', society: user.society?.name, logoUrl: appearance?.logoUrl, coverUrl: appearance?.coverUrl },
  };
  const hero = layout === 'hero';
  return (
    <div>
      {!hero && <PageHeader title={title} description={description} />}
      {user.role === 'admin' && user.society && <SetupChecklist />}
      {user.society && !hero && <TodayBirthdaysCard />}
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : <View d={data} home={home} />}
      {user.society && hero && <div className="mt-6"><TodayBirthdaysCard /></div>}
    </div>
  );
}
