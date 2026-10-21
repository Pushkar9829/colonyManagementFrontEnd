import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BatteryCharging, Car, Clock, SquareParking, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, EmptyState, StatCard, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { hasRole, isManager, ROLES } from '../../../lib/roles';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { useParkingSummary } from '../api';
import { EvTab } from '../components/EvTab';
import { MyParkingTab } from '../components/MyParkingTab';
import { SlotsTab } from '../components/SlotsTab';
import { ViolationsTab } from '../components/ViolationsTab';
import { VisitorParkingTab } from '../components/VisitorParkingTab';

function Summary() {
  const { t } = useT();
  const live = useLiveInterval(15000);
  const { data } = useParkingSummary({ refetchInterval: live });
  if (!data) return null;
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard icon={SquareParking} label="Resident slots" value={data.residentSlots} sub={t('{count} allotted', { count: data.allotted })} />
      <StatCard icon={Car} tone="green" label="Free slots" value={data.free} />
      <StatCard icon={Users} tone="sky" label="Visitor cars" value={`${data.visitorsParked}/${data.visitorSlots}`} sub="parked / visitor slots" />
      <StatCard icon={Clock} tone={data.overstays ? 'red' : 'slate'} label="Overstays" value={data.overstays} />
      <StatCard icon={AlertTriangle} tone="amber" label="Open violations" value={data.openViolations} />
      <StatCard icon={BatteryCharging} tone="brand" label="EV charging" value={data.charging} />
    </div>
  );
}

export default function ParkingPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const staff = hasRole(user, ROLES.GUARD, ROLES.FACILITY_MANAGER);
  // Strict check: admins pass hasRole for everything but have no unit, so they get the staff view.
  const resident = user?.role === ROLES.RESIDENT;
  const [params, setParams] = useSearchParams();

  const tabs = [
    resident && { value: 'mine', label: 'My parking' },
    manager && { value: 'slots', label: 'Slots' },
    staff && { value: 'visitors', label: 'Visitor parking' },
    (staff || resident) && { value: 'violations', label: 'Violations' },
    (staff || resident) && { value: 'ev', label: 'EV charging' },
  ].filter(Boolean);
  const requested = params.get('tab');
  const tab = tabs.some((t) => t.value === requested) ? requested : tabs[0]?.value;
  const setTab = (t) => setParams({ tab: t }, { replace: true });

  return (
    <div>
      <PageHeader
        title="Parking"
        description={resident ? 'Your slots, vehicles, violations and EV charging.' : manager ? 'Slots, allotments, visitor parking, violations and EV chargers.' : 'Visitor parking, violations and EV charging.'}
      />
      {staff && <Summary />}
      {!tabs.length ? (
        <Card><EmptyState icon={SquareParking} title="Parking is not available for your role" /></Card>
      ) : (
        <>
          <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
          {tab === 'mine' && <MyParkingTab onTab={setTab} />}
          {tab === 'slots' && <SlotsTab />}
          {tab === 'visitors' && <VisitorParkingTab />}
          {tab === 'violations' && <ViolationsTab canReport={staff} canResolve={manager} resident={resident} />}
          {tab === 'ev' && <EvTab manager={manager} resident={resident} />}
        </>
      )}
    </div>
  );
}
