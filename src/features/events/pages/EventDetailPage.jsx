import { useOnlinePaymentStatus } from '../../colonyPayments/api';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarDays, Camera, Check, CreditCard, HelpCircle, ImagePlus, MapPin, Minus, Pencil, Plus, QrCode, ScanLine, Ticket, Trash2, Undo2, Users, X } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, FileUpload, Modal, PageLoader, Select, Table, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { cn } from '../../../lib/cn';
import { dateTime, label, money } from '../../../lib/format';
import { isManager, ROLES } from '../../../lib/roles';
import { RichText } from '../../forum/components/RichText';
import { useAddPhotos, useCancelEvent, useCancelRsvp, useCheckIn, useCollect, useEvent, useEventRsvps, usePayTicket, useRemovePhoto, useRsvp, useUndoCheckIn } from '../api';
import { whenText } from '../format';
import { EventFormModal } from '../components/EventFormModal';
import { TicketModal } from '../components/TicketModal';
import { CheckInModal } from '../components/CheckInModal';

const STATE_TEXT = {
  confirmed: ['green', "You're going"],
  waitlisted: ['amber', "You're on the waitlist — we'll tell you if a spot opens"],
  maybe: ['blue', 'You said maybe'],
  declined: ['slate', "You're not going"],
  cancelled: ['slate', 'This event was cancelled'],
};

function RsvpPanel({ e }) {
  const { t } = useT();
  const mine = e.myRsvp;
  const [guests, setGuests] = useState(mine?.guests || 0);
  const [mode, setMode] = useState(mine?.paymentMode && mine.paymentMode !== 'none' ? mine.paymentMode : 'venue');
  const [ticketOpen, setTicketOpen] = useState(false);
  const rsvp = useRsvp();
  const cancel = useCancelRsvp();
  const pay = usePayTicket();
  const online = useOnlinePaymentStatus().data?.online === true;
  const paid = e.ticketPrice > 0;
  const send = (response) => rsvp.mutate({ id: e._id, response, guests: response === 'yes' ? guests : 0, paymentMode: paid ? mode : undefined });
  const locked = mine?.paymentStatus === 'paid';
  const state = mine && STATE_TEXT[mine.state];

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">{t('Your RSVP')}</h2>
      {state && <p className={cn('mt-1 text-sm', state[0] === 'green' ? 'text-emerald-700' : state[0] === 'amber' ? 'text-amber-700' : 'text-slate-600')}>{t(state[1])}{mine.state === 'confirmed' || mine.state === 'waitlisted' ? ` · ${mine.headcount === 1 ? t('{n} person', { n: mine.headcount }) : t('{n} people', { n: mine.headcount })}` : ''}</p>}

      {e.rsvpOpen && !locked && (
        <div className="mt-4 space-y-4">
          {e.maxGuests > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{t('Guests with you')}</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={t('Fewer guests')} disabled={guests <= 0} onClick={() => setGuests((g) => g - 1)} className="rounded-full border border-slate-300 p-1.5 disabled:opacity-40"><Minus className="size-4" /></button>
                <span className="w-6 text-center font-semibold">{guests}</span>
                <button type="button" aria-label={t('More guests')} disabled={guests >= e.maxGuests} onClick={() => setGuests((g) => g + 1)} className="rounded-full border border-slate-300 p-1.5 disabled:opacity-40"><Plus className="size-4" /></button>
              </div>
            </div>
          )}
          {paid && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">{money(e.ticketPrice)} × {guests + 1} = <span className="font-semibold">{money(e.ticketPrice * (guests + 1))}</span></p>
              {e.allowOnlinePayment && <Select value={mode} onChange={(ev) => setMode(ev.target.value)} options={[{ value: 'venue', label: 'Pay at the venue' }, { value: 'online', label: 'Pay online now' }]} />}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button variant={mine?.response === 'yes' ? 'success' : 'secondary'} icon={Check} loading={rsvp.isPending && rsvp.variables?.response === 'yes'} onClick={() => send('yes')}>Going</Button>
            <Button variant={mine?.response === 'maybe' ? 'primary' : 'secondary'} icon={HelpCircle} loading={rsvp.isPending && rsvp.variables?.response === 'maybe'} onClick={() => send('maybe')}>Maybe</Button>
            <Button variant={mine?.response === 'no' ? 'danger' : 'secondary'} icon={X} loading={cancel.isPending} onClick={() => (mine ? cancel.mutate(e._id) : send('no'))}>Can&apos;t go</Button>
          </div>
          {e.isFull && mine?.state !== 'confirmed' && <p className="text-xs text-amber-700">{t('This event is full. Saying yes puts you on the waitlist.')}</p>}
          {e.rsvpDeadline && <p className="text-xs text-slate-400">{t('RSVP by {date}', { date: dateTime(e.rsvpDeadline) })}</p>}
        </div>
      )}
      {!e.rsvpOpen && e.status === 'scheduled' && !e.isPast && <p className="mt-2 text-sm text-slate-500">{t('RSVPs are closed.')}</p>}

      {mine?.state === 'confirmed' && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button icon={QrCode} variant="secondary" onClick={() => setTicketOpen(true)}>Show ticket</Button>
          {mine.paymentStatus === 'pending' && mine.paymentMode === 'online' && (online ? <Button icon={CreditCard} loading={pay.isPending} onClick={() => pay.mutate(e._id)}>{t('Pay {amount}', { amount: money(mine.amountDue) })}</Button> : <Badge tone="amber" className="self-center">{t('{amount} payable at the society office', { amount: money(mine.amountDue) })}</Badge>)}
          {mine.paymentStatus === 'pending' && mine.paymentMode === 'venue' && <Badge tone="amber" className="self-center">{t('{amount} payable at the venue', { amount: money(mine.amountDue) })}</Badge>}
          {mine.paymentStatus === 'paid' && <Badge tone="green" className="self-center">{t('Paid')}</Badge>}
        </div>
      )}
      {mine?.paymentStatus === 'refund_due' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('You paid {amount} for this event. The committee will refund it.', { amount: money(mine.amountDue) })}</p>}
      {locked && e.rsvpOpen && <p className="mt-3 text-xs text-slate-400">{t('Your ticket is paid. Contact the organisers to change it.')}</p>}
      <TicketModal eventId={e._id} open={ticketOpen} onClose={() => setTicketOpen(false)} />
    </Card>
  );
}

