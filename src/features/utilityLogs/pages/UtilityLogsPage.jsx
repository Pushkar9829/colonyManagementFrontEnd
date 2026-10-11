import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Plus, Settings2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Select, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime, label, money, toPaise, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { addDays, clean, downloadFile, numOrUndef } from '../../assets/shared';
import { useCreatePoint, useCreateReading, usePoints, useReadings, useUtilitySummary } from '../api';

const KINDS = [
  { value: 'dg', label: 'DG sets' },
  { value: 'tank', label: 'Water tanks' },
  { value: 'stp', label: 'STP' },
  { value: 'wtp', label: 'WTP' },
  { value: 'meter', label: 'Electricity meters' },
  { value: 'pump', label: 'Pumps' },
];
const SHIFTS = ['morning', 'afternoon', 'evening', 'night'].map((v) => ({ value: v, label: label(v) }));
const fmt = (v, unit = '') => (v === undefined || v === null ? '—' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit}`);

function PointModal({ kind, open, onClose }) {
  const { values, bind, reset, applyServerErrors } = useForm({ name: '', location: '', capacity: '', openingDieselStock: '', openingHours: '', openingMeterReading: '' });
  const create = useCreatePoint({ onSuccess: () => { reset(); onClose(); } });
  const submit = () =>
    create.mutate({ kind, ...clean({ name: values.name, location: values.location, capacity: numOrUndef(values.capacity), openingDieselStock: numOrUndef(values.openingDieselStock), openingHours: numOrUndef(values.openingHours), openingMeterReading: numOrUndef(values.openingMeterReading) }) }, { onError: applyServerErrors });
  return (
    <Modal open={open} onClose={onClose} title={`Add ${KINDS.find((k) => k.value === kind)?.label.replace(/s$/, '')}`} description={['stp', 'wtp'].includes(kind) ? 'Standard parameters (pH, TDS…) with normal ranges are added; adjust later if needed.' : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Add</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required {...bind('name')} />
        <Input label="Location" {...bind('location')} />
        {['dg', 'tank'].includes(kind) && <Input label={kind === 'dg' ? 'Fuel tank capacity (L)' : 'Capacity (L)'} type="number" min="0" {...bind('capacity')} />}
        {kind === 'dg' && <Input label="Diesel in tank now (L)" type="number" min="0" step="any" {...bind('openingDieselStock')} />}
        {['dg', 'pump'].includes(kind) && <Input label="Hour meter now" type="number" min="0" step="any" {...bind('openingHours')} />}
        {kind === 'meter' && <Input label="Meter reading now (kWh)" type="number" min="0" step="any" {...bind('openingMeterReading')} />}
      </div>
    </Modal>
  );
}

function ReadingModal({ point, onClose }) {
  const { values, bind, set, applyServerErrors } = useForm({ date: todayISO(), shift: '', notes: '', hoursStart: '', hoursEnd: '', runHours: '', startTime: '', endTime: '', runMinutes: '', dieselFilled: '', dieselConsumed: '', dieselCost: '', levelPercent: '', levelLitres: '', meterReading: '', meterReset: false });
  const [params, setParams] = useState({});
  const create = useCreateReading({ onSuccess: onClose });
  if (!point) return null;
  const n = (k) => numOrUndef(values[k]);
  const submit = () => {
    const body = { point: point._id, date: values.date, shift: values.shift || undefined, notes: values.notes || undefined };
    if (point.kind === 'dg') Object.assign(body, { hoursStart: n('hoursStart'), hoursEnd: n('hoursEnd'), runHours: n('runHours'), dieselFilled: n('dieselFilled'), dieselConsumed: n('dieselConsumed'), dieselCost: values.dieselCost ? toPaise(values.dieselCost) : undefined });
    if (point.kind === 'pump') Object.assign(body, { hoursStart: n('hoursStart'), hoursEnd: n('hoursEnd'), startTime: values.startTime || undefined, endTime: values.endTime || undefined, runMinutes: n('runMinutes') });
    if (point.kind === 'tank') Object.assign(body, { levelPercent: n('levelPercent'), levelLitres: n('levelLitres') });
    if (point.kind === 'meter') Object.assign(body, { meterReading: n('meterReading'), meterReset: values.meterReset || undefined });
    if (['stp', 'wtp'].includes(point.kind)) body.values = Object.entries(params).filter(([, v]) => v !== '').map(([key, value]) => ({ key, value: Number(value) }));
    create.mutate(clean(body), { onError: applyServerErrors });
  };
  return (
    <Modal open onClose={onClose} title={`Log · ${point.name}`} description={point.kind === 'dg' ? `Diesel in tank: ${fmt(point.dieselStock, ' L')} · hour meter ${fmt(point.lastHours)}` : point.kind === 'meter' ? `Last reading: ${fmt(point.lastMeterReading, ' kWh')}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date" type="date" {...bind('date')} />
        <Select label="Shift" placeholder="—" options={SHIFTS} {...bind('shift')} />
        {['dg', 'pump'].includes(point.kind) && (
          <>
            <Input label="Hour meter start" type="number" step="any" placeholder={point.lastHours !== undefined && point.lastHours !== null ? String(point.lastHours) : ''} hint="Leave empty to use the last closing reading" {...bind('hoursStart')} />
            <Input label="Hour meter end" type="number" step="any" {...bind('hoursEnd')} />
          </>
        )}
        {point.kind === 'dg' && (
          <>
            <Input label="Or run hours" type="number" step="any" {...bind('runHours')} />
            <Input label="Diesel used (L)" type="number" min="0" step="any" {...bind('dieselConsumed')} />
            <Input label="Diesel filled (L)" type="number" min="0" step="any" {...bind('dieselFilled')} />
            <Input label="Fill cost (₹)" type="number" min="0" step="0.01" {...bind('dieselCost')} />
          </>
        )}
        {point.kind === 'pump' && (
          <>
            <Input label="Started at" type="time" {...bind('startTime')} />
            <Input label="Stopped at" type="time" {...bind('endTime')} />
            <Input label="Or run minutes" type="number" min="0" {...bind('runMinutes')} />
          </>
        )}
        {point.kind === 'tank' && (
          <>
            <Input label="Level (%)" type="number" min="0" max="100" step="any" {...bind('levelPercent')} />
            {point.capacity ? <Input label="Or level (litres)" type="number" min="0" step="any" {...bind('levelLitres')} /> : null}
          </>
        )}
        {point.kind === 'meter' && (
          <>
            <Input label="Reading (kWh)" type="number" min="0" step="any" required {...bind('meterReading')} />
            <Checkbox className="self-end" label="Meter replaced / reset" checked={values.meterReset} onChange={(e) => set('meterReset', e.target.checked)} />
          </>
        )}
        {['stp', 'wtp'].includes(point.kind) && point.parameters.map((p) => (
          <Input key={p.key} label={`${p.label}${p.unit ? ` (${p.unit})` : ''}`} type="number" step="any"
            hint={[p.min !== undefined && p.min !== null ? `min ${p.min}` : null, p.max !== undefined && p.max !== null ? `max ${p.max}` : null].filter(Boolean).join(' · ') || undefined}
            value={params[p.key] ?? ''} onChange={(e) => setParams((x) => ({ ...x, [p.key]: e.target.value }))} />
        ))}
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
      </div>
    </Modal>
  );
}

