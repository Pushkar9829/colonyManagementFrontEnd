import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { hasRole, isManager, ROLES } from '../../../lib/roles';
import { CheckpointsTab } from '../components/CheckpointsTab';
import { PatrolTab } from '../components/PatrolTab';
import { ReportTab } from '../components/ReportTab';
import { RoundsTab } from '../components/RoundsTab';
import { RoutesTab } from '../components/RoutesTab';

export default function PatrolsPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  // Scanning is guard-only on the server (admin passes every role check).
  const canScan = hasRole(user, ROLES.GUARD);
  const tabs = [
    { value: 'patrol', label: canScan ? 'Patrol' : 'Live status' },
    manager && { value: 'checkpoints', label: 'Checkpoints' },
    { value: 'routes', label: 'Routes' },
    { value: 'rounds', label: 'Rounds' },
    manager && { value: 'report', label: 'Report' },
  ].filter(Boolean);

  const [params, setParams] = useSearchParams();
  const fallback = user.role === ROLES.GUARD ? 'patrol' : 'rounds';
  const requested = params.get('tab');
  const tab = tabs.some((t) => t.value === requested) ? requested : fallback;
  const setTab = (t) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });

  return (
    <div>
      <PageHeader title="Patrols" description={canScan && !manager ? 'Scan each checkpoint QR during your rounds.' : 'Checkpoints, patrol schedules and round completion.'} />
      <Tabs className="mb-4" tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'patrol' && <PatrolTab canScan={canScan} />}
      {tab === 'checkpoints' && <CheckpointsTab />}
      {tab === 'routes' && <RoutesTab manager={manager} />}
      {tab === 'rounds' && <RoundsTab />}
      {tab === 'report' && <ReportTab />}
    </div>
  );
}