function Attendees({ e }) {
  const { t } = useT();
  const [state, setState] = useState('confirmed');
  const [scanning, setScanning] = useState(false);
  const { data, isLoading } = useEventRsvps(e._id, { state: state || undefined }, true);
  const checkIn = useCheckIn({ toastErrors: true });
  const undo = useUndoCheckIn();
  const collect = useCollect();
  return (
    <Card>
      <CardHeader title="Attendees" subtitle={e.ticketPrice ? t('{going} going · {checkedIn} checked in · {collected} collected', { going: e.counts.going, checkedIn: e.counts.checkedIn, collected: money(e.counts.collected) }) : t('{going} going · {checkedIn} checked in', { going: e.counts.going, checkedIn: e.counts.checkedIn })}
        action={e.status === 'scheduled' && <Button size="sm" icon={ScanLine} onClick={() => setScanning(true)}>Check in</Button>} />
      <div className="border-b border-slate-100 px-4 py-2">
        <Select className="max-w-xs" value={state} onChange={(ev) => setState(ev.target.value)}
          options={[{ value: 'confirmed', label: t('Going ({n} people)', { n: e.counts.going }) }, { value: 'waitlisted', label: t('Waitlist ({n})', { n: e.counts.waitlisted }) }, { value: 'maybe', label: t('Maybe ({n})', { n: e.counts.maybe }) }, { value: 'declined', label: t('Not going ({n})', { n: e.counts.declined }) }, { value: '', label: 'Everyone' }]} />
      </div>
      <Table
        loading={isLoading}
        rows={data?.data}
        empty="No one here yet"
        columns={[
          { key: 'user', header: 'Member', render: (r) => <div><p className="font-medium text-slate-900">{r.user.name}</p><p className="text-xs text-slate-500">{r.user.units?.join(', ')}</p></div> },
          { key: 'headcount', header: 'People', render: (r) => r.headcount },
          { key: 'state', header: 'RSVP', render: (r) => <Badge tone={{ confirmed: 'green', waitlisted: 'amber', maybe: 'blue' }[r.state] || 'slate'}>{t(label(r.state))}</Badge> },
          ...(e.ticketPrice ? [{ key: 'pay', header: 'Payment', render: (r) => (r.paymentStatus === 'not_required' ? '—' : <Badge tone={r.paymentStatus === 'paid' ? 'green' : r.paymentStatus === 'refund_due' ? 'red' : 'amber'}>{r.paymentStatus === 'pending' ? `${money(r.amountDue)} · ${t(label(r.paymentMode))}` : t(label(r.paymentStatus))}</Badge>) }] : []),
          {
            key: 'in',
            header: 'Check-in',
            render: (r) => (r.state !== 'confirmed' ? '—' : r.checkedInAt ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">{dateTime(r.checkedInAt)}<button type="button" title={t('Undo')} onClick={() => undo.mutate({ id: e._id, rsvpId: r._id })} className="rounded p-0.5 text-slate-400 hover:text-slate-600"><Undo2 className="size-3.5" /></button></span>
            ) : (
              <div className="flex gap-1">
                {r.paymentStatus === 'pending' && <Button size="sm" variant="secondary" onClick={() => collect.mutate({ id: e._id, rsvpId: r._id, method: 'cash' })}>Collect</Button>}
                <Button size="sm" variant="secondary" disabled={r.paymentStatus === 'pending'} onClick={() => checkIn.mutate({ id: e._id, rsvpId: r._id })}>Mark attended</Button>
              </div>
            )),
          },
        ]}
      />
      {scanning && <CheckInModal eventId={e._id} open onClose={() => setScanning(false)} />}
    </Card>
  );
}

