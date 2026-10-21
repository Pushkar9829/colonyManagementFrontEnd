import { useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Input, Modal, Pagination, Select, Table } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { label } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';
import { useBlocks, useBulkUnits, useCreateBlock, useCreateUnit, useDeleteBlock, useDeleteUnit, useUnits } from '../api';

const UNIT_TYPES = ['flat', 'villa', 'plot', 'shop', 'other'].map((v) => ({ value: v, label: label(v) }));

function BlockModal({ open, onClose }) {
  const { values, bind, applyServerErrors, reset } = useForm({ name: '', floors: '' });
  const create = useCreateBlock({ onSuccess: () => { reset(); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add block / tower" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ name: values.name, floors: values.floors || undefined }, { onError: applyServerErrors })}>Add block</Button></>}>
      <div className="space-y-4">
        <Input label="Name" placeholder="A, B, Tower 1, Phase 2" required {...bind('name')} />
        <Input label="Floors" type="number" min={0} {...bind('floors')} />
      </div>
    </Modal>
  );
}

function BulkModal({ open, onClose, blocks }) {
  const { values, bind, applyServerErrors } = useForm({ block: '', fromFloor: '1', toFloor: '4', unitsPerFloor: '4', type: 'flat', areaSqft: '' });
  const bulk = useBulkUnits({ onSuccess: onClose });
  const { t } = useT();
  const count = Math.max(0, (Number(values.toFloor) - Number(values.fromFloor) + 1) * Number(values.unitsPerFloor || 0));
  return (
    <Modal open={open} onClose={onClose} title="Generate units" description="Creates numbers like 101, 102 … per floor. Existing units are skipped."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!values.block} loading={bulk.isPending} onClick={() => bulk.mutate({ ...values, areaSqft: values.areaSqft || undefined }, { onError: applyServerErrors })}>{t('Create {count} units', { count })}</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Select className="col-span-2" label="Block" required placeholder="Select block" options={blocks.map((b) => ({ value: b._id, label: b.name }))} {...bind('block')} />
        <Input label="From floor" type="number" min={0} hint="0 = ground (G01…)" {...bind('fromFloor')} />
        <Input label="To floor" type="number" min={0} {...bind('toFloor')} />
        <Input label="Units per floor" type="number" min={1} {...bind('unitsPerFloor')} />
        <Select label="Type" options={UNIT_TYPES} {...bind('type')} />
        <Input className="col-span-2" label="Area (sq.ft)" type="number" min={0} hint="Used for per-sq.ft maintenance billing" {...bind('areaSqft')} />
      </div>
    </Modal>
  );
}

function UnitModal({ open, onClose, blocks }) {
  const { values, bind, applyServerErrors, reset } = useForm({ block: '', number: '', floor: '', type: 'flat', areaSqft: '' });
  const create = useCreateUnit({ onSuccess: () => { reset(); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add unit" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...values, floor: values.floor || undefined, areaSqft: values.areaSqft || undefined }, { onError: applyServerErrors })}>Add unit</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Select className="col-span-2" label="Block" required placeholder="Select block" options={blocks.map((b) => ({ value: b._id, label: b.name }))} {...bind('block')} />
        <Input label="Unit number" required {...bind('number')} />
        <Input label="Floor" type="number" {...bind('floor')} />
        <Select label="Type" options={UNIT_TYPES} {...bind('type')} />
        <Input label="Area (sq.ft)" type="number" min={0} {...bind('areaSqft')} />
      </div>
    </Modal>
  );
}

export default function UnitsPage() {
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ block: '', occupancy: '', search: '', page: 1 });
  const { data: blocks = [] } = useBlocks();
  const { data, isLoading } = useUnits({ ...filters, block: filters.block || undefined, occupancy: filters.occupancy || undefined, search: filters.search || undefined });
  const deleteBlock = useDeleteBlock();
  const deleteUnit = useDeleteUnit();
  const { t } = useT();
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <PageHeader
        title="Blocks & units"
        description="Set up the physical structure of the colony."
        actions={
          <>
            <Button variant="secondary" icon={Plus} onClick={() => setModal('block')}>Block</Button>
            <Button variant="secondary" icon={Plus} disabled={!blocks.length} onClick={() => setModal('unit')}>Unit</Button>
            <Button icon={Layers} disabled={!blocks.length} onClick={() => setModal('bulk')}>Generate units</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Card className="h-fit">
          <CardHeader title="Blocks" subtitle={t('{count} total', { count: blocks.length })} />
          <ul className="divide-y divide-slate-100">
            {!blocks.length && <li className="px-5 py-6 text-sm text-slate-500">{t('Add your first block to start.')}</li>}
            {blocks.map((b) => (
              <li key={b._id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="font-medium text-slate-700">{t('Block {name}', { name: b.name })}</span>
                <button type="button" onClick={() => window.confirm(t('Delete block {name}?', { name: b.name })) && deleteBlock.mutate(b._id)} className="text-slate-400 hover:text-red-600" aria-label={t('Delete block {name}', { name: b.name })}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
            <Input placeholder="Search e.g. A-1" value={filters.search} onChange={setFilter('search')} />
            <Select value={filters.block} onChange={setFilter('block')} placeholder="All blocks" options={blocks.map((b) => ({ value: b._id, label: t('Block {name}', { name: b.name }) }))} />
            <Select value={filters.occupancy} onChange={setFilter('occupancy')} placeholder="Any occupancy" options={['vacant', 'owner_occupied', 'rented'].map((v) => ({ value: v, label: label(v) }))} />
          </div>
          <Table
            loading={isLoading}
            rows={data?.data}
            empty="No units yet"
            columns={[
              { key: 'label', header: 'Unit', render: (u) => <span className="font-medium text-slate-900">{u.label}</span> },
              { key: 'floor', header: 'Floor', render: (u) => u.floor ?? '—' },
              { key: 'type', header: 'Type', render: (u) => t(label(u.type)) },
              { key: 'areaSqft', header: 'Area', render: (u) => (u.areaSqft ? `${u.areaSqft} sq.ft` : '—') },
              { key: 'occupancy', header: 'Occupancy', render: (u) => <Badge tone={u.occupancy === 'vacant' ? 'slate' : u.occupancy === 'rented' ? 'blue' : 'green'}>{t(label(u.occupancy))}</Badge> },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (u) => (
                  <button type="button" onClick={() => window.confirm(t('Delete unit {unit}?', { unit: u.label })) && deleteUnit.mutate(u._id)} className="text-slate-400 hover:text-red-600" aria-label={t('Delete {name}', { name: u.label })}>
                    <Trash2 className="size-4" />
                  </button>
                ),
              },
            ]}
          />
          <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
        </Card>
      </div>

      <BlockModal open={modal === 'block'} onClose={() => setModal(null)} />
      <BulkModal open={modal === 'bulk'} onClose={() => setModal(null)} blocks={blocks} />
      <UnitModal open={modal === 'unit'} onClose={() => setModal(null)} blocks={blocks} />
    </div>
  );
}
