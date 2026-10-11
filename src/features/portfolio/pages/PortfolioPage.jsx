import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRightLeft, Briefcase, DoorOpen, IndianRupee, Siren, Wallet, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, PageLoader, StatCard, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { usePortfolio } from '../api';
import { label, money, periodLabel } from '../../../lib/format';

// Cross-society view for facility-management companies and people on several committees.
export default function PortfolioPage() {
  const { switchTo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePortfolio();
  const [switching, setSwitching] = useState(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { totals, societies, period, attendanceTracked } = data;

  const open = async (row) => {
    if (row.current) return navigate('/');
    setSwitching(row.membershipId);
    try {
      await switchTo(row.membershipId);
      navigate('/');
    } catch (err) {
      toast.error(err);
      setSwitching(null);
    }
  };

  if (societies.length < 2) {
    return (
      <div>
        <PageHeader title="Portfolio" description="All the societies you manage in one place." />
        <Card>
          <EmptyState icon={Briefcase} title="You manage one society" description="The portfolio compares societies when you are an admin or facility manager in two or more. Your society’s numbers are on the Dashboard." action={<Button onClick={() => navigate('/')}>Open dashboard</Button>} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Portfolio" description={`${totals.societies} societies you manage · ${periodLabel(period)}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} tone="green" label="Collected this month" value={money(totals.collectedThisMonth)} sub={`of ${money(totals.billedThisMonth)} billed${totals.collectionRate !== null ? ` · ${totals.collectionRate}%` : ''}`} />
        <StatCard icon={IndianRupee} tone="red" label="Overdue" value={money(totals.overdueAmount)} sub={`${totals.overdueBills} bills`} />
        <StatCard icon={Wrench} tone="amber" label="Open complaints" value={totals.openComplaints} sub={`${totals.slaBreaches} past SLA`} />
        <StatCard icon={Siren} tone={totals.activeSos ? 'red' : 'slate'} label="Active SOS" value={totals.activeSos} sub={`${totals.visitorsToday} visitors today`} />
      </div>
      <Card>
        <Table rows={societies.map((r) => ({ ...r, _id: r.society._id }))}
          columns={[
            { key: 'society', header: 'Society', render: (r) => <div><p className="font-medium text-slate-900">{r.society.name}{r.current && <Badge tone="brand" className="ml-2">open now</Badge>}</p><p className="text-xs text-slate-500">{r.society.city || r.society.code} · {r.units} units · you are {label(r.role)}</p></div> },
            { key: 'collection', header: 'Collected / billed', render: (r) => <div><p>{money(r.collectedThisMonth)} / {money(r.billedThisMonth)}</p>{r.collectionRate !== null && <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, r.collectionRate)}%` }} /></div>}</div> },
            { key: 'overdueAmount', header: 'Overdue', render: (r) => (r.overdueAmount ? <span className="text-red-600">{money(r.overdueAmount)}</span> : '—') },
            { key: 'complaints', header: 'Complaints', render: (r) => <span>{r.openComplaints}{r.slaBreaches > 0 && <Badge tone="red" className="ml-1">{r.slaBreaches} SLA</Badge>}</span> },
            { key: 'activeSos', header: 'SOS', render: (r) => (r.activeSos ? <Badge tone="red"><AlertTriangle className="mr-1 size-3" />{r.activeSos}</Badge> : '0') },
            { key: 'visitorsToday', header: 'Visitors today', render: (r) => <span className="inline-flex items-center gap-1"><DoorOpen className="size-3.5 text-slate-400" />{r.visitorsToday}</span> },
            { key: 'staff', header: attendanceTracked ? 'Staff present' : 'Help inside', render: (r) => (attendanceTracked ? r.staffPresent : r.helpInside) },
            { key: 'switch', header: '', render: (r) => (r.society.active ? <Button size="sm" variant="secondary" icon={ArrowRightLeft} loading={switching === r.membershipId} onClick={() => open(r)}>{r.current ? 'Open' : 'Switch to'}</Button> : <Badge tone="red">Suspended</Badge>) },
          ]} />
      </Card>
    </div>
  );
}
