import { useState } from 'react';
import { Button, Checkbox, FileUpload, Input, Modal, Select, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { useT } from '../../../context/LanguageContext';
import { label, toPaise, toRupees } from '../../../lib/format';
import { AudienceFields, cleanAudience } from '../../community/AudienceFields';
import { useAmenities } from '../../amenities/api';
import { useCreateEvent, useUpdateEvent } from '../api';

export const EVENT_CATEGORIES = ['festival', 'sports', 'cultural', 'kids', 'workshop', 'meeting', 'other'];

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"
export const toLocalInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const iso = (v) => (v ? new Date(v).toISOString() : undefined);

export function EventFormModal({ open, onClose, event, onSaved }) {
  const { t } = useT();
  const editing = Boolean(event);
  const { data: amenities = [] } = useAmenities();
  const [audience, setAudience] = useState(event?.audience || { type: 'all', blocks: [], roles: [] });
  const [cover, setCover] = useState([]);
  const { values, bind, errors, applyServerErrors } = useForm({
    title: event?.title || '',
    category: event?.category || 'festival',
    description: event?.description || '',
    venue: event?.venue || '',
    amenity: event?.amenity || '',
    startAt: toLocalInput(event?.startAt),
    endAt: toLocalInput(event?.endAt),
    capacity: event?.capacity ?? '',
    rsvpDeadline: toLocalInput(event?.rsvpDeadline),
    maxGuests: event?.maxGuests ?? 4,
    ticketPrice: event ? toRupees(event.ticketPrice) : '',
    allowOnlinePayment: event?.allowOnlinePayment ?? true,
  });
  const done = { onSuccess: (e) => { onClose(); onSaved?.(e); } };
  const create = useCreateEvent(done);
  const update = useUpdateEvent(done);

  const submit = () => {
    const body = {
      title: values.title,
      category: values.category,
      description: values.description || undefined,
      venue: values.venue || undefined,
      amenity: values.amenity || undefined,
      startAt: iso(values.startAt),
      endAt: iso(values.endAt),
      capacity: values.capacity === '' ? (editing ? null : undefined) : Number(values.capacity),
      rsvpDeadline: values.rsvpDeadline ? iso(values.rsvpDeadline) : editing ? null : undefined,
      maxGuests: Number(values.maxGuests || 0),
      ticketPrice: toPaise(values.ticketPrice),
      allowOnlinePayment: values.allowOnlinePayment,
      cover: cover[0]?._id,
    };
    if (editing) update.mutate({ id: event._id, ...body }, { onError: applyServerErrors });
    else create.mutate({ ...body, audience: cleanAudience(audience) }, { onError: applyServerErrors });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit event' : 'New event'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>{editing ? 'Save changes' : 'Publish event'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" required {...bind('title')} />
        <Select label="Category" options={EVENT_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} {...bind('category')} />
        <Select label="Amenity" placeholder="Not at an amenity" options={amenities.map((a) => ({ value: a._id, label: a.name }))} {...bind('amenity')} />
        <Input className="sm:col-span-2" label="Venue" placeholder="e.g. Clubhouse lawn" hint="Defaults to the amenity name" {...bind('venue')} />
        <Input type="datetime-local" label="Starts" required {...bind('startAt')} />
        <Input type="datetime-local" label="Ends" required {...bind('endAt')} />
        <Textarea className="sm:col-span-2" label="Description" rows={4} {...bind('description')} />
        <Input type="number" min="1" label="Capacity (people)" hint="Leave empty for no limit; extra RSVPs join a waitlist" {...bind('capacity')} />
        <Input type="datetime-local" label="RSVP by" hint="Optional; defaults to the start time" {...bind('rsvpDeadline')} />
        <Input type="number" min="0" max="20" label="Guests per RSVP" {...bind('maxGuests')} />
        <Input type="number" min="0" step="1" label="Ticket price per person (₹)" hint="0 or empty = free" {...bind('ticketPrice')} />
        {Number(values.ticketPrice) > 0 && <Checkbox className="sm:col-span-2" label="Allow online payment (otherwise pay at the venue)" checked={values.allowOnlinePayment} onChange={bind('allowOnlinePayment').onChange} />}
        {!editing && <div className="sm:col-span-2"><AudienceFields value={audience} onChange={setAudience} /></div>}
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">{editing && event.cover ? t('Cover image (replace)') : t('Cover image')}</p>
          <FileUpload folder="events" files={cover} onChange={setCover} max={1} label="Add cover" />
        </div>
        {Object.keys(errors).some((k) => errors[k] && !(k in values)) && (
          <p className="text-sm text-red-600 sm:col-span-2">{Object.entries(errors).filter(([k, v]) => v && !(k in values)).map(([, v]) => v).join(' · ')}</p>
        )}
      </div>
    </Modal>
  );
}
