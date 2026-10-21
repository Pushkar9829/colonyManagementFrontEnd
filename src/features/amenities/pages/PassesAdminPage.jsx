import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Select, StatusBadge, Table, Textarea } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { date as fmtDate, label, money, toPaise, toRupees } from '../../../lib/format';
import { useAmenities, useCancelPass, useCreatePlan, useMarkPassPaid, usePassPlans, usePasses, useUpdatePlan } from '../api';

function PlanModal({ plan, amenities, onClose }) {
  const editing = Boolean(plan?._id);
  const [v, setV] = useState({
    amenity: plan?.amenity?._id || amenities[0]?._id || '',
    name: plan?.name || '',
    description: plan?.description || '',
    durationDays: String(plan?.durationDays ?? 30),
    price: String(toRupees(plan?.price)),
    active: plan?.active ?? true,
  });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const create = useCreatePlan({ onSuccess: onClose });
  const update = useUpdatePlan({ onSuccess: onClose });
  const body = { name: v.name, description: v.description || undefined, durationDays: Number(v.durationDays), price: toPaise(v.price), active: v.active };
  return (
    <Modal open onClose={onClose} title={editing ? 'Edit plan' : 'New pass plan'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={() => (editing ? update.mutate({ id: plan._id, ...body }) : create.mutate({ amenity: v.amenity, ...body }))}>Save</Button></>}>
      <div className="space-y-3">
        {!editing && <Select label="Amenity" options={amenities.map((a) => ({ value: a._id, label: a.name }))} value={v.amenity} onChange={set('amenity')} />}
        <Input label="Name" placeholder="e.g. Monthly" required value={v.name} onChange={set('name')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Validity (days)" type="number" min={1} max={366} value={v.durationDays} onChange={set('durationDays')} />
          <Input label="Price (₹)" type="number" min={0} value={v.price} onChange={set('price')} />
        </div>
        <Textarea label="Description" rows={2} value={v.description} onChange={set('description')} />
        <Checkbox label="On sale" checked={v.active} onChange={set('active')} />
      </div>
    </Modal>
  );
}

export default function PassesAdminPage() {
  const { t } = useT();
  const { data: amenities = [] } = useAmenities();
  const { data: plans = [] } = usePassPlans();
  const [filters, setFilters] = useState({ status: '', amenity: '', code: '', page: 1 });
  const { data, isLoading } = usePasses(Object.fromEntries(Object.entries(filters).filter(([, x]) => x !== '')));
  const [editing, setEditing] = useState(null);
  const markPaid = useMarkPassPaid();
  const cancel = useCancelPass();
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <Link to="/amenities" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('Amenities')}</Link>
      <PageHeader title="Memberships & passes" description="Sell monthly passes for the gym, pool and more. Guards check passes on the Pass check screen." actions={<Button icon={Plus} onClick={() => setEditing({})} disabled={!amenities.length}>New plan</Button>} />
      <Card className="mb-6">
        <CardHeader title="Plans" />
        {!plans.length ? <EmptyState title="No plans yet" /> : (
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium text-slate-900">{p.amenity?.name} · {p.name} {!p.active && <Badge>{t('Not on sale')}</Badge>}</p>
                  <p className="text-sm text-slate-500">{t('{n} days', { n: p.durationDays })} · {p.price ? money(p.price) : t('Free')}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <Input placeholder="Pass code" value={filters.code} onChange={set('code')} />
          <Select placeholder="All amenities" options={amenities.map((a) => ({ value: a._id, label: a.name }))} value={filters.amenity} onChange={set('amenity')} />
          <Select placeholder="All statuses" options={['payment_pending', 'active', 'expired', 'cancelled'].map((s) => ({ value: s, label: label(s) }))} value={filters.status} onChange={set('status')} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No passes"
          columns={[
            { key: 'code', header: 'Code', render: (p) => <span className="font-mono text-xs font-semibold">{p.code}</span> },
            { key: 'holder', header: 'Holder', render: (p) => `${p.holder?.name}${p.unit ? ` · ${p.unit.label}` : ''}` },
            { key: 'plan', header: 'Plan', render: (p) => `${p.amenity?.name} · ${p.plan?.name}` },
            { key: 'valid', header: 'Valid', render: (p) => `${fmtDate(p.validFrom)} – ${fmtDate(p.validTo)}` },
            { key: 'price', header: 'Price', render: (p) => (p.price ? money(p.price) : t('Free')) },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            {
              key: 'a', header: '', render: (p) => (
                <div className="flex justify-end gap-1">
                  {p.status === 'payment_pending' && <Button size="sm" variant="secondary" onClick={() => { const method = window.prompt(t('Payment method (cash / upi / card)'), 'cash'); if (method) markPaid.mutate({ id: p._id, method: method.trim().toLowerCase() }); }}>Record payment</Button>}
                  {['active', 'payment_pending'].includes(p.status) && (
                    <Button size="sm" variant="ghost" onClick={() => {
                      const reason = window.prompt(t('Reason for cancelling'));
                      if (reason === null) return;
                      const refund = p.status === 'active' && p.price ? window.prompt(t('Refund amount in ₹ (0 – {max})', { max: toRupees(p.price) }), '0') : '0';
                      cancel.mutate({ id: p._id, reason: reason || undefined, refundAmount: toPaise(refund) || undefined });
                    }}>Cancel</Button>
                  )}
                </div>
              ),
            },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {editing && <PlanModal plan={editing} amenities={amenities} onClose={() => setEditing(null)} />}
    </div>
  );
}
