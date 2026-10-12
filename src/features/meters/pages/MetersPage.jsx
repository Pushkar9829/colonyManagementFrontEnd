import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, FilterBar, Input, Pagination, Select, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { currentPeriod, date, label, money } from '../../../lib/format';
import { ROLES, hasRole } from '../../../lib/roles';
import { UnitPicker } from '../../units/components/UnitPicker';
import { METER_TYPES, uomOf, useConsumption, useMeters } from '../api';
import { AddMeterModal, MeterModal } from '../components/MeterModals';
import { ReadingSheet } from '../components/ReadingSheet';
import { TariffsPanel } from '../components/TariffsPanel';

function MetersList({ staff, onOpen }) {
  const [filters, setFilters] = useState({ unit: '', type: '', active: 'true', page: 1 });
  const { data, isLoading } = useMeters({ unit: filters.unit || undefined, type: filters.type || undefined, active: filters.active || undefined, page: filters.page });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      {staff && (
        <FilterBar cols={4} active={[filters.unit, filters.type, filters.active].filter(Boolean).length}>
          <div className="sm:col-span-2"><UnitPicker label={undefined} value={filters.unit} onChange={(id) => setFilters((f) => ({ ...f, unit: id, page: 1 }))} /></div>
          <Select label="Type" placeholder="All types" value={filters.type} onChange={set('type')} options={METER_TYPES} />
          <Select label="Status" placeholder="Active & retired" value={filters.active} onChange={set('active')} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Retired' }]} />
        </FilterBar>
      )}
      <Table loading={isLoading} rows={data?.data} empty={staff ? 'No meters yet' : 'No meters are fitted to your home'} onRowClick={onOpen}
        columns={[
          { key: 'serial', header: 'Serial', render: (m) => <span className="font-medium text-slate-900">{m.serial}</span> },
          ...(staff ? [{ key: 'unit', header: 'Unit', render: (m) => m.unit?.label }] : []),
          { key: 'type', header: 'Type', render: (m) => label(m.type) },
          { key: 'lastReading', header: 'Last reading', render: (m) => `${m.lastReading ?? m.initialReading} ${uomOf(m.type)} · ${date(m.lastReadAt)}` },
          { key: 'billed', header: 'Billed up to', render: (m) => (m.billedAt ? `${m.billedReading} ${uomOf(m.type)} · ${date(m.billedAt)}` : <span className="text-slate-400">Not billed yet</span>) },
          { key: 'active', header: '', render: (m) => (m.active ? <Badge tone="green">Active</Badge> : <Badge>Retired</Badge>) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}

function ConsumptionPanel({ staff }) {
  const [filters, setFilters] = useState({ period: currentPeriod(), type: '' });
  const { data, isLoading } = useConsumption({ period: filters.period, type: filters.type || undefined });
  return (
    <Card>
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Input label="Month" type="month" value={filters.period} onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))} />
        <Select label="Type" placeholder="All types" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} options={METER_TYPES} />
      </div>
      <Table loading={isLoading} rows={data?.map((r) => ({ ...r, _id: r.meter._id }))} empty="No consumption for this month"
        columns={[
          ...(staff ? [{ key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-900">{r.unit?.label}</span> }] : []),
          { key: 'meter', header: 'Meter', render: (r) => `${r.meter.serial} · ${label(r.meter.type)}` },
          { key: 'opening', header: 'Opening', render: (r) => `${r.opening} ${r.uom}` },
          { key: 'closing', header: 'Closing', render: (r) => (r.closing == null ? '—' : `${r.closing} ${r.uom}`) },
          { key: 'consumption', header: 'Consumption', render: (r) => <span className="font-medium">{r.consumption} {r.uom}</span> },
          { key: 'estimatedCharge', header: 'Est. charge', render: (r) => (r.estimatedCharge == null ? 'No rate set' : money(r.estimatedCharge)) },
        ]} />
    </Card>
  );
}

export default function MetersPage() {
  const { user } = useAuth();
  const staff = user.role !== ROLES.RESIDENT;
  const canEnter = hasRole(user, ROLES.ACCOUNTANT, ROLES.FACILITY_MANAGER);
  const [tab, setTab] = useState('meters');
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const tabs = [
    { value: 'meters', label: staff ? 'Meters' : 'My meters' },
    ...(canEnter ? [{ value: 'readings', label: 'Reading entry' }] : []),
    { value: 'consumption', label: 'Consumption' },
    { value: 'tariffs', label: 'Rates' },
  ];
  return (
    <div>
      <PageHeader
        title={staff ? 'Utility meters' : 'My utility meters'}
        description={staff ? 'Water, electricity and gas meters, monthly readings and rates. Consumption is billed automatically with maintenance.' : 'Your meters, readings and monthly consumption.'}
        actions={canEnter && <Button icon={Gauge} onClick={() => setAdding(true)}>Add meter</Button>}
      />
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'meters' && <MetersList staff={staff} onOpen={setOpen} />}
      {tab === 'readings' && canEnter && <ReadingSheet />}
      {tab === 'consumption' && <ConsumptionPanel staff={staff} />}
      {tab === 'tariffs' && <TariffsPanel canEdit={hasRole(user, ROLES.ACCOUNTANT)} />}
      {open && <MeterModal meter={open} canEdit={canEnter} onClose={() => setOpen(null)} />}
      {adding && <AddMeterModal onClose={() => setAdding(false)} />}
    </div>
  );
}
