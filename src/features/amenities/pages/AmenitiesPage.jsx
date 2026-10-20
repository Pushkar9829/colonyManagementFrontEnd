import { useOnlinePaymentStatus } from '../../colonyPayments/api';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, CalendarDays, Clock, Pencil, Plus, Ticket, Trash2, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { date as fmtDate, label, money, toPaise, toRupees, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import {
  useAddAmenityPhotos,
  useAmenities,
  useAvailability,
  useBook,
  useBookings,
  useCancelBooking,
  useCancellationQuote,
  useCreateAmenity,
  useDecideBooking,
  useMarkAttendance,
  useMarkBookingPaid,
  usePayBooking,
  useRefundDeposit,
  useRemoveAmenityPhoto,
  useUpdateAmenity,
} from '../api';
import { MyPasses } from '../components/MyPasses';

const DESK_METHODS = ['cash', 'upi', 'card', 'cheque', 'bank'].map((v) => ({ value: v, label: v === 'upi' ? 'UPI' : label(v) }));
const bookingStart = (b) => new Date(`${b.date}T${b.startTime}:00+05:30`);
const bookingEnd = (b) => new Date(`${b.date}T${b.endTime}:00+05:30`);

function AmenityModal({ amenity, onClose }) {
  const editing = Boolean(amenity?._id);
  const { values, bind, applyServerErrors } = useForm({
    name: amenity?.name || '',
    description: amenity?.description || '',
    rules: amenity?.rules || '',
    capacity: String(amenity?.capacity ?? 1),
    openTime: amenity?.openTime || '06:00',
    closeTime: amenity?.closeTime || '22:00',
    slotMinutes: String(amenity?.slotMinutes ?? 60),
    maxBookingsPerUnitPerDay: String(amenity?.maxBookingsPerUnitPerDay ?? 1),
    advanceDays: String(amenity?.advanceDays ?? 30),
    fee: String(toRupees(amenity?.fee)),
    deposit: String(toRupees(amenity?.deposit)),
    paymentMode: amenity?.paymentMode || 'online',
    fullRefundHours: String(amenity?.cancellation?.fullRefundHours ?? 24),
    partialRefundHours: String(amenity?.cancellation?.partialRefundHours ?? 6),
    partialRefundPercent: String(amenity?.cancellation?.partialRefundPercent ?? 50),
    requiresApproval: amenity?.requiresApproval ?? false,
    active: amenity?.active ?? true,
  });
  const [photos, setPhotos] = useState([]);
  const addPhotos = useAddAmenityPhotos({ success: false });
  const removePhoto = useRemoveAmenityPhoto();
  const done = async (saved) => {
    if (photos.length) await addPhotos.mutateAsync({ id: saved._id, files: photos.map((p) => p._id) });
    onClose();
  };
  const create = useCreateAmenity({ onSuccess: done });
  const update = useUpdateAmenity({ onSuccess: done });
  const submit = () => {
    const { fullRefundHours, partialRefundHours, partialRefundPercent, ...rest } = values;
    const body = {
      ...rest,
      fee: toPaise(values.fee),
      deposit: toPaise(values.deposit),
      description: values.description || undefined,
      rules: values.rules || undefined,
      cancellation: { fullRefundHours: Number(fullRefundHours), partialRefundHours: Number(partialRefundHours), partialRefundPercent: Number(partialRefundPercent) },
    };
    if (editing) update.mutate({ id: amenity._id, ...body }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };
  const paid = toPaise(values.fee) + toPaise(values.deposit) > 0;
  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${amenity.name}` : 'Add amenity'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending || addPhotos.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input className="sm:col-span-3" label="Name" required {...bind('name')} />
        <Textarea className="sm:col-span-3" label="Description" rows={2} {...bind('description')} />
        <Input label="Opens" type="time" {...bind('openTime')} />
        <Input label="Closes" type="time" {...bind('closeTime')} />
        <Input label="Slot length (min)" type="number" min={15} step={15} {...bind('slotMinutes')} />
        <Input label="Bookings per slot" type="number" min={1} hint="Capacity" {...bind('capacity')} />
        <Input label="Max per home / day" type="number" min={1} {...bind('maxBookingsPerUnitPerDay')} />
        <Input label="Book up to (days)" type="number" min={0} {...bind('advanceDays')} />
        <Input label="Fee per slot (₹)" type="number" min={0} {...bind('fee')} />
        <Input label="Refundable deposit (₹)" type="number" min={0} hint="Returned after the event" {...bind('deposit')} />
        <Select label="Payment" options={[{ value: 'online', label: 'Pay online to confirm' }, { value: 'desk', label: 'Pay at the office' }]} {...bind('paymentMode')} />
        {paid && (
          <div className="rounded-lg bg-slate-50 p-3 sm:col-span-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Cancellation policy (fee refund)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Full refund if cancelled ≥ (hours before)" type="number" min={0} {...bind('fullRefundHours')} />
              <Input label="Partial refund if ≥ (hours before)" type="number" min={0} {...bind('partialRefundHours')} />
              <Input label="Partial refund (%)" type="number" min={0} max={100} {...bind('partialRefundPercent')} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Later cancellations get no fee refund. Deposits are always returned on cancellation.</p>
          </div>
        )}
        <Textarea className="sm:col-span-3" label="Rules" rows={2} {...bind('rules')} />
        <div className="space-y-2 sm:col-span-3">
          <p className="text-sm font-medium text-slate-700">Photos</p>
          {amenity?.photos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenity.photos.map((p) => (
                <div key={p._id} className="relative size-20 overflow-hidden rounded-lg border border-slate-200">
                  <img src={p.url} alt={p.name || 'Amenity'} className="size-full object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => removePhoto.mutate({ id: amenity._id, photoId: p._id })} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-1 text-slate-600 shadow hover:text-red-600">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <FileUpload folder="amenities" files={photos} onChange={setPhotos} max={5} label="Add photos" />
        </div>
        <Checkbox label="Requires approval" checked={values.requiresApproval} onChange={bind('requiresApproval').onChange} />
        <Checkbox label="Active" checked={values.active} onChange={bind('active').onChange} />
      </div>
    </Modal>
  );
}

function priceLine(amenity) {
  const parts = [];
  if (amenity.fee) parts.push(`${money(amenity.fee)} per slot`);
  if (amenity.deposit) parts.push(`${money(amenity.deposit)} refundable deposit`);
  if (parts.length && amenity.paymentMode === 'desk') parts.push('pay at the office');
  return parts.join(' · ');
}

function BookingPanel({ amenity }) {
  const [day, setDay] = useState(todayISO());
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const { data, isLoading } = useAvailability(amenity._id, day);
  const pay = usePayBooking();
  // Only open the payment window when the society takes online payments.
  const online = useOnlinePaymentStatus().data?.online === true;
  const book = useBook({
    onSuccess: (b) => {
      setSlot(null);
      setNotes('');
      if (b.status === 'payment_pending' && online) pay.mutate(b);
    },
  });
  const now = new Date();
  const isToday = day === todayISO();
  const past = (s) => isToday && Number(s.startTime.slice(0, 2)) * 60 + Number(s.startTime.slice(3)) <= now.getHours() * 60 + now.getMinutes();
  const policy = amenity.cancellation || {};

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Book {amenity.name}</h3>
          <p className="text-sm text-slate-500">{amenity.slotMinutes} min slots · {amenity.requiresApproval ? 'needs approval' : 'instant confirmation'}{priceLine(amenity) ? ` · ${priceLine(amenity)}` : ''}</p>
        </div>
        <Input title="Booking date" type="date" min={todayISO()} value={day} onChange={(e) => { setDay(e.target.value); setSlot(null); }} />
      </div>
      {amenity.photos?.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {amenity.photos.map((p) => <img key={p._id} src={p.url} alt={amenity.name} className="h-24 w-36 shrink-0 rounded-lg object-cover" />)}
        </div>
      )}
      {amenity.rules && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{amenity.rules}</p>}
      {amenity.fee > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Cancellation: full fee refund up to {policy.fullRefundHours ?? 24} h before, {policy.partialRefundPercent ?? 50}% up to {policy.partialRefundHours ?? 6} h before, none after.
        </p>
      )}
      <div className="mt-4">
        {isLoading ? <Spinner /> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {data?.slots.map((s) => {
              const disabled = s.available === 0 || past(s);
              const selected = slot?.startTime === s.startTime;
              return (
                <button key={s.startTime} type="button" disabled={disabled} onClick={() => setSlot(s)}
                  className={cn('rounded-lg border px-2 py-2 text-sm', selected ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 hover:border-brand-300', disabled && 'cursor-not-allowed bg-slate-50 text-slate-300 hover:border-slate-200')}>
                  <p className="font-medium">{s.startTime}–{s.endTime}</p>
                  <p className="text-[11px]">{past(s) ? 'Past' : s.available ? `${s.available} left` : 'Full'}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {slot && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input className="flex-1" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button loading={book.isPending || pay.isPending} onClick={() => book.mutate({ amenity: amenity._id, date: day, startTime: slot.startTime, endTime: slot.endTime, notes: notes || undefined })}>
            {amenity.fee + (amenity.deposit || 0) > 0 && amenity.paymentMode !== 'desk' && !amenity.requiresApproval ? `Book & pay ${slot.startTime}–${slot.endTime}` : `Book ${slot.startTime}–${slot.endTime}`}
          </Button>
        </div>
      )}
    </Card>
  );
}

function CancelModal({ booking, manager, onClose }) {
  const { data: q, isLoading } = useCancellationQuote(booking._id);
  const [reason, setReason] = useState('');
  const cancel = useCancelBooking({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Cancel booking" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Keep booking</Button><Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate({ id: booking._id, reason: reason || undefined })}>Cancel booking</Button></>}>
      <p className="text-sm text-slate-600">{booking.amenity?.name} · {fmtDate(booking.date)} {booking.startTime}–{booking.endTime}</p>
      {isLoading ? <Spinner className="mt-4" /> : q && q.feePaid + q.depositPaid > 0 ? (
        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
          <p>Fee refund: <span className="font-semibold">{money(q.feeRefund)}</span> of {money(q.feePaid)} ({q.percent}%)</p>
          {q.depositPaid > 0 && <p>Deposit refund: <span className="font-semibold">{money(q.depositRefund)}</span></p>}
        </div>
      ) : <p className="mt-3 text-sm text-slate-500">Nothing has been paid for this booking.</p>}
      {manager && <Input className="mt-3" label="Reason (sent to the resident)" value={reason} onChange={(e) => setReason(e.target.value)} />}
    </Modal>
  );
}

function DeskPaymentModal({ booking, onClose }) {
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const markPaid = useMarkBookingPaid({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Record desk payment" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={markPaid.isPending} onClick={() => markPaid.mutate({ id: booking._id, method, reference: reference || undefined })}>Record {money(booking.fee + booking.deposit)}</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Fee {money(booking.fee)}{booking.deposit ? ` + deposit ${money(booking.deposit)}` : ''}</p>
        <Select label="Method" options={DESK_METHODS} value={method} onChange={(e) => setMethod(e.target.value)} />
        <Input label="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
    </Modal>
  );
}

function DepositModal({ booking, onClose }) {
  const held = booking.deposit;
  const [amount, setAmount] = useState(String(toRupees(held)));
  const [reason, setReason] = useState('');
  const refund = useRefundDeposit({ onSuccess: onClose });
  const deduction = held - toPaise(amount);
  return (
    <Modal open onClose={onClose} title="Refund deposit" description={`${booking.amenity?.name} · ${fmtDate(booking.date)} · ${booking.user?.name}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={refund.isPending} onClick={() => refund.mutate({ id: booking._id, amount: toPaise(amount), reason: reason || undefined })}>Refund {money(toPaise(amount))}</Button></>}>
      <div className="space-y-3">
        <Input label="Refund amount (₹)" type="number" min={0} max={toRupees(held)} value={amount} onChange={(e) => setAmount(e.target.value)} hint={`Deposit held: ${money(held)}`} />
        {deduction > 0 && <Textarea label="Reason for the deduction" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} hint={`${money(deduction)} will be kept`} />}
      </div>
    </Modal>
  );
}

