import { useState } from 'react';
import { Crosshair, Download, Pencil, Plus, Printer, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Checkbox, Input, Modal, StatusBadge, Table } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { QrImage, qrDataUrl } from '../../visitors/components/QrImage';
import { getPosition, useCheckpoints, useCreateCheckpoint, useDeleteCheckpoint, useUpdateCheckpoint } from '../api';
import { escapeHtml } from './shared';
import { useT } from '../../../context/LanguageContext';
import { errorText } from '../../../lib/errorText';

// Opens a separate window with only the QR cards so the app shell is not printed.
// The window is opened synchronously (inside the click) to avoid popup blockers, then filled.
async function printCheckpoints(items, toast, t) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    toast.error(t('Allow pop-ups for this site to print QR codes'));
    return;
  }
  win.document.write(`<p style="font-family:sans-serif;padding:24px">${escapeHtml(t('Preparing QR codes…'))}</p>`);
  const urls = await Promise.all(items.map((c) => qrDataUrl(c.qr, 480)));
  const cards = items
    .map(
      (c, i) => `<div class="card"><img src="${urls[i]}" alt="QR" /><div class="name">${escapeHtml(c.name)}</div>${c.location ? `<div class="loc">${escapeHtml(c.location)}</div>` : ''}<div class="hint">${escapeHtml(t('Patrol checkpoint · scan with ColonyHub'))}</div></div>`,
    )
    .join('');
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t('Patrol checkpoint QR codes'))}</title><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
    .card{border:2px dashed #94a3b8;border-radius:12px;padding:16px;text-align:center;break-inside:avoid;page-break-inside:avoid}
    .card img{width:100%;max-width:220px;height:auto}.name{margin-top:8px;font-size:18px;font-weight:700}
    .loc{font-size:13px;color:#475569}.hint{margin-top:6px;font-size:11px;color:#94a3b8}
    @media print{body{padding:0}.grid{grid-template-columns:repeat(2,1fr)}}
  </style></head><body><div class="grid">${cards}</div></body></html>`);
  win.document.close();
  const imgs = [...win.document.images];
  await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
  win.focus();
  win.print();
}

function CheckpointForm({ open, onClose, checkpoint }) {
  const toast = useToast();
  const { t } = useT();
  const editing = Boolean(checkpoint);
  const { values, bind, set, applyServerErrors } = useForm({
    name: checkpoint?.name || '',
    location: checkpoint?.location || '',
    lat: checkpoint?.lat ?? '',
    lng: checkpoint?.lng ?? '',
    radiusM: checkpoint?.radiusM ?? 75,
    active: checkpoint?.active ?? true,
  });
  const [locating, setLocating] = useState(false);
  const opts = { onSuccess: onClose };
  const create = useCreateCheckpoint(opts);
  const update = useUpdateCheckpoint(opts);

  const useHere = async () => {
    setLocating(true);
    const pos = await getPosition(10000);
    setLocating(false);
    if (!pos) return toast.error(t('Could not get your location. Allow location access and try again.'));
    set('lat', pos.lat.toFixed(6));
    set('lng', pos.lng.toFixed(6));
    toast.success(pos.accuracyM > 50 ? t('Location set (accuracy ~{m} m — retry outdoors for a better fix)', { m: pos.accuracyM }) : t('Location set (accuracy ~{m} m)', { m: pos.accuracyM }));
    return undefined;
  };

  const save = () => {
    const num = (v) => (v === '' || v === null ? undefined : Number(v));
    const body = { name: values.name, location: values.location || undefined, lat: num(values.lat), lng: num(values.lng), radiusM: num(values.radiusM) };
    if (editing) update.mutate({ id: checkpoint._id, ...body, active: values.active }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit checkpoint' : 'New checkpoint'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required placeholder="e.g. Tower B basement" {...bind('name')} />
        <Input className="sm:col-span-2" label="Location" placeholder="e.g. Near lift lobby" {...bind('location')} />
        <Input label="Latitude" type="number" step="any" inputMode="decimal" {...bind('lat')} />
        <Input label="Longitude" type="number" step="any" inputMode="decimal" {...bind('lng')} />
        <div className="sm:col-span-2">
          <Button variant="secondary" icon={Crosshair} loading={locating} onClick={useHere}>Use my current location</Button>
          <p className="mt-1 text-xs text-slate-500">{t('Stand at the checkpoint. Without coordinates, scans are accepted without a GPS check.')}</p>
        </div>
        <Input label="Allowed radius (m)" type="number" min={10} max={1000} {...bind('radiusM')} />
        {editing && <Checkbox className="self-end pb-2" label="Active" checked={values.active} onChange={(e) => set('active', e.target.checked)} />}
      </div>
    </Modal>
  );
}

function QrModal({ checkpoint, onClose }) {
  const toast = useToast();
  const { t } = useT();
  const download = async () => {
    const url = await qrDataUrl(checkpoint.qr, 800);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkpoint-${checkpoint.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    a.click();
  };
  return (
    <Modal open={Boolean(checkpoint)} onClose={onClose} title={checkpoint?.name} description={checkpoint?.location} size="sm"
      footer={<><Button variant="secondary" icon={Download} onClick={download}>Download PNG</Button><Button icon={Printer} onClick={() => printCheckpoints([checkpoint], toast, t)}>Print</Button></>}>
      {checkpoint && (
        <div className="flex flex-col items-center gap-2">
          <QrImage value={checkpoint.qr} size={240} label={t('{name} QR', { name: checkpoint.name })} />
          <p className="font-mono text-xs text-slate-500">{checkpoint.code}</p>
        </div>
      )}
    </Modal>
  );
}

export function CheckpointsTab() {
  const toast = useToast();
  const { t } = useT();
  const { data, isLoading } = useCheckpoints();
  const [editing, setEditing] = useState(null); // null | 'new' | checkpoint
  const [qrFor, setQrFor] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'regen', cp }
  const [confirmError, setConfirmError] = useState('');
  const close = () => { setConfirm(null); setConfirmError(''); };
  const del = useDeleteCheckpoint({ toastErrors: false, onSuccess: close });
  const regen = useUpdateCheckpoint({ success: 'New code generated — reprint this QR', onSuccess: close });
  const active = (data || []).filter((c) => c.active);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <p className="text-sm text-slate-500">{t('{count} checkpoints · print and fix the QR codes at each spot', { count: data?.length ?? 0 })}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Printer} disabled={!active.length} onClick={() => printCheckpoints(active, toast, t)}>Print QR codes</Button>
          <Button icon={Plus} onClick={() => setEditing('new')}>New checkpoint</Button>
        </div>
      </div>
      <Table
        loading={isLoading}
        rows={data}
        empty="No checkpoints yet"
        columns={[
          { key: 'name', header: 'Checkpoint', render: (c) => <div><p className="font-medium text-slate-900">{c.name}</p>{c.location && <p className="text-xs text-slate-500">{c.location}</p>}</div> },
          { key: 'gps', header: 'GPS', render: (c) => (c.lat != null && c.lng != null ? <span className="text-xs">{c.lat.toFixed(5)}, {c.lng.toFixed(5)} · {c.radiusM} m</span> : <Badge>{t('No GPS')}</Badge>) },
          { key: 'active', header: 'Status', render: (c) => <StatusBadge status={c.active ? 'active' : 'inactive'} /> },
          {
            key: 'actions', header: '', className: 'text-right', render: (c) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" icon={QrCode} onClick={() => setQrFor(c)} aria-label={t('Show QR')}>QR</Button>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(c)} aria-label={t('Edit')} />
                <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => setConfirm({ type: 'regen', cp: c })} aria-label={t('Regenerate code')} title={t('Regenerate code')} />
                <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600" onClick={() => setConfirm({ type: 'delete', cp: c })} aria-label={t('Delete')} />
              </div>
            ),
          },
        ]}
      />
      {editing && <CheckpointForm open onClose={() => setEditing(null)} checkpoint={editing === 'new' ? null : editing} />}
      <QrModal checkpoint={qrFor} onClose={() => setQrFor(null)} />
      <Modal open={Boolean(confirm)} onClose={close} size="sm"
        title={confirm?.type === 'delete' ? t('Delete {name}?', { name: confirm?.cp.name }) : t('New code for {name}?', { name: confirm?.cp.name })}
        footer={<>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          {confirm?.type === 'delete'
            ? <Button variant="danger" loading={del.isPending} onClick={() => del.mutate(confirm.cp._id, { onError: (e) => setConfirmError(errorText(e, t)) })}>Delete</Button>
            : <Button loading={regen.isPending} onClick={() => regen.mutate({ id: confirm.cp._id, regenerateCode: true })}>Regenerate</Button>}
        </>}>
        <p className="text-sm text-slate-600">
          {confirm?.type === 'delete' ? t('Past scans stay in the history. This cannot be undone.') : t('The printed QR stops working immediately. Print and replace it at the checkpoint.')}
        </p>
        {confirmError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{confirmError}</p>}
      </Modal>
    </Card>
  );
}
