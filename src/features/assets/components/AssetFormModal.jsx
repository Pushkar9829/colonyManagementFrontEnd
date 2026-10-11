import { useEffect, useState } from 'react';
import { Button, FileUpload, Input, Modal, Select, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { toPaise, toRupees } from '../../../lib/format';
import { useCreateAsset, useUpdateAsset } from '../api';
import { CATEGORIES } from '../constants';
import { clean } from '../shared';

const EMPTY = { category: 'lift', name: '', tag: '', location: '', make: '', model: '', serialNumber: '', capacity: '', purchaseDate: '', purchaseCost: '', warrantyExpiry: '', notes: '' };
const EDITABLE = Object.keys(EMPTY);

// Create a new asset, or edit an existing one (pass `asset`).
export function AssetFormModal({ open, onClose, asset, onSaved }) {
  const { values, bind, setValues, applyServerErrors } = useForm(EMPTY);
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    if (!open) return;
    setPhotos([]);
    setValues(asset ? { ...EMPTY, ...Object.fromEntries(EDITABLE.map((k) => [k, asset[k] ?? ''])), purchaseCost: asset.purchaseCost ? String(toRupees(asset.purchaseCost)) : '' } : EMPTY);
  }, [open, asset, setValues]);

  const done = (a) => {
    onClose();
    onSaved?.(a);
  };
  const create = useCreateAsset({ onSuccess: done });
  const update = useUpdateAsset({ onSuccess: done });

  const submit = () => {
    const body = { ...values, purchaseCost: values.purchaseCost === '' ? '' : toPaise(values.purchaseCost) };
    if (asset) {
      // send changed fields only; emptied optional fields are cleared with null
      const diff = {};
      for (const k of EDITABLE) {
        const before = k === 'purchaseCost' ? asset.purchaseCost ?? '' : asset[k] ?? '';
        if (String(body[k]) !== String(before)) diff[k] = body[k] === '' ? null : body[k];
      }
      if (!Object.keys(diff).length) return onClose();
      return update.mutate({ id: asset._id, ...diff }, { onError: applyServerErrors });
    }
    return create.mutate({ ...clean(body), photos: photos.length ? photos.map((p) => p._id) : undefined }, { onError: applyServerErrors });
  };

  return (
    <Modal open={open} onClose={onClose} title={asset ? `Edit ${asset.code}` : 'Register asset'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>{asset ? 'Save' : 'Register'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" options={CATEGORIES} {...bind('category')} />
        <Input label="Name" required placeholder="e.g. Lift A1" {...bind('name')} />
        <Input label="Location / block" placeholder="Tower A, basement" {...bind('location')} />
        <Input label="Existing tag (optional)" hint="A code already painted on the equipment" {...bind('tag')} />
        <Input label="Make" {...bind('make')} />
        <Input label="Model" {...bind('model')} />
        <Input label="Serial number" {...bind('serialNumber')} />
        <Input label="Capacity" placeholder="125 kVA, 8 passenger…" {...bind('capacity')} />
        <Input label="Purchase date" type="date" {...bind('purchaseDate')} />
        <Input label="Purchase cost (₹)" type="number" min="0" step="0.01" {...bind('purchaseCost')} />
        <Input label="Warranty expiry" type="date" {...bind('warrantyExpiry')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={2} {...bind('notes')} />
        {!asset && <FileUpload className="sm:col-span-2" folder="facility" files={photos} onChange={setPhotos} label="Add photos" />}
      </div>
    </Modal>
  );
}
