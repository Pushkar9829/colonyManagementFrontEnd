import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, FilterBar, Input, Modal, Pagination, Select, Spinner, Table, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { UnitPicker } from '../../units/components/UnitPicker';
import { POOLS, SLOT_TYPES, slotTypeLabel } from '../constants';
import {
  useAllotSlot,
  useCreateArea,
  useCreateSlots,
  useDeleteArea,
  useDeleteSlot,
  useParkingAreas,
  useParkingSlots,
  useReleaseSlot,
  useUnitVehicles,
  useUpdateArea,
  useUpdateSlot,
} from '../api';

function AreaModal({ area, onClose }) {
  const editing = Boolean(area?._id);
  const { values, bind, applyServerErrors } = useForm({ name: area?.name || '', level: area?.level || '', description: area?.description || '' });
  const create = useCreateArea({ onSuccess: onClose });
  const update = useUpdateArea({ onSuccess: onClose });
  const save = () => {
    const body = { name: values.name, level: values.level || undefined, description: values.description || undefined };
    if (editing) update.mutate({ id: area._id, ...body }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };
  return (
    <Modal open onClose={onClose} title={editing ? 'Edit parking area' : 'Add parking area'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required placeholder="e.g. Basement 1" {...bind('name')} />
        <Input label="Level" placeholder="e.g. B1, Stilt" {...bind('level')} />
        <Textarea className="sm:col-span-2" label="Description" rows={2} {...bind('description')} />
      </div>
    </Modal>
  );
}

function AreasCard({ areas, isLoading }) {
  const [editing, setEditing] = useState(null);
  const remove = useDeleteArea();
  return (
    <Card className="mb-4">
      <CardHeader title="Parking areas" subtitle="Basements, stilts and open lots" action={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setEditing({})}>Add area</Button>} />
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !areas.length ? (
        <EmptyState title="No parking areas yet" description="Add an area first, then add its slots." />
      ) : (
        <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <li key={a._id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{a.name}</p>
                  {a.level && <p className="text-xs text-slate-500">Level {a.level}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => setEditing(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${a.name}`}><Pencil className="size-4" /></button>
                  <button type="button" disabled={remove.isPending} onClick={() => window.confirm(`Remove area ${a.name}?`) && remove.mutate(a._id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${a.name}`}><Trash2 className="size-4" /></button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {a.slots} slots · {a.allotted} allotted · {a.visitorSlots} visitor
              </p>
            </li>
          ))}
        </ul>
      )}
      {editing && <AreaModal area={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function AddSlotsModal({ areas, onClose }) {
  const [mode, setMode] = useState('single');
  const { values, bind, set, applyServerErrors } = useForm({ area: areas[0]?._id || '', number: '', prefix: '', from: '1', to: '10', type: 'four_wheeler', covered: false, pool: 'resident', notes: '' });
  const create = useCreateSlots({ onSuccess: onClose });
  const save = () => {
    const base = { area: values.area, type: values.type, covered: values.covered, pool: values.pool, notes: values.notes || undefined };
    const body = mode === 'single' ? { ...base, number: values.number } : { ...base, prefix: values.prefix || undefined, from: Number(values.from), to: Number(values.to) };
    create.mutate(body, { onError: applyServerErrors });
  };
  const count = Math.max(0, Number(values.to) - Number(values.from) + 1);
  return (
    <Modal open onClose={onClose} title="Add slots" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} disabled={!values.area} onClick={save}>Add</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select className="sm:col-span-2" label="Area" required placeholder="Choose area" options={areas.map((a) => ({ value: a._id, label: a.name }))} {...bind('area')} />
        <Select className="sm:col-span-2" label="How many" value={mode} onChange={(e) => setMode(e.target.value)} options={[{ value: 'single', label: 'A single slot' }, { value: 'range', label: 'A numbered range' }]} />
        {mode === 'single' ? (
          <Input className="sm:col-span-2" label="Slot number" required placeholder="e.g. B1-12" {...bind('number')} />
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Input label="Prefix" placeholder="B1-" {...bind('prefix')} />
            <Input label="From" type="number" min="0" {...bind('from')} error={bind('number').error} />
            <Input label="To" type="number" min="0" {...bind('to')} />
            <p className="col-span-3 text-xs text-slate-500">
              {count > 0 ? `Creates ${count} slot${count === 1 ? '' : 's'}: ${values.prefix}${values.from} … ${values.prefix}${values.to}` : 'The range end must be after the start'}
            </p>
          </div>
        )}
        <Select label="Type" options={SLOT_TYPES} {...bind('type')} />
        <Select label="Type" options={POOLS} {...bind('pool')} />
        <Checkbox className="sm:col-span-2" label="Covered" checked={values.covered} onChange={(e) => set('covered', e.target.checked)} />
        <Input className="sm:col-span-2" label="Notes" {...bind('notes')} />
      </div>
    </Modal>
  );
}

function EditSlotModal({ slot, areas, onClose }) {
  const { values, bind, set, applyServerErrors } = useForm({
    area: slot.area?._id || '',
    number: slot.number,
    type: slot.type,
    covered: Boolean(slot.covered),
    pool: slot.pool,
    notes: slot.notes || '',
    active: slot.active !== false,
  });
  const update = useUpdateSlot({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`Edit slot ${slot.number}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={update.isPending} onClick={() => update.mutate({ id: slot._id, ...values }, { onError: applyServerErrors })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Number" required {...bind('number')} />
        <Select label="Area" options={areas.map((a) => ({ value: a._id, label: a.name }))} {...bind('area')} />
        <Select label="Type" options={SLOT_TYPES} {...bind('type')} />
        <Select label="Type" options={POOLS} {...bind('pool')} hint={slot.unit ? 'Release the slot before making it a visitor slot' : undefined} />
        <Input className="sm:col-span-2" label="Notes" {...bind('notes')} />
        <Checkbox label="Covered" checked={values.covered} onChange={(e) => set('covered', e.target.checked)} />
        <Checkbox label="In use (uncheck to deactivate)" checked={values.active} onChange={(e) => set('active', e.target.checked)} />
      </div>
    </Modal>
  );
}

// A two-wheeler bay only takes two-wheelers; everything else fits larger bays (mirrors the API check).
const fits = (slotType, vehicleType) => !(slotType === 'two_wheeler' && vehicleType !== 'two_wheeler');

function AllotModal({ slot, onClose }) {
  const [unit, setUnit] = useState(slot.unit?._id || '');
  const [picked, setPicked] = useState(() => (slot.vehicles || []).map((v) => v._id));
  const { data: vehicles = [], isLoading } = useUnitVehicles(unit);
  const allot = useAllotSlot({ onSuccess: onClose });
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Modal open onClose={onClose} title={slot.unit ? `Slot ${slot.number} · ${slot.unit.label}` : `Allot slot ${slot.number}`} description={`${slotTypeLabel(slot.type)}${slot.covered ? ' · covered' : ''} · ${slot.area?.name || ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={allot.isPending} disabled={!unit} onClick={() => allot.mutate({ id: slot._id, unit, vehicles: picked })}>{slot.unit ? 'Save' : 'Allot'}</Button></>}>
      <div className="space-y-4">
        <UnitPicker required value={unit} initialLabel={slot.unit?.label || ''} onChange={(id) => { setUnit(id); setPicked([]); }} />
        {unit && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Link vehicles <span className="font-normal text-slate-500">(optional, up to 5)</span></p>
            {isLoading ? (
              <Spinner className="size-5" />
            ) : !vehicles.length ? (
              <p className="text-sm text-slate-500">This unit has no registered vehicles.</p>
            ) : (
              <ul className="space-y-2">
                {vehicles.map((v) => {
                  const ok = fits(slot.type, v.type);
                  return (
                    <li key={v._id}>
                      <Checkbox
                        checked={picked.includes(v._id)}
                        disabled={!ok || (!picked.includes(v._id) && picked.length >= 5)}
                        onChange={() => toggle(v._id)}
                        label={
                          <span className={ok ? '' : 'text-slate-400'}>
                            <span className="font-mono font-semibold">{v.number}</span> · {v.type === 'two_wheeler' ? '2W' : v.type === 'four_wheeler' ? '4W' : 'Other'}
                            {v.make ? ` · ${v.make}` : ''}
                            {v.parkingSlot && v.parkingSlot !== slot.number ? ` · in ${v.parkingSlot}` : ''}
                            {!ok && ' · does not fit'}
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function SlotActions({ s, onAllot, onEdit }) {
  const release = useReleaseSlot();
  const remove = useDeleteSlot();
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {s.pool === 'resident' && s.active && <Button size="sm" variant="secondary" onClick={() => onAllot(s)}>{s.unit ? 'Vehicles' : 'Allot'}</Button>}
      {s.unit && (
        <Button size="sm" variant="ghost" loading={release.isPending && release.variables === s._id} onClick={() => window.confirm(`Release slot ${s.number} from ${s.unit.label}?`) && release.mutate(s._id)}>
          Release
        </Button>
      )}
      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(s)} aria-label={`Edit slot ${s.number}`}>Edit</Button>
      {!s.unit && (
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" icon={Trash2} loading={remove.isPending && remove.variables === s._id} onClick={() => window.confirm(`Delete slot ${s.number}? This cannot be undone.`) && remove.mutate(s._id)} aria-label={`Delete slot ${s.number}`} title="Delete slot" />
      )}
    </div>
  );
}

// Slots are either reserved for flats ("resident" pool) or kept for visitors.
const POOL_FILTER = [
  { value: 'resident', label: 'Reserved (for flats)' },
  { value: 'visitor', label: 'Visitor' },
];

const occupant = (s) =>
  s.pool === 'visitor' ? (
    <Badge tone="blue">Visitor parking</Badge>
  ) : s.unit ? (
    <span className="font-medium text-slate-900">{s.unit.label}</span>
  ) : (
    <Badge tone="green">Free</Badge>
  );

export function SlotsTab() {
  const { data: areas = [], isLoading: areasLoading } = useParkingAreas();
  const [filters, setFilters] = useState({ area: '', pool: '', type: '', status: '', search: '', page: 1 });
  const { data, isLoading } = useParkingSlots({ ...filters, limit: 25 });
  const [adding, setAdding] = useState(false);
  const [allotting, setAllotting] = useState(null);
  const [editing, setEditing] = useState(null);
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const rows = data?.data || [];

  return (
    <div>
      <AreasCard areas={areas} isLoading={areasLoading} />
      <Card>
        <CardHeader title="Slots" subtitle={data?.meta ? `${data.meta.total} slots` : undefined} action={<Button size="sm" icon={Plus} disabled={!areas.length} onClick={() => setAdding(true)}>Add slots</Button>} />
        <FilterBar cols={5} active={[filters.area, filters.pool, filters.type, filters.status].filter(Boolean).length}
          search={<Input label="Slot number" placeholder="Search number" value={filters.search} onChange={setF('search')} />}>
          <Select label="Area" placeholder="All areas" options={areas.map((a) => ({ value: a._id, label: a.name }))} value={filters.area} onChange={setF('area')} />
          <Select label="Type" placeholder="Reserved and visitor" options={POOL_FILTER} value={filters.pool} onChange={setF('pool')} />
          <Select label="Vehicle" placeholder="All vehicles" options={SLOT_TYPES} value={filters.type} onChange={setF('type')} />
          <Select label="Status" placeholder="Any status" options={[{ value: 'free', label: 'Free' }, { value: 'allotted', label: 'Allotted' }]} value={filters.status} onChange={setF('status')} />
        </FilterBar>

        {/* Phones get stacked cards; the table needs more room than 375px. */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !rows.length ? (
            <EmptyState title="No slots match" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((s) => (
                <li key={s._id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono font-semibold text-slate-900">{s.number}</p>
                      <p className="text-xs text-slate-500">{s.area?.name} · {slotTypeLabel(s.type)}{s.covered ? ' · covered' : ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {occupant(s)}
                      {!s.active && <Badge>Inactive</Badge>}
                    </div>
                  </div>
                  {s.vehicles?.length > 0 && <p className="text-xs text-slate-600">{s.vehicles.map((v) => v.number).join(', ')}</p>}
                  <SlotActions s={s} onAllot={setAllotting} onEdit={setEditing} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hidden sm:block">
          <Table
            loading={isLoading}
            rows={rows}
            empty="No slots match"
            columns={[
              { key: 'number', header: 'Slot', render: (s) => <span className="font-mono font-semibold text-slate-900">{s.number}</span> },
              { key: 'area', header: 'Area', render: (s) => s.area?.name || '—' },
              { key: 'type', header: 'Type', render: (s) => <>{slotTypeLabel(s.type)}{s.covered && <span className="text-xs text-slate-500"> · covered</span>}</> },
              { key: 'unit', header: 'Allotted to', render: (s) => <div className="flex items-center gap-1.5">{occupant(s)}{!s.active && <Badge>Inactive</Badge>}</div> },
              { key: 'vehicles', header: 'Vehicles', render: (s) => (s.vehicles?.length ? <span className="font-mono text-xs">{s.vehicles.map((v) => v.number).join(', ')}</span> : <span className="text-slate-400">—</span>) },
              { key: 'a', header: '', className: 'text-right', render: (s) => <SlotActions s={s} onAllot={setAllotting} onEdit={setEditing} /> },
            ]}
          />
        </div>
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {adding && <AddSlotsModal areas={areas} onClose={() => setAdding(false)} />}
      {allotting && <AllotModal slot={allotting} onClose={() => setAllotting(null)} />}
      {editing && <EditSlotModal slot={editing} areas={areas} onClose={() => setEditing(null)} />}
    </div>
  );
}
