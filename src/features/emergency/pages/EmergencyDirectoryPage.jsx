import { useState } from 'react';
import {
  Ambulance, ArrowUpDown, Building, ChevronDown, ChevronUp, Flame, Fuel, Hospital, MapPin, MoreHorizontal, Pencil, Phone, PhoneCall, Pill, Plus, ShieldCheck, Siren, Stethoscope, Trash2, Wrench, Zap,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Input, Modal, PageLoader, Select, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { label } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import { CONTACT_CATEGORIES, telHref, useContacts, useCreateContact, useRemoveContact, useReorderContacts, useUpdateContact } from '../api';
import { useT } from '../../../context/LanguageContext';

const ICONS = {
  ambulance: Ambulance, hospital: Hospital, police: Siren, fire: Flame, pharmacy: Pill, doctor: Stethoscope, electrician: Zap,
  plumber: Wrench, lift: ArrowUpDown, gas: Fuel, security: ShieldCheck, management: Building, other: Phone,
};
const TONES = {
  ambulance: 'bg-red-50 text-red-600', hospital: 'bg-red-50 text-red-600', police: 'bg-sky-50 text-sky-600', fire: 'bg-orange-50 text-orange-600',
  pharmacy: 'bg-emerald-50 text-emerald-600', doctor: 'bg-emerald-50 text-emerald-600', gas: 'bg-amber-50 text-amber-600',
};

const EMPTY = { name: '', category: 'other', phone: '', altPhone: '', address: '', notes: '', available24x7: false, active: true };

function ContactModal({ contact, open, onClose }) {
  const editing = Boolean(contact?._id);
  const { values, bind, applyServerErrors } = useForm(contact ? { ...EMPTY, ...contact } : EMPTY);
  const create = useCreateContact({ onSuccess: onClose });
  const update = useUpdateContact({ onSuccess: onClose });
  const save = () => {
    // The full form is always sent: the update schema re-applies defaults for missing fields.
    const body = {
      name: values.name.trim(),
      category: values.category,
      phone: values.phone.trim(),
      altPhone: values.altPhone?.trim() || undefined,
      address: values.address?.trim() ?? '',
      notes: values.notes?.trim() ?? '',
      available24x7: Boolean(values.available24x7),
    };
    if (editing) update.mutate({ id: contact._id, ...body, active: Boolean(values.active) }, { onError: applyServerErrors });
    else create.mutate({ ...body, address: body.address || undefined, notes: body.notes || undefined }, { onError: applyServerErrors });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit contact' : 'Add emergency contact'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required placeholder="e.g. City Hospital" {...bind('name')} />
        <Select label="Category" options={CONTACT_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} {...bind('category')} />
        <Input label="Phone" required type="tel" inputMode="tel" placeholder="e.g. 108 or +91 98765 43210" {...bind('phone')} />
        <Input label="Alternate phone" type="tel" inputMode="tel" {...bind('altPhone')} />
        <Input label="Address" {...bind('address')} />
        <Textarea className="sm:col-span-2" label="Notes" rows={2} placeholder="e.g. Ask for the emergency desk" {...bind('notes')} />
        <Checkbox label="Available 24x7" checked={Boolean(values.available24x7)} onChange={bind('available24x7').onChange} />
        {editing && <Checkbox label="Show to residents (active)" checked={Boolean(values.active)} onChange={bind('active').onChange} />}
      </div>
    </Modal>
  );
}

function CallButton({ phone, primary }) {
  return (
    <a
      href={telHref(phone)}
      className={cn(
        'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold shadow-sm transition',
        primary ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      )}
    >
      <PhoneCall className="size-5" />
      {phone}
    </a>
  );
}

// Manager tools sit behind a "⋯" menu at the top of the card, well away from the big call buttons.
function ManageMenu({ c, isFirst, isLast, busy, onEdit, onMove, onDelete }) {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  const item = 'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
  const pick = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative shrink-0">
      <button type="button" aria-label={t('Manage {name}', { name: c.name })} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <>
          <button type="button" aria-label={t('Close menu')} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button type="button" role="menuitem" className={item} onClick={pick(onEdit)}><Pencil className="size-4 text-slate-400" />{t('Edit')}</button>
            <button type="button" role="menuitem" className={item} aria-label={t('Move {name} up', { name: c.name })} disabled={isFirst || busy} onClick={pick(() => onMove(-1))}><ChevronUp className="size-4 text-slate-400" />{t('Move up')}</button>
            <button type="button" role="menuitem" className={item} aria-label={t('Move {name} down', { name: c.name })} disabled={isLast || busy} onClick={pick(() => onMove(1))}><ChevronDown className="size-4 text-slate-400" />{t('Move down')}</button>
            <button type="button" role="menuitem" className={cn(item, 'border-t border-slate-100 text-red-600 hover:bg-red-50')} onClick={pick(onDelete)}><Trash2 className="size-4" />{t('Delete')}</button>
          </div>
        </>
      )}
    </div>
  );
}

