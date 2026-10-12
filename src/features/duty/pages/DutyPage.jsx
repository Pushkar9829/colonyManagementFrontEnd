import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui';
import { useHandovers } from '../api';
import { BookTab } from '../components/BookTab';
import { HandoverTab } from '../components/HandoverTab';
import { IncidentsTab } from '../components/IncidentsTab';

const TAB_VALUES = ['handover', 'incidents', 'book'];

export default function DutyPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = TAB_VALUES.includes(requested) ? requested : 'handover';
  const setTab = (t) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });
  const { data: open } = useHandovers({ status: 'open', limit: 1 });

  const tabs = [
    { value: 'handover', label: 'Shift handover', count: open?.meta?.total },
    { value: 'incidents', label: 'Incidents' },
    { value: 'book', label: 'Daily register (OB)' },
  ];

  return (
    <div>
      <PageHeader title="Guard duty" description="Shift handovers, incident reports and the daily register (occurrence book)." />
      <Tabs className="mb-4" tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'handover' && <HandoverTab />}
      {tab === 'incidents' && <IncidentsTab />}
      {tab === 'book' && <BookTab />}
    </div>
  );
}
