import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge, Button, Input, Modal, Pagination, Select, Table } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { dateTime, label } from '../../../lib/format';
import { UnitPicker } from '../../units/components/UnitPicker';
import { useT } from '../../../context/LanguageContext';
import { METER_TYPES, uomOf, useAddReading, useCreateMeter, useDeleteReading, useMeterReadings, useReplaceMeter, useUpdateMeter } from '../api';

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const iso = (local) => (local ? new Date(local).toISOString() : undefined);

export function AddMeterModal({ onClose }) {
  const [unit, setUnit] = useState('');
  const { values, bind, errors, applyServerErrors } = useForm({ type: 'water', serial: '', multiplier: '1', initialReading: '0', installedAt: localNow() });
  const create = useCreateMeter({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Add meter"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!unit} loading={create.isPending} onClick={() => create.mutate({ unit, type: values.type, serial: values.serial, multiplier: Number(values.multiplier || 1), initialReading: Number(values.initialReading || 0), installedAt: iso(values.installedAt) }, { onError: applyServerErrors })}>Add meter</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><UnitPicker value={unit} onChange={(id) => setUnit(id)} error={errors.unit} required /></div>
        <Select label="Type" options={METER_TYPES} {...bind('type')} />
        <Input label="Serial number" required placeholder="e.g. WM-1021" {...bind('serial')} />
        <Input label="Multiplier" type="number" step="any" min={0} hint="CT ratio / pulse factor; 1 for most meters" {...bind('multiplier')} />
        <Input label="Initial reading" type="number" step="any" min={0} {...bind('initialReading')} />
        <Input className="sm:col-span-2" label="Installed on" type="datetime-local" {...bind('installedAt')} />
      </div>
    </Modal>
  );
}

function ReplaceForm({ meter, onDone }) {
  const { values, bind, applyServerErrors } = useForm({ serial: '', finalReading: '', initialReading: '0' });
  const replace = useReplaceMeter({ onSuccess: onDone });
  return (
    <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 sm:grid-cols-3">
      <Input label="New serial" required {...bind('serial')} />
      <Input label="Old meter final reading" type="number" step="any" {...bind('finalReading')} />
      <Input label="New meter starts at" type="number" step="any" {...bind('initialReading')} />
      <div className="sm:col-span-3">
        <Button size="sm" loading={replace.isPending} onClick={() => replace.mutate({ id: meter._id, serial: values.serial, finalReading: values.finalReading === '' ? undefined : Number(values.finalReading), initialReading: Number(values.initialReading || 0) }, { onError: applyServerErrors })}>Replace meter</Button>
      </div>
    </div>
  );
}

// Meter detail: readings history, add a reading, replace or retire the meter.
export function MeterModal({ meter, canEdit, onClose }) {
  const [page, setPage] = useState(1);
  const [replacing, setReplacing] = useState(false);
  const { data, isLoading } = useMeterReadings(meter._id, { page });
  const { values, bind, set, applyServerErrors } = useForm({ reading: '', readAt: localNow() });
  const add = useAddReading({ onSuccess: () => set('reading', '') });
  const del = useDeleteReading();
  const update = useUpdateMeter({ onSuccess: onClose });
  const uom = uomOf(meter.type);
  const { t } = useT();

  return (
    <Modal open onClose={onClose} size="lg" title={t('{type} meter {serial}', { type: t(label(meter.type)), serial: meter.serial })} description={`${meter.unit?.label || ''} · ${t('multiplier {value}', { value: meter.multiplier })} · ${uom}`}
      footer={canEdit && meter.active && (
        <>
          <Button variant="ghost" onClick={() => setReplacing((v) => !v)}>Replace meter</Button>
          <Button variant="ghost" loading={update.isPending} onClick={() => window.confirm(t('Retire this meter? It will stop being billed.')) && update.mutate({ id: meter._id, active: false })}>Retire</Button>
        </>
      )}>
      <div className="space-y-4 text-sm">
        {!meter.active && <Badge tone="slate">{t('Inactive')}{meter.replacedAt ? ` · ${t('replaced {date}', { date: dateTime(meter.replacedAt) })}` : ''}</Badge>}
        {replacing && <ReplaceForm meter={meter} onDone={onClose} />}
        {canEdit && meter.active && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label={t('Reading ({uom})', { uom })} type="number" step="any" min={0} {...bind('reading')} />
            <Input label="Read at" type="datetime-local" {...bind('readAt')} />
            <div className="flex items-end">
              <Button className="w-full" disabled={values.reading === ''} loading={add.isPending} onClick={() => add.mutate({ id: meter._id, reading: Number(values.reading), readAt: iso(values.readAt) }, { onError: applyServerErrors })}>Save reading</Button>
            </div>
          </div>
        )}
        <Table loading={isLoading} rows={data?.data} empty="No readings yet"
          columns={[
            { key: 'readAt', header: 'Read at', render: (r) => dateTime(r.readAt) },
            { key: 'reading', header: 'Reading', render: (r) => <span className="font-medium text-slate-900">{r.reading}</span> },
            { key: 'source', header: 'Source', render: (r) => t(label(r.source)) },
            { key: 'by', header: 'By', render: (r) => r.recordedBy?.name || (r.source === 'device' ? t('Device') : '—') },
            ...(canEdit ? [{ key: 'del', header: '', render: (r) => <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('Delete reading')} onClick={() => window.confirm(t('Delete this reading?')) && del.mutate(r._id)} /> }] : []),
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </div>
    </Modal>
  );
}
