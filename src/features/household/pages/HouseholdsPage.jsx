import { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, Checkbox, FilterBar, Input, Modal, Pagination, Spinner, Table } from '../../../components/ui';
import { dateTime, label } from '../../../lib/format';
import { useHouseholds, useUnitHousehold } from '../api';
import { HouseholdDetail } from '../components/HouseholdDetail';
import { useAuth } from '../../../context/AuthContext';
import { UnitPeopleDetails } from '../../people/components/UnitPeopleDetails';

function UnitModal({ unit, onClose }) {
  const { data, isLoading } = useUnitHousehold(unit._id);
  const { user } = useAuth();
  return (
    <Modal open onClose={onClose} title={`Household ${unit.label}`} description={label(unit.occupancy)} size="lg">
      {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : <HouseholdDetail {...data} unitLabel={unit.label} />}
      {user.role === 'admin' && <UnitPeopleDetails unitId={unit._id} />}
    </Modal>
  );
}

export default function HouseholdsPage() {
  const [filters, setFilters] = useState({ search: '', medicalOnly: false, noContacts: false, page: 1 });
  // The API has no "missing contacts" filter, so that one is applied here on pages of 100 homes.
  const { data, isLoading } = useHouseholds({ search: filters.search || undefined, medicalOnly: filters.medicalOnly || undefined, page: filters.page, limit: filters.noContacts ? 100 : undefined });
  const [open, setOpen] = useState(null);
  const rows = (data?.data || []).filter((r) => !filters.noContacts || !r.emergencyContacts).map((r) => ({ ...r, key: r.unit._id }));
  const meta = data?.meta;
  return (
    <div>
      <PageHeader title="Households" description="Family members, pets and emergency details for every home." />
      <Card>
        <FilterBar cols={3} active={Number(filters.medicalOnly) + Number(filters.noContacts)}
          search={<Input aria-label="Search unit" placeholder="Search unit, e.g. A-1" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />}>
          <Checkbox className="sm:h-10" label="Only homes with seniors / special needs" checked={filters.medicalOnly} onChange={(e) => setFilters((f) => ({ ...f, medicalOnly: e.target.checked, page: 1 }))} />
          <Checkbox className="sm:h-10" label="Homes without emergency contacts" checked={filters.noContacts} onChange={(e) => setFilters((f) => ({ ...f, noContacts: e.target.checked, page: 1 }))} />
        </FilterBar>
        {filters.noContacts && meta && (
          <p className="border-b border-slate-100 bg-amber-50/60 px-4 py-2 text-xs text-amber-800">
            {rows.length} of {Math.min(meta.limit, Math.max(0, meta.total - (meta.page - 1) * meta.limit))} homes{meta.pages > 1 ? ` on page ${meta.page} of ${meta.pages}` : ''} have no emergency contact.
          </p>
        )}
        <Table loading={isLoading} rows={rows} rowKey="key" empty={filters.noContacts ? 'Every home here has an emergency contact' : 'No units'} onRowClick={(r) => setOpen(r.unit)}
          columns={[
            { key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-900">{r.unit.label}</span> },
            { key: 'contacts', header: 'Emergency contacts', render: (r) => (r.emergencyContacts ? r.emergencyContacts : <Badge tone="red">Missing</Badge>) },
            { key: 'flags', header: 'Care needs', render: (r) => (r.elderly > 0 || r.specialNeeds > 0 ? <div className="flex flex-wrap gap-1">{r.elderly > 0 && <Badge tone="amber">{r.elderly} senior</Badge>}{r.specialNeeds > 0 && <Badge tone="amber">{r.specialNeeds} special needs</Badge>}</div> : null) },
            { key: 'members', header: 'Family', render: (r) => r.members },
            { key: 'occ', header: 'Occupancy', mobile: false, render: (r) => label(r.unit.occupancy) },
            { key: 'pets', header: 'Pets', mobile: false, render: (r) => r.pets },
            { key: 'updated', header: 'Updated', mobile: false, render: (r) => (r.updatedAt ? dateTime(r.updatedAt) : <span className="text-slate-400">Not filled</span>) },
          ]} />
        <Pagination meta={meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {open && <UnitModal unit={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
