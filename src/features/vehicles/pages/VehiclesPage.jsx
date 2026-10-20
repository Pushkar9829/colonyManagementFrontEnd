import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, Input, Modal, Select, Table } from '../../../components/ui';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { useForm } from '../../../hooks/useForm';
import { label } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';

const TYPES = ['four_wheeler', 'two_wheeler', 'other'].map((v) => ({ value: v, label: label(v) }));

export default function VehiclesPage() {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  const { data, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.list('/vehicles', { limit: 50 }) });
  const { values, bind, applyServerErrors, reset } = useForm({ number: '', type: 'four_wheeler', make: '', color: '', parkingSlot: '' });
  const create = useApiMutation((b) => api.post('/vehicles', b), { invalidate: ['vehicles'], success: 'Vehicle added', onSuccess: () => { reset(); setOpen(false); } });
  const remove = useApiMutation((id) => api.del(`/vehicles/${id}`), { invalidate: ['vehicles'], success: 'Vehicle removed' });
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ''));

  return (
    <div>
      <PageHeader title="My vehicles" description="Registered vehicles help guards recognise residents at the gate." actions={<Button icon={Plus} onClick={() => setOpen(true)}>Add vehicle</Button>} />
      <Card>
        <Table loading={isLoading} rows={data?.data} empty="No vehicles registered"
          columns={[
            { key: 'number', header: 'Number', render: (v) => <span className="flex items-center gap-2 font-mono font-semibold text-slate-900"><Car className="size-4 text-slate-400" />{v.number}</span> },
            { key: 'type', header: 'Type', render: (v) => t(label(v.type)) },
            { key: 'make', header: 'Make', render: (v) => [v.make, v.color].filter(Boolean).join(' · ') || '—' },
            { key: 'parkingSlot', header: 'Parking', render: (v) => v.parkingSlot || '—' },
            { key: 'a', header: '', className: 'text-right', render: (v) => <button type="button" onClick={() => window.confirm(t('Remove {name}?', { name: v.number })) && remove.mutate(v._id)} className="text-slate-400 hover:text-red-600" aria-label={t('Remove')}><Trash2 className="size-4" /></button> },
          ]} />
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add vehicle" size="sm"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate(clean(values), { onError: applyServerErrors })}>Add</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Input className="col-span-2" label="Registration number" placeholder="MH12AB1234" required {...bind('number')} />
          <Select label="Type" options={TYPES} {...bind('type')} />
          <Input label="Parking slot" {...bind('parkingSlot')} />
          <Input label="Make / model" {...bind('make')} />
          <Input label="Colour" {...bind('color')} />
        </div>
      </Modal>
    </div>
  );
}