function ContactCard({ c, manager, isFirst, isLast, onEdit, onMove, onDelete, busy }) {
  const Icon = ICONS[c.category] || Phone;
  const { t } = useT();
  // The icon already shows the kind; spell it out only when the name does not say it.
  const kind = label(c.category);
  const showKind = c.category !== 'other' && !c.name.toLowerCase().includes(kind.toLowerCase());
  return (
    <Card className={cn('flex flex-col p-4', c.active === false && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', TONES[c.category] || 'bg-slate-100 text-slate-600')}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{c.name}</h3>
            {c.available24x7 && <Badge tone="green">24x7</Badge>}
            {c.active === false && <Badge>{t('Hidden')}</Badge>}
          </div>
          {showKind && <p className="text-sm text-slate-500">{t(kind)}</p>}
          {c.notes && <p className="mt-1 text-sm text-slate-600">{c.notes}</p>}
          {c.address && (
            <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {c.address}
            </p>
          )}
        </div>
        {manager && <ManageMenu c={c} isFirst={isFirst} isLast={isLast} busy={busy} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
        <CallButton phone={c.phone} primary />
        {c.altPhone && <CallButton phone={c.altPhone} />}
      </div>
    </Card>
  );
}

export default function EmergencyDirectoryPage() {
  const { user } = useAuth();
  const manager = hasRole(user, ROLES.FACILITY_MANAGER);
  const { data = [], isLoading, error, refetch } = useContacts(manager);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, contact = edit
  const [deleting, setDeleting] = useState(null);
  const remove = useRemoveContact();
  const reorder = useReorderContacts();
  const { t } = useT();

  const move = (index, dir) => {
    const ids = data.map((c) => c._id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + dir, 0, id);
    reorder.mutate(ids);
  };

  return (
    <div>
      <PageHeader
        title="Emergency contacts"
        description="Tap a number to call. Keep this page handy."
        actions={manager && <Button icon={Plus} onClick={() => setEditing({})}>Add contact</Button>}
      />
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data.length ? (
        <Card><EmptyState icon={Phone} title="No emergency contacts yet" description={manager ? 'Add ambulance, police, hospital and society numbers for residents.' : 'Your society has not added any numbers yet.'} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c, i) => (
            <ContactCard
              key={c._id}
              c={c}
              manager={manager}
              isFirst={i === 0}
              isLast={i === data.length - 1}
              busy={reorder.isPending}
              onMove={(dir) => move(i, dir)}
              onEdit={() => setEditing(c)}
              onDelete={() => setDeleting(c)}
            />
          ))}
        </div>
      )}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        size="sm"
        title={t('Delete {name}?', { name: deleting?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t('The number is removed from the emergency directory for everyone.')}</p>
      </Modal>
      {manager && editing && <ContactModal key={editing._id || 'new'} contact={editing._id ? editing : null} open onClose={() => setEditing(null)} />}
    </div>
  );
}
