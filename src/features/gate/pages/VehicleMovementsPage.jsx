import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Car } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, EmptyState, FilterBar, Input, Pagination, Select, Spinner } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { dateTime, dayBounds, label } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import { useMovements } from '../api';
import { useGates } from '../../gates/api';
import { ManualLog } from '../components/ManualLog';
import { BarrierControl } from '../components/BarrierControl';

const MATCH_TONE = { resident: 'green', visitor: 'blue', unknown: 'amber', blocked: 'red', watch: 'amber' };
const MATCH_LABEL = { resident: 'Registered', visitor: 'Visitor', unknown: 'Unknown', blocked: 'Blocked', watch: 'Watchlist' };

export default function VehicleMovementsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [f, setF] = useState({ match: params.get('match') || '', direction: '', source: '', gate: '', plate: '', date: '', page: 1 });
  const { data: gates = [] } = useGates({ includeInactive: true });
  const live = useLiveInterval(10000);
  const { data, isLoading } = useMovements(
    { match: f.match || undefined, direction: f.direction || undefined, source: f.source || undefined, gate: f.gate || undefined, plate: f.plate || undefined, page: f.page, limit: 25, ...(f.date ? dayBounds(f.date) : {}) },
    { refetchInterval: live },
  );
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));
  const guard = hasRole(user, ROLES.GUARD, ROLES.FACILITY_MANAGER);
  const rows = data?.data || [];

  return (
    <div>
      <PageHeader title="Vehicle movements" description="Every car and bike seen at the gates — number-plate cameras, RFID tags, guard checks and visitor entries." />
      {/* Phones: "Check a vehicle" comes first, the log below. Wide screens: log on the left, tools on the right. */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:grid-rows-[auto_1fr]">
        {guard && <div className="xl:col-start-2 xl:row-start-1 xl:self-start"><ManualLog /></div>}
        <Card className="min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <FilterBar
            cols={5}
            active={[f.date, f.match, f.direction, f.source, f.gate].filter(Boolean).length}
            search={<Input label="Plate" placeholder="MH12AB1234" value={f.plate} onChange={set('plate')} />}
          >
            <Input label="Date" type="date" value={f.date} onChange={set('date')} />
            <Select label="Vehicle" value={f.match} onChange={set('match')} placeholder="All vehicles" options={Object.entries(MATCH_LABEL).map(([value, l]) => ({ value, label: l }))} />
            <Select label="Direction" value={f.direction} onChange={set('direction')} placeholder="In & out" options={[{ value: 'in', label: 'In' }, { value: 'out', label: 'Out' }]} />
            <Select label="Source" value={f.source} onChange={set('source')} placeholder="All sources" options={['anpr', 'rfid', 'manual', 'visitor'].map((v) => ({ value: v, label: v === 'anpr' ? 'Camera (ANPR)' : v === 'rfid' ? 'RFID' : label(v) }))} />
            {gates.length > 1 && <Select label="Gate" value={f.gate} onChange={set('gate')} placeholder="All gates" options={gates.map((g) => ({ value: g._id, label: g.active ? g.name : `${g.name} (closed)` }))} />}
          </FilterBar>
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !rows.length ? (
            <EmptyState icon={Car} title="No movements" description={f.plate || f.date || f.match || f.direction || f.source || f.gate ? 'Nothing matches these filters.' : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((m) => (
                <li key={m._id} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${m.decision === 'deny' ? 'bg-red-50/50' : ''}`}>
                  <div className="flex items-center gap-3 sm:w-56">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${m.direction === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`} title={m.direction === 'in' ? 'In' : 'Out'}>
                      {m.direction === 'in' ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono font-semibold text-slate-900">{m.plate || m.tag || '—'}</p>
                      <p className="text-xs text-slate-400">{dateTime(m.occurredAt)}</p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={MATCH_TONE[m.match]}>{MATCH_LABEL[m.match]}</Badge>
                      <Badge tone={m.decision === 'allow' ? 'green' : 'red'}>{m.decision === 'allow' ? 'Allowed' : 'Denied'}</Badge>
                      <span className="text-xs text-slate-500">{m.gate} · {m.source === 'anpr' ? 'Camera' : m.source === 'rfid' ? `RFID${m.tag ? ` ${m.tag}` : ''}` : label(m.source)}</span>
                    </div>
                    <p className="truncate text-slate-600">
                      {m.reason}
                      {m.unit ? ` · ${m.unit.label}` : ''}
                      {m.vehicle?.make ? ` · ${m.vehicle.make}` : ''}
                      {m.device ? ` · ${m.device.name}` : m.loggedBy ? ` · ${m.loggedBy.name}` : ''}
                    </p>
                  </div>
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline">Camera image</a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
        </Card>
        {guard && <div className="xl:col-start-2 xl:row-start-2 xl:self-start"><BarrierControl /></div>}
      </div>
    </div>
  );
}