function BookingsTable({ params, manager, showDecide }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBookings({ ...params, page });
  const decide = useDecideBooking();
  const pay = usePayBooking();
  const attendance = useMarkAttendance();
  const [cancelling, setCancelling] = useState(null);
  const [desk, setDesk] = useState(null);
  const [deposit, setDeposit] = useState(null);
  const now = new Date();
  return (
    <Card>
      <Table loading={isLoading} rows={data?.data} empty="No bookings"
        columns={[
          { key: 'amenity', header: 'Amenity', render: (b) => <span className="font-medium text-slate-900">{b.amenity?.name}</span> },
          { key: 'date', header: 'Date', render: (b) => fmtDate(b.date) },
          { key: 'time', header: 'Time', render: (b) => `${b.startTime}–${b.endTime}` },
          ...(manager ? [{ key: 'who', header: 'Booked by', render: (b) => `${b.user?.name}${b.unit ? ` · ${b.unit.label}` : ''}` }] : []),
          {
            key: 'fee', header: 'Charges', render: (b) => (b.fee || b.deposit ? (
              <div className="text-xs">
                <p>{money(b.fee)}{b.deposit ? ` + ${money(b.deposit)} dep.` : ''}</p>
                <p className="text-slate-500">{label(b.paymentStatus)}{b.deposit && b.depositStatus !== 'due' ? ` · deposit ${label(b.depositStatus)}` : ''}</p>
              </div>
            ) : 'Free'),
          },
          { key: 'status', header: 'Status', render: (b) => <div className="flex items-center gap-1"><StatusBadge status={b.status} />{b.attendance === 'no_show' && <Badge tone="red">No-show</Badge>}</div> },
          {
            key: 'a', header: '', render: (b) => (
              <div className="flex flex-wrap justify-end gap-1">
                {showDecide && b.status === 'pending' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => decide.mutate({ id: b._id, approve: true })}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => { const note = window.prompt('Reason for rejection'); if (note !== null) decide.mutate({ id: b._id, approve: false, note: note || undefined }); }}>Reject</Button>
                  </>
                )}
                {!manager && b.status === 'payment_pending' && (online ? <Button size="sm" loading={pay.isPending && pay.variables?._id === b._id} onClick={() => pay.mutate(b)}>Pay {money(b.fee + b.deposit)}</Button> : <span className="text-xs text-slate-500">Pay {money(b.fee + b.deposit)} at the society office</span>)}
                {manager && ['pay_at_desk', 'pending'].includes(b.paymentStatus) && ['confirmed', 'payment_pending', 'pending'].includes(b.status) && <Button size="sm" variant="secondary" onClick={() => setDesk(b)}>Record payment</Button>}
                {manager && b.depositStatus === 'held' && bookingEnd(b) < now && <Button size="sm" variant="secondary" onClick={() => setDeposit(b)}>Refund deposit</Button>}
                {manager && b.status === 'confirmed' && !b.attendance && bookingStart(b) < now && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => attendance.mutate({ id: b._id, attended: true })}>Attended</Button>
                    <Button size="sm" variant="ghost" onClick={() => attendance.mutate({ id: b._id, attended: false })}>No-show</Button>
                  </>
                )}
                {['pending', 'confirmed', 'payment_pending'].includes(b.status) && (manager || bookingStart(b) > now) && !showDecide && <Button size="sm" variant="ghost" onClick={() => setCancelling(b)}>Cancel</Button>}
              </div>
            ),
          },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {cancelling && <CancelModal booking={cancelling} manager={manager} onClose={() => setCancelling(null)} />}
      {desk && <DeskPaymentModal booking={desk} onClose={() => setDesk(null)} />}
      {deposit && <DepositModal booking={deposit} onClose={() => setDeposit(null)} />}
    </Card>
  );
}

