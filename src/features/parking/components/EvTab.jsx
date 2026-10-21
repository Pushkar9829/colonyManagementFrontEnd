import { useMemo, useState } from 'react';
import { BatteryCharging, Pencil, Plus, Zap } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Select, Spinner } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { useT } from '../../../context/LanguageContext';
import { cn } from '../../../lib/cn';
import { date as fmtDate, label, money, toPaise, toRupees, todayISO } from '../../../lib/format';
import { UnitPicker } from '../../units/components/UnitPicker';
import { EV_STATUSES, toHHMM, toMin, TONES } from '../constants';
import {
  useBookCharger,
  useCancelEvBooking,
  useChargerAvailability,
  useChargers,
  useCompleteCharging,
  useCreateCharger,
  useEvBookings,
  useMyVehicles,
  useStartCharging,
  useUnitVehicles,
  useUpdateCharger,
} from '../api';

function ChargerModal({ charger, onClose }) {
  const { t } = useT();
  const editing = Boolean(charger?._id);
  const { values, bind, set, applyServerErrors } = useForm({
    name: charger?.name || '',
    location: charger?.location || '',
    connector: charger?.connector || '',
    powerKw: charger?.powerKw ?? '',
    rate: charger?.ratePerKwh !== undefined ? String(toRupees(charger.ratePerKwh)) : '',
    slotMinutes: String(charger?.slotMinutes || 60),
    openTime: charger?.openTime || '06:00',
    closeTime: charger?.closeTime || '22:00',
    maxHoursPerBooking: String(charger?.maxHoursPerBooking || 4),
    active: charger?.active !== false,
  });
  const create = useCreateCharger({ onSuccess: onClose });
  const update = useUpdateCharger({ onSuccess: onClose });
  const save = () => {
    const body = {
      name: values.name,
      location: values.location || undefined,
      connector: values.connector || undefined,
      powerKw: values.powerKw === '' ? undefined : Number(values.powerKw),
      ratePerKwh: values.rate === '' ? undefined : toPaise(values.rate),
      slotMinutes: Number(values.slotMinutes),
      openTime: values.openTime,
      closeTime: values.closeTime,
      maxHoursPerBooking: Number(values.maxHoursPerBooking),
    };
    if (editing) update.mutate({ id: charger._id, ...body, active: values.active }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };
  return (
    <Modal open onClose={onClose} title={editing ? t('Edit {name}', { name: charger.name }) : 'Add EV charger'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required placeholder="e.g. Charger 1" {...bind('name')} />
        <Input label="Location" placeholder="e.g. Basement 1, near lift" {...bind('location')} />
        <Input label="Connector" placeholder="Type 2, CCS2, 15A socket" {...bind('connector')} />
        <Input label="Power (kW)" type="number" min="0" step="0.1" {...bind('powerKw')} />
        <Input label="Rate (₹ per kWh)" type="number" min="0" step="0.01" {...bind('rate')} error={bind('ratePerKwh').error} />
        <Select label="Slot length" options={[15, 30, 60, 90, 120, 180, 240].map((m) => ({ value: String(m), label: t('{m} min', { m }) }))} {...bind('slotMinutes')} />
        <Input label="Opens at" type="time" {...bind('openTime')} />
        <Input label="Closes at" type="time" {...bind('closeTime')} />
        <Input label="Max hours per booking" type="number" min="1" max="24" {...bind('maxHoursPerBooking')} />
        {editing && <Checkbox className="self-end pb-2" label="Active (bookable)" checked={values.active} onChange={(e) => set('active', e.target.checked)} />}
      </div>
    </Modal>
  );
}

const overlaps = (s, e, booked) => booked.some((b) => s < toMin(b.endTime) && e > toMin(b.startTime));

function BookingPanel({ chargers, chargerId, setChargerId, staff, resident }) {
  const { t } = useT();
  const [day, setDay] = useState(todayISO());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [unit, setUnit] = useState('');
  const [vehicle, setVehicle] = useState('');
  const charger = chargers.find((c) => c._id === chargerId);
  const { data: avail, isLoading } = useChargerAvailability(charger?._id, day);
  const { data: myVehicles = [] } = useMyVehicles(resident);
  const { data: unitVehicles = [] } = useUnitVehicles(staff ? unit : '');
  const vehicles = resident ? myVehicles : unitVehicles;
  const booked = avail?.booked || [];
  const book = useBookCharger({ onSuccess: () => { setStart(''); setEnd(''); } });

  // Start/end choices come from the charger's open hours in slotMinutes steps, minus booked and past blocks.
  const { starts, ends } = useMemo(() => {
    if (!charger) return { starts: [], ends: [] };
    const open = toMin(charger.openTime);
    const close = toMin(charger.closeTime);
    const step = charger.slotMinutes || 60;
    const now = new Date();
    const nowMin = day === todayISO() ? now.getHours() * 60 + now.getMinutes() : -1;
    const s = [];
    for (let m = open; m + step <= close; m += step) if (m + step > nowMin && !overlaps(m, m + step, booked)) s.push(toHHMM(m));
    const e = [];
    if (start) {
      const sm = toMin(start);
      for (let m = sm + step; m <= close && m - sm <= (charger.maxHoursPerBooking || 4) * 60; m += step) {
        if (overlaps(sm, m, booked)) break;
        e.push(toHHMM(m));
      }
    }
    return { starts: s, ends: e };
  }, [charger, day, booked, start]);

  const est = charger && start && end ? t('up to ~{kwh} kWh', { kwh: Math.round(((toMin(end) - toMin(start)) / 60) * (charger.powerKw || 0) * 10) / 10 }) : null;

  if (!chargers.length) return null;
  return (
    <Card>
      <CardHeader title="Book a charger" subtitle={charger ? t('{open}–{close} · {minutes} min blocks · max {hours} h', { open: charger.openTime, close: charger.closeTime, minutes: charger.slotMinutes, hours: charger.maxHoursPerBooking }) : undefined} />
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Charger" options={chargers.map((c) => ({ value: c._id, label: c.name }))} value={chargerId} onChange={(e) => { setChargerId(e.target.value); setStart(''); setEnd(''); }} />
        <Input label="Date" type="date" min={todayISO()} value={day} onChange={(e) => { setDay(e.target.value); setStart(''); setEnd(''); }} />
        <Select label="Start" placeholder={starts.length ? 'Choose' : 'No free time'} options={starts} value={start} onChange={(e) => { setStart(e.target.value); setEnd(''); }} />
        <Select label="End" placeholder="Choose" options={ends} value={end} disabled={!start} onChange={(e) => setEnd(e.target.value)} />
        {staff && <UnitPicker label="For unit" required value={unit} onChange={(id) => { setUnit(id); setVehicle(''); }} />}
        {vehicles.length > 0 && (
          <Select label="Vehicle (optional)" placeholder="Not specified" options={vehicles.map((v) => ({ value: v._id, label: v.number }))} value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t('Booked on {date}', { date: fmtDate(day) })}</p>
        {isLoading ? (
          <Spinner className="size-5" />
        ) : !booked.length ? (
          <p className="text-sm text-emerald-700">{t('Free all day')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {booked.map((b) => (
              <span key={`${b.startTime}-${b.endTime}`} className={cn('rounded-md px-2 py-1 text-xs font-medium', b.mine ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700')}>
                {b.startTime}–{b.endTime}
                {b.mine ? ` · ${t('yours')}` : b.unit?.label ? ` · ${b.unit.label}` : ''}
                {b.status === 'charging' ? ` · ${t('charging')}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {charger?.ratePerKwh ? t('{rate} per kWh', { rate: money(charger.ratePerKwh) }) : t('Free to use')}
          {est && charger.powerKw ? ` · ${est}` : ''}
        </p>
        <Button
          icon={Zap}
          loading={book.isPending}
          disabled={!charger || !start || !end || (staff && !unit)}
          onClick={() => book.mutate({ charger: charger._id, date: day, startTime: start, endTime: end, vehicle: vehicle || undefined, unit: staff ? unit : undefined })}
        >
          Book
        </Button>
      </div>
    </Card>
  );
}

function CompleteModal({ booking, onClose }) {
  const { t } = useT();
  const [kwh, setKwh] = useState('');
  const complete = useCompleteCharging({ onSuccess: onClose });
  const rate = booking.charger?.ratePerKwh || 0;
  const estimate = kwh === '' ? null : Math.round(Number(kwh) * rate);
  return (
    <Modal open onClose={onClose} size="sm" title="Complete charging" description={`${booking.charger?.name} · ${booking.startTime}–${booking.endTime}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={complete.isPending} disabled={kwh === '' || Number(kwh) < 0} onClick={() => complete.mutate({ id: booking._id, kwh: Number(kwh) })}>Complete</Button></>}>
      <div className="space-y-3">
        <Input label="Energy used (kWh)" type="number" min="0" step="0.1" required autoFocus value={kwh} onChange={(e) => setKwh(e.target.value)} hint="Read it off the charger display" />
        <p className="text-sm text-slate-600">
          {t('Cost estimate:')} <span className="font-semibold text-slate-900">{estimate === null ? '—' : money(estimate)}</span>
          {rate ? <span className="text-slate-500"> ({money(rate)}/kWh)</span> : null}
        </p>
      </div>
    </Modal>
  );
}

function BookingsList({ resident, manager }) {
  const { t } = useT();
  const [filters, setFilters] = useState({ date: resident ? '' : todayISO(), status: '', page: 1 });
  const { data, isLoading } = useEvBookings({ ...filters, limit: 20 });
  const [completing, setCompleting] = useState(null);
  const startCharge = useStartCharging();
  const cancel = useCancelEvBooking();
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const busy = (m, id) => m.isPending && (m.variables === id || m.variables?.id === id);

  return (
    <Card>
      <CardHeader title={resident ? 'My charging bookings' : 'Charging bookings'} />
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Input type="date" value={filters.date} onChange={setF('date')} aria-label="Filter by date" />
        <Select placeholder="All statuses" options={EV_STATUSES} value={filters.status} onChange={setF('status')} />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !data?.data.length ? (
        <EmptyState icon={BatteryCharging} title="No bookings" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.data.map((b) => (
            <li key={b._id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {b.charger?.name} · {fmtDate(b.date)} · {b.startTime}–{b.endTime}
                </p>
                <p className="text-xs text-slate-500">
                  {!resident && b.unit?.label ? `${b.unit.label} · ` : ''}
                  {b.vehicle?.number ? `${b.vehicle.number} · ` : ''}
                  {b.charger?.location || ''}
                  {b.status === 'completed' && ` · ${t('{kwh} kWh · est. {cost}', { kwh: b.kwh ?? 0, cost: money(b.costEstimate) })}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONES[b.status]}>{t(label(b.status))}</Badge>
                {b.status === 'booked' && <Button size="sm" variant="secondary" loading={busy(startCharge, b._id)} onClick={() => startCharge.mutate(b._id)}>Start</Button>}
                {['booked', 'charging'].includes(b.status) && <Button size="sm" variant="success" onClick={() => setCompleting(b)}>Complete</Button>}
                {b.status === 'booked' && (resident || manager) && (
                  <Button size="sm" variant="ghost" loading={busy(cancel, b._id) && !cancel.variables?.noShow} onClick={() => window.confirm(t('Cancel this booking?')) && cancel.mutate({ id: b._id })}>Cancel</Button>
                )}
                {b.status === 'booked' && manager && (
                  <Button size="sm" variant="ghost" loading={busy(cancel, b._id) && cancel.variables?.noShow} onClick={() => window.confirm(t('Mark this booking as a no-show?')) && cancel.mutate({ id: b._id, noShow: true })}>No-show</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      {completing && <CompleteModal booking={completing} onClose={() => setCompleting(null)} />}
    </Card>
  );
}

// Who may do what mirrors parking.routes.js: residents & managers book/cancel, everyone starts/completes.
export function EvTab({ manager, resident }) {
  const { t } = useT();
  const { data: chargers = [], isLoading } = useChargers(manager ? { all: true } : {});
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState('');
  const bookable = chargers.filter((c) => c.active);
  const chargerId = selected || bookable[0]?._id || '';
  const canBook = resident || manager;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="EV chargers" action={manager && <Button size="sm" icon={Plus} onClick={() => setEditing({})}>Add charger</Button>} />
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !chargers.length ? (
          <EmptyState icon={Zap} title="No EV chargers yet" description={manager ? 'Add the society’s chargers so residents can book them.' : undefined} />
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {chargers.map((c) => (
              <li key={c._id} className={cn('rounded-lg border p-3', c._id === chargerId && canBook ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{c.name}</p>
                    {c.location && <p className="truncate text-xs text-slate-500">{c.location}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!c.active && <Badge>{t('Inactive')}</Badge>}
                    {manager && (
                      <button type="button" onClick={() => setEditing(c)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t('Edit {name}', { name: c.name })}>
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {[c.connector, c.powerKw ? `${c.powerKw} kW` : null, c.ratePerKwh ? `${money(c.ratePerKwh)}/kWh` : t('Free')].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-slate-500">{t('{open}–{close} · {minutes} min blocks · max {hours} h', { open: c.openTime, close: c.closeTime, minutes: c.slotMinutes, hours: c.maxHoursPerBooking })}</p>
                {canBook && c.active && c._id !== chargerId && (
                  <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={() => setSelected(c._id)}>Book this</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {canBook && <BookingPanel chargers={bookable} chargerId={chargerId} setChargerId={setSelected} staff={!resident} resident={resident} />}
      <BookingsList resident={resident} manager={manager} />
      {editing && <ChargerModal charger={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