function Gallery({ e, canAdd, organiser }) {
  const { user } = useAuth();
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const [files, setFiles] = useState([]);
  const [viewing, setViewing] = useState(null);
  const add = useAddPhotos({ onSuccess: () => { setFiles([]); setAdding(false); } });
  const remove = useRemovePhoto();
  if (!e.gallery.length && !canAdd) return null;
  return (
    <Card>
      <CardHeader title="Photos" subtitle={e.gallery.length ? (e.gallery.length > 1 ? t('{n} photos', { n: e.gallery.length }) : t('{n} photo', { n: e.gallery.length })) : 'Share your photos from the event'}
        action={canAdd && <Button size="sm" variant="secondary" icon={ImagePlus} onClick={() => setAdding((a) => !a)}>Add photos</Button>} />
      {adding && (
        <div className="space-y-2 border-b border-slate-100 p-4">
          <FileUpload folder="events" files={files} onChange={setFiles} max={10} label="Choose photos" />
          <Button size="sm" disabled={!files.length} loading={add.isPending} onClick={() => add.mutate({ id: e._id, photos: files.map((f) => f._id) })}>{t('Upload {n}', { n: files.length || '' })}</Button>
        </div>
      )}
      {!e.gallery.length ? <EmptyState icon={Camera} title="No photos yet" /> : (
        <div className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-4 lg:grid-cols-6">
          {e.gallery.map((p) => (
            <button key={p._id} type="button" onClick={() => setViewing(p)} className="aspect-square overflow-hidden rounded-md bg-slate-100">
              <img src={p.url} alt="" loading="lazy" className="size-full object-cover transition hover:scale-105" />
            </button>
          ))}
        </div>
      )}
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.by?.name ? t('Shared by {name}', { name: viewing.by.name }) : 'Photo'} size="lg"
        footer={viewing && (organiser || viewing.by?._id === user._id) && <Button variant="danger" icon={Trash2} onClick={() => remove.mutate({ id: e._id, photoId: viewing._id }, { onSuccess: () => setViewing(null) })}>Remove</Button>}>
        {viewing && <img src={viewing.url} alt="" className="mx-auto max-h-[70vh] rounded-lg" />}
      </Modal>
    </Card>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const organiser = isManager(user);
  const { t } = useT();
  const { data: e, isLoading, error, refetch } = useEvent(id);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useCancelEvent({ onSuccess: () => setCancelling(false) });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const started = new Date(e.startAt) <= new Date();
  const canAddPhotos = started && e.status === 'scheduled' && (organiser || e.myRsvp?.state === 'confirmed');
  const canRsvp = user.role === ROLES.RESIDENT || user.role === ROLES.ADMIN;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('Events')}</Link>
      <Card className="overflow-hidden">
        {e.cover?.url && <img src={e.cover.url} alt="" className="max-h-72 w-full object-cover" />}
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(label(e.category))}</Badge>
            {e.status === 'cancelled' && <Badge tone="red">{t('Cancelled')}</Badge>}
            {e.isFull && e.status === 'scheduled' && <Badge tone="amber">{t('Full · {n} waiting', { n: e.counts.waitlisted })}</Badge>}
            {e.isPast && <Badge>{t('Past event')}</Badge>}
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">{e.title}</h1>
            {organiser && e.status === 'scheduled' && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" variant="secondary" icon={Ban} onClick={() => setCancelling(true)}>Cancel event</Button>
              </div>
            )}
          </div>
          {e.status === 'cancelled' && e.cancelReason && <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{t('Cancelled: {reason}', { reason: e.cancelReason })}</p>}
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" />{whenText(e)}</p>
            {e.venue && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />{e.venue}</p>}
            <p className="flex items-start gap-2"><Users className="mt-0.5 size-4 shrink-0 text-slate-400" />{t('{going} going', { going: e.counts.going })}{e.capacity ? ` · ${t('{left} of {capacity} spots left', { left: e.seatsLeft, capacity: e.capacity })}` : ''}{e.counts.maybe ? ` · ${t('{n} maybe', { n: e.counts.maybe })}` : ''}</p>
            <p className="flex items-start gap-2"><Ticket className="mt-0.5 size-4 shrink-0 text-slate-400" />{e.ticketPrice ? t('{price} per person', { price: money(e.ticketPrice) }) : t('Free')}{e.maxGuests ? ` · ${t('up to {n} guests', { n: e.maxGuests })}` : ''}</p>
          </div>
          {e.description && <RichText text={e.description} mentions={false} className="mt-4 text-[15px] leading-relaxed text-slate-700" />}
          {e.createdBy && <p className="mt-4 text-xs text-slate-400">{t('Organised by {name}', { name: `${e.createdBy.name}${e.createdBy.designation ? ` (${e.createdBy.designation})` : ''}` })}</p>}
        </div>
      </Card>

      {canRsvp && e.status === 'scheduled' && !e.isPast && <RsvpPanel key={`${e.myRsvp?.state}-${e.myRsvp?.headcount}`} e={e} />}
      {organiser && <Attendees e={e} />}
      <Gallery e={e} canAdd={canAddPhotos} organiser={organiser} />

      {editing && <EventFormModal open event={e} onClose={() => setEditing(false)} />}
      <Modal open={cancelling} onClose={() => setCancelling(false)} title="Cancel this event?" description="Everyone who RSVP'd is notified. Paid tickets are marked for refund."
        footer={<><Button variant="secondary" onClick={() => setCancelling(false)}>Keep event</Button><Button variant="danger" loading={cancel.isPending} disabled={reason.trim().length < 3} onClick={() => cancel.mutate({ id, reason: reason.trim() })}>Cancel event</Button></>}>
        <Textarea label="Reason" rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="e.g. Heavy rain forecast" />
      </Modal>
    </div>
  );
}
