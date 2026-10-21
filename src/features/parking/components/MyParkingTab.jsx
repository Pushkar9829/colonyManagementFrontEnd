import { AlertTriangle, BatteryCharging, Car, SquareParking } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Spinner } from '../../../components/ui';
import { date as fmtDate, label } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { slotTypeLabel, TONES } from '../constants';
import { useMyParking } from '../api';
import { ViolationRow } from './ViolationsTab';

const vehicleType = (t) => (t === 'two_wheeler' ? '2W' : t === 'four_wheeler' ? '4W' : 'Other');

export function MyParkingTab({ onTab }) {
  const { t } = useT();
  const { data, isLoading, error, refetch } = useMyParking();
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;
  const { slots = [], vehicles = [], violations = [], evBookings = [] } = data || {};

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="My parking slots" />
        {!slots.length ? (
          <EmptyState icon={SquareParking} title="No slot allotted" description="Contact the management office to get a parking slot." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {slots.map((s) => (
              <li key={s._id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-lg font-semibold text-slate-900">{s.number}</p>
                    <p className="text-xs text-slate-500">
                      {s.area?.name}{s.area?.level ? ` · ${t('level {level}', { level: s.area.level })}` : ''} · {slotTypeLabel(s.type)}{s.covered ? ` · ${t('covered')}` : ''}
                    </p>
                  </div>
                  {!s.active && <Badge>{t('Inactive')}</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {s.vehicles?.length ? s.vehicles.map((v) => `${v.number}${v.make ? ` (${v.make})` : ''}`).join(', ') : t('No vehicle linked yet')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="My vehicles" />
        {!vehicles.length ? (
          <EmptyState icon={Car} title="No vehicles registered" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {vehicles.map((v) => (
              <li key={v._id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-slate-900">{v.number}</p>
                  <p className="truncate text-xs text-slate-500">{[t(vehicleType(v.type)), v.make, v.color].filter(Boolean).join(' · ')}</p>
                </div>
                {v.parkingSlot ? <Badge tone="green">{t('Slot {slot}', { slot: v.parkingSlot })}</Badge> : <Badge>{t('No slot')}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Open violations" action={<Button size="sm" variant="ghost" onClick={() => onTab('violations')}>View all</Button>} />
        {!violations.length ? (
          <EmptyState icon={AlertTriangle} title="No open violations" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {violations.map((v) => <ViolationRow key={v._id} v={v} />)}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Upcoming EV charging" action={<Button size="sm" variant="ghost" onClick={() => onTab('ev')}>Book</Button>} />
        {!evBookings.length ? (
          <EmptyState icon={BatteryCharging} title="No upcoming bookings" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {evBookings.map((b) => (
              <li key={b._id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{b.charger?.name}</p>
                  <p className="text-xs text-slate-500">{fmtDate(b.date)} · {b.startTime}–{b.endTime}{b.charger?.location ? ` · ${b.charger.location}` : ''}</p>
                </div>
                <Badge tone={TONES[b.status]}>{t(label(b.status))}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
