import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, Input, Modal, Select, Table } from '../../../components/ui';
import { money, toPaise, toRupees } from '../../../lib/format';
import { METER_TYPES, uomOf, useSaveTariff, useTariffs } from '../api';

const slabText = (t) => {
  let from = 0;
  return t.slabs
    .map((s) => {
      const part = s.upTo == null ? `above ${from}` : `${from}–${s.upTo}`;
      from = s.upTo;
      return `${part}: ${money(s.rate)}`;
    })
    .join(' · ');
};

function TariffModal({ tariff, onClose }) {
  const [form, setForm] = useState(() => ({
    type: tariff?.type || 'water',
    name: tariff?.name || '',
    fixedCharge: String(toRupees(tariff?.fixedCharge || 0)),
    active: tariff ? tariff.active : true,
    slabs: (tariff?.slabs || [{ upTo: null, rate: 0 }]).map((s) => ({ upTo: s.upTo == null ? '' : String(s.upTo), rate: String(toRupees(s.rate)) })),
  }));
  const [errors, setErrors] = useState({});
  const save = useSaveTariff({ onSuccess: onClose });
  const setSlab = (i, patch) => setForm((f) => ({ ...f, slabs: f.slabs.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const submit = () =>
    save.mutate(
      {
        id: tariff?._id,
        ...(tariff ? {} : { type: form.type }),
        name: form.name,
        fixedCharge: toPaise(form.fixedCharge),
        active: form.active,
        slabs: form.slabs.map((s, i) => ({ upTo: i === form.slabs.length - 1 ? null : Number(s.upTo), rate: toPaise(s.rate) })),
      },
      { onError: (err) => setErrors(err.fieldErrors || {}) },
    );
  const uom = uomOf(form.type);
  return (
    <Modal open onClose={onClose} title={tariff ? 'Edit tariff' : 'New tariff'} description="Slabs are progressive: each rate applies to the units inside its band. A new active tariff replaces the current one for that utility."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save tariff</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Utility" options={METER_TYPES} value={form.type} disabled={Boolean(tariff)} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <Input label="Name" required value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Fixed charge per meter (₹ / month)" type="number" min={0} value={form.fixedCharge} onChange={(e) => setForm({ ...form, fixedCharge: e.target.value })} />
        <div className="flex items-end pb-2"><Checkbox label="In force" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Slabs</p>
          {form.slabs.map((s, i) => {
            const last = i === form.slabs.length - 1;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="flex items-end gap-2">
                <Input className="flex-1" label={i === 0 ? `Up to (${uom})` : undefined} value={last ? '' : s.upTo} disabled={last} placeholder={last ? 'and above' : ''} onChange={(e) => setSlab(i, { upTo: e.target.value })} />
                <Input className="flex-1" label={i === 0 ? `Rate (₹ / ${uom})` : undefined} type="number" step="any" min={0} value={s.rate} onChange={(e) => setSlab(i, { rate: e.target.value })} />
                <Button variant="ghost" icon={Trash2} aria-label="Remove slab" disabled={form.slabs.length === 1} onClick={() => setForm((f) => ({ ...f, slabs: f.slabs.filter((_, j) => j !== i) }))} />
              </div>
            );
          })}
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setForm((f) => ({ ...f, slabs: [...f.slabs.slice(0, -1), { upTo: '', rate: f.slabs[f.slabs.length - 1].rate }, f.slabs[f.slabs.length - 1]] }))}>Add slab</Button>
          {errors.slabs && <p className="text-xs text-red-600">{errors.slabs}</p>}
        </div>
      </div>
    </Modal>
  );
}

export function TariffsPanel({ canEdit }) {
  const { data, isLoading } = useTariffs();
  const [editing, setEditing] = useState(null);
  return (
    <Card>
      <CardHeader title="Tariffs" subtitle="Metered charges are added to bills as lines such as “Water (12 kL)”." action={canEdit && <Button size="sm" icon={Plus} onClick={() => setEditing({})}>New tariff</Button>} />
      <Table loading={isLoading} rows={data} empty="No tariffs yet" onRowClick={canEdit ? (t) => setEditing(t) : undefined}
        columns={[
          { key: 'type', header: 'Utility', render: (t) => METER_TYPES.find((m) => m.value === t.type)?.label },
          { key: 'name', header: 'Name', render: (t) => <span className="font-medium text-slate-900">{t.name}</span> },
          { key: 'slabs', header: `Rates per unit`, className: 'whitespace-normal', render: slabText },
          { key: 'fixedCharge', header: 'Fixed / month', render: (t) => money(t.fixedCharge) },
          { key: 'active', header: '', render: (t) => (t.active ? <Badge tone="green">In force</Badge> : <Badge>Inactive</Badge>) },
        ]} />
      {editing && <TariffModal tariff={editing._id ? editing : null} onClose={() => setEditing(null)} />}
    </Card>
  );
}
