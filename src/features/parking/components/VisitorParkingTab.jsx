import { useState } from 'react';
import { Car, LogOut, Plus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Select, Spinner } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { useT } from '../../../context/LanguageContext';
import { cn } from '../../../lib/cn';
import { dateTime, time } from '../../../lib/format';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { UnitPicker } from '../../units/components/UnitPicker';
import { isOverstay, slotTypeLabel, VISITOR_HOURS } from '../constants';
import { useEndVisitorParking, useParkingSlots, useStartVisitorParking, useVisitorSessions } from '../api';

function ParkVisitorModal({ freeSlots, slot, onClose }) {
  const { values, bind, set, applyServerErrors } = useForm({ slot: slot?._id || freeSlots[0]?._id || '', vehicleNumber: '', hours: '2' });
  const [unit, setUnit] = useState('');
  const start = useStartVisitorParking({ onSuccess: onClose });
  const save = () => start.mutate({ slot: values.slot, vehicleNumber: values.vehicleNumber, hours: Number(values.hours), unit: unit || undefined }, { onError: applyServerErrors });
  return (
    <Modal open onClose={onClose} title="Park a visitor car"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={start.isPending} disabled={!values.slot || !values.vehicleNumber} onClick={save}>Park</Button></>}>
      {!freeSlots.length ? (
        <EmptyState icon={Car} title="No free visitor slots" description="Every visitor slot is occupied right now." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Slot" required options={freeSlots.map((s) => ({ value: s._id, label: `${s.number} · ${s.area?.name || ''} · ${slotTypeLabel(s.type)}` }))} {...bind('slot')} />
          <Input label="Vehicle number" required placeholder="MH12AB1234" autoCapitalize="characters" {...bind('vehicleNumber')} onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())} />
          <Select label="Expected stay" options={VISITOR_HOURS} {...bind('hours')} />
          <UnitPicker label="Visiting unit (optional)" value={unit} onChange={(id) => setUnit(id)} />
        </div>
      )}
    </Modal>
  );
}

const overBy = (d, t) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return mins < 60 ? t('{m} min', { m: mins }) : t('{h} h {m} min', { h: Math.floor(mins / 60), m: mins % 60 });
};

function SlotTile({ s, onPark, onEnd, ending }) {
  const { t } = useT();
  const v = s.occupiedBy;
  const over = isOverstay(v);
  return (
    <li className={cn('flex flex-col justify-between gap-2 rounded-lg border p-3', !v ? 'border-emerald-200 bg-emerald-50/40' : over ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-slate-900">{s.number}</p>
          <p className="truncate text-xs text-slate-500">{s.area?.name} · {slotTypeLabel(s.type)}</p>
        </div>
        {!v ? <Badge tone="green">{t('Free')}</Badge> : over ? <Badge tone="red">{t('Overstay')}</Badge> : <Badge tone="amber">{t('Occupied')}</Badge>}
      </div>
      {v ? (
        <>
          <div className="text-sm">
            <p className="font-mono font-semibold text-slate-900">{v.vehicleNumber}</p>
            <p className={cn('text-xs', over ? 'font-medium text-red-700' : 'text-slate-500')}>
              {t('Out by {time}', { time: time(v.expectedOutAt) })}{over ? ` · ${t('{duration} over', { duration: overBy(v.expectedOutAt, t) })}` : ''}
            </p>
            {v.unit?.label && <p className="text-xs text-slate-500">{t('Visiting {unit}', { unit: v.unit.label })}</p>}
          </div>
          <Button size="sm" variant={over ? 'danger' : 'secondary'} icon={LogOut} loading={ending} onClick={() => onEnd(v)}>Car left</Button>
        </>
      ) : (
        s.active && <Button size="sm" variant="secondary" icon={Plus} onClick={() => onPark(s)}>Park here</Button>
      )}
    </li>
  );
}

export function VisitorParkingTab() {
  const { t } = useT();
  const live = useLiveInterval(15000);
  const { data: slotsData, isLoading } = useParkingSlots({ pool: 'visitor', active: true, limit: 100 }, { refetchInterval: live });
  const [overstay, setOverstay] = useState(false);
  const [page, setPage] = useState(1);
  const { data: sessions, isLoading: sessionsLoading } = useVisitorSessions({ status: 'active', overstay: overstay || undefined, page, limit: 20 }, { refetchInterval: live });
  const [parking, setParking] = useState(null);
  const end = useEndVisitorParking();
  const slots = slotsData?.data || [];
  const free = slots.filter((s) => !s.occupiedBy);
  const endSession = (v) => window.confirm(t('Mark {vehicle} as left?', { vehicle: v.vehicleNumber })) && end.mutate(v._id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Visitor slots"
          subtitle={t('{free} free of {total}', { free: free.length, total: slots.length })}
          action={<Button size="sm" icon={Plus} disabled={!free.length} onClick={() => setParking({})}>Park visitor</Button>}
        />
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !slots.length ? (
          <EmptyState icon={Car} title="No visitor slots" description="A facility manager can add slots to the visitor pool from the Slots tab." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 p-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {slots.map((s) => (
              <SlotTile key={s._id} s={s} onPark={setParking} onEnd={endSession} ending={end.isPending && end.variables === s.occupiedBy?._id} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Active sessions" action={<Checkbox label="Overstays only" checked={overstay} onChange={(e) => { setOverstay(e.target.checked); setPage(1); }} />} />
        {sessionsLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !sessions?.data.length ? (
          <EmptyState title={overstay ? 'No overstaying cars' : 'No visitor cars parked'} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.data.map((v) => {
              const over = isOverstay(v);
              return (
                <li key={v._id} className={cn('flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between', over && 'bg-red-50')}>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      <span className="font-mono">{v.vehicleNumber}</span>
                      <span className="text-slate-500"> · {t('slot {number}', { number: v.slot?.number })}{v.slot?.area?.name ? ` (${v.slot.area.name})` : ''}</span>
                    </p>
                    <p className={cn('text-xs', over ? 'font-medium text-red-700' : 'text-slate-500')}>
                      {t('In {in} · out by {out}', { in: dateTime(v.inAt), out: dateTime(v.expectedOutAt) })}
                      {v.unit?.label ? ` · ${t('visiting {unit}', { unit: v.unit.label })}` : ''}
                      {v.visitor?.name ? ` · ${v.visitor.name}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant={over ? 'danger' : 'secondary'} icon={LogOut} className="self-start sm:self-auto" loading={end.isPending && end.variables === v._id} onClick={() => endSession(v)}>
                    Car left
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination meta={sessions?.meta} onPage={setPage} />
      </Card>
      {parking && <ParkVisitorModal freeSlots={free} slot={parking._id ? parking : null} onClose={() => setParking(null)} />}
    </div>
  );
}
