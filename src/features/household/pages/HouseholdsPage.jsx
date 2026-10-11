import { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, Checkbox, Input, Modal, Pagination, Spinner, Table } from '../../../components/ui';
import { dateTime, label } from '../../../lib/format';
import { useHouseholds, useUnitHousehold } from '../api';
import { HouseholdDetail } from '../components/HouseholdDetail';

function UnitModal({ unit, onClose }) {
  const { data, isLoading } = useUnitHousehold(unit._id);
  return (
    <Modal open onClose={onClose} title={`Household ${unit.label}`} description={label(unit.occupancy)} size="lg">
      {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : <HouseholdDetail {...data} />}
    </Modal>
  );
}

export default function HouseholdsPage() {
  const [filters, setFilters] = useState({ search: '', medicalOnly: false, page: 1 });
  const { data, isLoading } = useHouseholds({ search: filters.search || undefined, medicalOnly: filters.medicalOnly || undefined, page: filters.page });
  const [open, setOpen] = useState(null);
  return (
    <div>
      <PageHeader title="Households" description="Family members, pets and emergency details for every home." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <Input className="sm:w-64" placeholder="Search unit, e.g. A-1" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
          <Checkbox label="Only homes with seniors / special needs" checked={filters.medicalOnly} onChange={(e) => setFilters((f) => ({ ...f, medicalOnly: e.target.checked, page: 1 }))} />
        </div>
        <Table loading={isLoading} rows={data?.data?.map((r) => ({ ...r, key: r.unit._id }))} rowKey="key" empty="No units" onRowClick={(r) => setOpen(r.unit)}
          columns={[
            { key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-900">{r.unit.label}</span> },
            { key: 'occ', header: 'Occupancy', render: (r) => label(r.unit.occupancy) },
            { key: 'members', header: 'Family', render: (r) => r.members },
            { key: 'pets', header: 'Pets', render: (r) => r.pets },
            { key: 'contacts', header: 'Emergency contacts', render: (r) => (r.emergencyContacts ? r.emergencyContacts : <Badge tone="amber">None</Badge>) },
            { key: 'flags', header: 'Care needs', render: (r) => <div className="flex gap-1">{r.elderly > 0 && <Badge tone="amber">{r.elderly} senior</Badge>}{r.specialNeeds > 0 && <Badge tone="amber">{r.specialNeeds} special needs</Badge>}</div> },
            { key: 'updated', header: 'Updated', render: (r) => (r.updatedAt ? dateTime(r.updatedAt) : <span className="text-slate-400">Not filled</span>) },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {open && <UnitModal unit={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