function readingText(r) {
  switch (r.kind) {
    case 'dg':
      return [r.runHours !== undefined && r.runHours !== null ? `${fmt(r.runHours)} h run` : null, r.dieselConsumed ? `${fmt(r.dieselConsumed)} L used` : null, r.dieselFilled ? `${fmt(r.dieselFilled)} L filled` : null, `stock ${fmt(r.dieselStock, ' L')}`].filter(Boolean).join(' · ');
    case 'pump':
      return `${fmt(r.runMinutes)} min`;
    case 'tank':
      return `${fmt(r.levelPercent, '%')}${r.levelLitres ? ` (${fmt(r.levelLitres, ' L')})` : ''}`;
    case 'meter':
      return `${fmt(r.meterReading, ' kWh')}${r.consumption !== undefined && r.consumption !== null ? ` · +${fmt(r.consumption)}` : ''}`;
    default:
      return (r.values || []).map((v) => `${v.label} ${fmt(v.value)}`).join(' · ');
  }
}

const SUMMARY_COLS = {
  dg: [{ key: 'runHours', header: 'Run hours', render: (r) => fmt(r.runHours) }, { key: 'dieselConsumed', header: 'Used (L)', render: (r) => fmt(r.dieselConsumed) }, { key: 'dieselFilled', header: 'Filled (L)', render: (r) => fmt(r.dieselFilled) }, { key: 'dieselCost', header: 'Fill cost', render: (r) => (r.dieselCost ? money(r.dieselCost) : '—') }, { key: 'closingStock', header: 'Closing (L)', render: (r) => fmt(r.closingStock) }],
  pump: [{ key: 'runMinutes', header: 'Run time', render: (r) => `${Math.floor(r.runMinutes / 60)}h ${r.runMinutes % 60}m` }],
  tank: [{ key: 'levelMin', header: 'Min', render: (r) => fmt(r.levelMin, '%') }, { key: 'levelAvg', header: 'Avg', render: (r) => fmt(r.levelAvg, '%') }, { key: 'levelMax', header: 'Max', render: (r) => fmt(r.levelMax, '%') }],
  meter: [{ key: 'consumption', header: 'Consumption (kWh)', render: (r) => fmt(r.consumption) }, { key: 'closingReading', header: 'Closing reading', render: (r) => fmt(r.closingReading) }],
  stp: [{ key: 'parameters', header: 'Averages', className: 'whitespace-normal', render: (r) => r.parameters.map((p) => `${p.label} ${fmt(p.avg)}`).join(' · ') }, { key: 'outOfRange', header: 'Out of range', render: (r) => (r.outOfRange ? <Badge tone="red">{r.outOfRange}</Badge> : 0) }],
};
SUMMARY_COLS.wtp = SUMMARY_COLS.stp;