export default function AmenitiesPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || (manager ? 'amenities' : 'book');
  const setTab = (t) => setParams({ tab: t }, { replace: true });
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const { data: amenities = [], isLoading } = useAmenities();
  const { data: pending } = useBookings({ status: 'pending', limit: 1 });
  const { data: deposits } = useBookings({ depositHeld: true, limit: 1 });

  const tabs = manager
    ? [{ value: 'amenities', label: 'Amenities' }, { value: 'requests', label: 'Requests', count: pending?.meta?.total }, { value: 'deposits', label: 'Deposits held', count: deposits?.meta?.total }, { value: 'all', label: 'All bookings' }]
    : [{ value: 'book', label: 'Book' }, { value: 'mine', label: 'My bookings' }, { value: 'passes', label: 'Memberships' }];

  const current = amenities.find((a) => a._id === selected) || (!manager ? amenities.find((a) => a.active) : null);

  return (
    <div>
      <PageHeader
        title="Amenities"
        description={manager ? 'Manage facilities, payments and booking requests.' : 'Book the clubhouse, courts, gym and more.'}
        actions={manager && (
          <>
            <Link to="/amenities/passes"><Button variant="secondary" icon={Ticket}>Memberships</Button></Link>
            <Link to="/amenities/reports"><Button variant="secondary" icon={BarChart3}>Reports</Button></Link>
            <Button icon={Plus} onClick={() => setEditing({})}>Add amenity</Button>
          </>
        )}
      />
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />

      {(tab === 'book' || tab === 'amenities') && (
        isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !amenities.length ? <Card><EmptyState icon={CalendarDays} title="No amenities yet" /></Card> : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((a) => (
                <Card key={a._id} className={cn('overflow-hidden transition', !manager && 'cursor-pointer hover:border-brand-300', current?._id === a._id && !manager && 'border-brand-500 ring-2 ring-brand-500/20')} onClick={() => !manager && setSelected(a._id)}>
                  {a.photos?.[0] && <img src={a.photos[0].url} alt={a.name} className="h-32 w-full object-cover" />}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{a.name}</h3>
                      <div className="flex gap-1">
                        {!a.active && <Badge tone="red">Inactive</Badge>}
                        {a.requiresApproval && <Badge tone="amber">Approval</Badge>}
                        {manager && <button type="button" onClick={() => setEditing(a)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={`Edit ${a.name}`}><Pencil className="size-4" /></button>}
                      </div>
                    </div>
                    {a.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="size-3.5" />{a.openTime}–{a.closeTime}</span>
                      <span className="flex items-center gap-1"><Users className="size-3.5" />{a.capacity} per slot</span>
                      <span>{a.fee ? money(a.fee) : 'Free'}{a.deposit ? ` + ${money(a.deposit)} deposit` : ''}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {!manager && current && <BookingPanel key={current._id} amenity={current} />}
          </div>
        )
      )}
      {tab === 'mine' && <BookingsTable params={{ upcoming: true }} />}
      {tab === 'passes' && <MyPasses amenities={amenities} />}
      {tab === 'requests' && <BookingsTable params={{ status: 'pending' }} manager showDecide />}
      {tab === 'deposits' && <BookingsTable params={{ depositHeld: true }} manager />}
      {tab === 'all' && <BookingsTable params={{}} manager />}
      {editing && <AmenityModal amenity={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