function KindPanel({ kind, manager }) {
  const toast = useToast();
  const { data: points, isLoading } = usePoints({ kind, active: true });
  const [logPoint, setLogPoint] = useState(null);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState('day');
  const [range, setRange] = useState({ from: addDays(todayISO(), -29), to: todayISO() });
  const readings = useReadings({ kind, page, limit: 15 });
  const summary = useUtilitySummary({ kind, groupBy, ...range }, manager);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Log points" action={manager && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAdding(true)}>Add</Button>} />
        {!isLoading && !points?.length ? <EmptyState icon={Settings2} title="Nothing to log yet" description={manager ? 'Add the equipment staff take readings from.' : 'Ask the facility manager to set this up.'} /> : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {(points || []).map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.kind === 'dg' ? `Diesel ${fmt(p.dieselStock, ' L')}${p.capacity ? ` / ${fmt(p.capacity)}` : ''}` : p.kind === 'meter' ? `Last ${fmt(p.lastMeterReading, ' kWh')}` : p.location || label(p.kind)}
                    {p.lastReadingAt ? ` · ${dateTime(p.lastReadingAt)}` : ''}
                  </p>
                </div>
                <Button size="sm" onClick={() => setLogPoint(p)}>Log</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent readings" />
        <Table loading={readings.isLoading} rows={readings.data?.data} empty="No readings yet"
          columns={[
            { key: 'date', header: 'Date', render: (r) => <div><p>{date(r.date)}</p><p className="text-xs text-slate-400">{r.shift ? label(r.shift) : dateTime(r.at)}</p></div> },
            { key: 'point', header: 'Point', render: (r) => r.point?.name },
            { key: 'value', header: 'Reading', className: 'whitespace-normal', render: (r) => <span className="flex items-center gap-2">{readingText(r)}{r.outOfRange && <Badge tone="red">Out of range</Badge>}</span> },
            { key: 'by', header: 'By', render: (r) => r.recordedBy?.name || '—' },
            { key: 'notes', header: 'Notes', className: 'max-w-xs truncate', render: (r) => r.notes || '' },
          ]} />
        <Pagination meta={readings.data?.meta} onPage={setPage} />
      </Card>

      {manager && (
        <Card>
          <CardHeader title={groupBy === 'month' ? 'Monthly summary' : 'Daily summary'} action={<Button size="sm" variant="secondary" icon={Download} onClick={() => downloadFile('/utility-logs/export', { kind, groupBy, ...range }, `utility-${kind}.xlsx`).catch((e) => toast.error(e))}>Excel</Button>} />
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
            <Select options={[{ value: 'day', label: 'By day' }, { value: 'month', label: 'By month' }]} value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setRange({ from: addDays(todayISO(), e.target.value === 'month' ? -364 : -29), to: todayISO() }); }} />
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
          <Table loading={summary.isLoading} rows={(summary.data?.rows || []).map((r) => ({ ...r, _id: `${r.period}-${r.point._id}` }))} empty="No readings in this range"
            columns={[
              { key: 'period', header: groupBy === 'month' ? 'Month' : 'Date' },
              { key: 'point', header: 'Point', render: (r) => r.point.name },
              { key: 'readings', header: 'Entries' },
              ...SUMMARY_COLS[kind],
            ]} />
        </Card>
      )}
      <PointModal kind={kind} open={adding} onClose={() => setAdding(false)} />
      {logPoint && <ReadingModal point={logPoint} onClose={() => setLogPoint(null)} />}
    </div>
  );
}

export default function UtilityLogsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') || 'dg';
  return (
    <div>
      <PageHeader title="Utility logs" description="Shift readings for DG sets, water tanks, treatment plants, meters and pumps." />
      <Tabs className="mb-4" value={kind} onChange={(k) => setParams({ kind: k })} tabs={KINDS} />
      <KindPanel key={kind} kind={kind} manager={isManager(user)} />
    </div>
  );
}
