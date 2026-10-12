import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Clock, Flag, MessageCircle, Pencil, Phone, Plus, Search, ShieldAlert, ShoppingBag, Store, Tag, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, Checkbox, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { label, money, timeAgo, toPaise, toRupees } from '../../../lib/format';
import { isManager, ROLES } from '../../../lib/roles';
import { personLine } from '../../forum/components/RichText';
import { ReportModal } from '../../forum/components/ReportModal';
import {
  useBusinesses, useContactBusiness, useContactSeller, useCreateBusiness, useCreateListing, useDeleteBusiness, useDeleteListing, useListing, useListingReports, useListings,
  useListingStatus, useReportListing, useResolveListingReport, useReviewBusiness, useUpdateBusiness, useUpdateListing,
} from '../api';

const TYPES = ['sell', 'buy', 'rent', 'free', 'services'];
const TYPE_LABEL = { sell: 'For sale', buy: 'Wanted', rent: 'For rent', free: 'Free', services: 'Services' };
const TYPE_TONE = { sell: 'brand', buy: 'blue', rent: 'amber', free: 'green', services: 'slate' };
const CATEGORIES = ['furniture', 'electronics', 'appliances', 'vehicles', 'books', 'kids', 'clothing', 'sports', 'home', 'property', 'services', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'not_applicable'];
const UNITS = { total: '', per_hour: '/ hour', per_day: '/ day', per_month: '/ month' };
const BUSINESS_CATEGORIES = ['tutor', 'tiffin', 'baking', 'beauty', 'fitness', 'repairs', 'tailoring', 'childcare', 'pet_care', 'other'];
const LISTING_REPORT_REASONS = [
  { value: 'scam', label: 'Looks like a scam' },
  { value: 'prohibited', label: 'Prohibited item' },
  { value: 'offensive', label: 'Offensive' },
  { value: 'spam', label: 'Spam / duplicate' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'other', label: 'Something else' },
];

const priceText = (l) => (l.type === 'free' ? 'Free' : l.price ? `${money(l.price)} ${UNITS[l.priceUnit] || ''}`.trim() : l.type === 'buy' ? 'Budget open' : 'Price on request');

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
    </div>
  );
}

function ListingFormModal({ open, onClose, listing }) {
  const editing = Boolean(listing);
  const { values, bind, applyServerErrors } = useForm({
    type: listing?.type || 'sell', title: listing?.title || '', description: listing?.description || '', category: listing?.category || 'other',
    condition: listing?.condition || 'good', price: listing ? toRupees(listing.price) : '', priceUnit: listing?.priceUnit || 'total',
    negotiable: listing?.negotiable || false, showPhone: listing?.showPhone || false,
  });
  const [photos, setPhotos] = useState([]);
  const create = useCreateListing({ onSuccess: onClose });
  const update = useUpdateListing({ onSuccess: onClose });
  const submit = () => {
    const { type, ...rest } = values;
    const body = { ...rest, description: values.description || undefined, price: values.type === 'free' ? 0 : toPaise(values.price), photos: photos.length ? photos.map((p) => p._id) : undefined };
    if (editing) update.mutate({ id: listing._id, ...body }, { onError: applyServerErrors });
    else create.mutate({ type, ...body }, { onError: applyServerErrors });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit listing' : 'New listing'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>{editing ? 'Save' : 'Post listing'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!editing && <Select label="Type" options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} {...bind('type')} />}
        <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} {...bind('category')} />
        <Input className="sm:col-span-2" label="Title" required placeholder="e.g. Wooden study table" {...bind('title')} />
        <Textarea className="sm:col-span-2" label="Description" rows={4} {...bind('description')} />
        {values.type !== 'free' && <Input type="number" min="0" label={values.type === 'buy' ? 'Budget (₹)' : 'Price (₹)'} hint="Leave empty for 'on request'" {...bind('price')} />}
        {['rent', 'services'].includes(values.type) && <Select label="Per" options={[{ value: 'total', label: 'One time' }, { value: 'per_hour', label: 'Hour' }, { value: 'per_day', label: 'Day' }, { value: 'per_month', label: 'Month' }]} {...bind('priceUnit')} />}
        {['sell', 'free', 'rent'].includes(values.type) && <Select label="Condition" options={CONDITIONS.map((c) => ({ value: c, label: label(c) }))} {...bind('condition')} />}
        <div className="space-y-2 sm:col-span-2">
          {values.type !== 'free' && <Checkbox label="Price is negotiable" checked={values.negotiable} onChange={bind('negotiable').onChange} />}
          <Checkbox label="Show my phone number on this listing" checked={values.showPhone} onChange={bind('showPhone').onChange} />
          <p className="text-xs text-slate-500">Buyers can always message you in the app — your number stays private unless you tick this.</p>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">{editing ? 'Add more photos' : 'Photos'}</p>
          <FileUpload folder="marketplace" files={photos} onChange={setPhotos} max={8} label="Add photos" />
        </div>
      </div>
    </Modal>
  );
}

function ListingModal({ id, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: l, isLoading } = useListing(id);
  const [message, setMessage] = useState('Hi! Is this still available?');
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const contact = useContactSeller({ onSuccess: (d) => navigate(`/messages/${d.conversation._id}`) });
  const setStatus = useListingStatus();
  const remove = useDeleteListing({ onSuccess: onClose });
  const report = useReportListing({ onSuccess: () => setReporting(false) });
  return (
    <Modal open={Boolean(id)} onClose={onClose} title={l?.title || 'Listing'} size="lg">
      {isLoading || !l ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="space-y-4">
          {l.photos.length > 0 && (
            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1">
              {l.photos.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="shrink-0 snap-start"><img src={p.url} alt="" className="h-56 w-auto max-w-[80vw] rounded-lg object-cover" /></a>)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TYPE_TONE[l.type]}>{TYPE_LABEL[l.type]}</Badge>
            <Badge>{label(l.category)}</Badge>
            {l.condition !== 'not_applicable' && <Badge>{label(l.condition)}</Badge>}
            {l.status !== 'active' && <Badge tone={l.status === 'sold' ? 'green' : 'red'}>{label(l.status)}</Badge>}
          </div>
          <p className="text-2xl font-semibold text-slate-900">{priceText(l)}{l.negotiable && <span className="ml-2 text-sm font-normal text-slate-500">negotiable</span>}</p>
          {l.description && <p className="whitespace-pre-wrap text-sm text-slate-700">{l.description}</p>}
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-800">{personLine(l.seller)}</p>
            <p className="text-xs text-slate-500">Posted {timeAgo(l.createdAt)}</p>
            {l.seller.phone && <a href={`tel:${l.seller.phone}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700"><Phone className="size-4" />{l.seller.phone}</a>}
          </div>
          {l.status === 'removed' && l.removedReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Removed by the moderators: {l.removedReason}</p>}

          {l.isMine ? (
            l.status !== 'removed' && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
                {l.status === 'active' ? (
                  <>
                    <Button size="sm" variant="success" icon={Check} onClick={() => setStatus.mutate({ id: l._id, status: 'sold' })}>{l.type === 'buy' ? 'Found it' : l.type === 'rent' ? 'Rented out' : 'Mark sold'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: l._id, status: 'closed' })}>Close</Button>
                  </>
                ) : <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: l._id, status: 'active' })}>Relist</Button>}
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => window.confirm('Delete this listing?') && remove.mutate(l._id)}>Delete</Button>
              </div>
            )
          ) : l.status === 'active' ? (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <Textarea label={`Message ${l.seller.name.split(' ')[0]}`} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button icon={MessageCircle} loading={contact.isPending} disabled={!message.trim()} onClick={() => contact.mutate({ id: l._id, message: message.trim() })}>Send message</Button>
                {!l.reportedByMe ? <Button variant="ghost" icon={Flag} onClick={() => setReporting(true)}>Report</Button> : <span className="self-center text-xs text-slate-400">You reported this listing</span>}
                {isManager(user) && <Button variant="ghost" icon={Trash2} onClick={() => window.confirm('Remove this listing for everyone?') && remove.mutate(l._id)}>Remove</Button>}
              </div>
            </div>
          ) : null}
          {editing && <ListingFormModal open listing={l} onClose={() => setEditing(false)} />}
          {reporting && <ReportModal open title="Report this listing" reasons={LISTING_REPORT_REASONS} loading={report.isPending} onClose={() => setReporting(false)} onSubmit={(b) => report.mutate({ id: l._id, ...b })} />}
        </div>
      )}
    </Modal>
  );
}

function Listings({ openId, onOpen }) {
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useListings({ type: type || undefined, category: category || undefined, search: search || undefined, mine: mine || undefined, page, limit: 24 });
  const reset = () => setPage(1);
  return (
    <>
      {/* phones: the button gets its own row so it never sits on top of the chips */}
      <div className="mb-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {['', ...TYPES].map((t) => (
            <button key={t || 'all'} type="button" onClick={() => { setType(t); reset(); }} className={cn('inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium sm:min-h-8', type === t ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600')}>{t ? TYPE_LABEL[t] : 'All'}</button>
          ))}
        </div>
        <Button className="w-full shrink-0 sm:w-auto" icon={Plus} onClick={() => setCreating(true)}>Sell / post</Button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
        <SearchBox value={search} onChange={(v) => { setSearch(v); reset(); }} placeholder="Search listings" />
        <Select value={category} onChange={(e) => { setCategory(e.target.value); reset(); }} placeholder="All categories" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} />
        <Checkbox className="h-10" label="My listings" checked={mine} onChange={(e) => { setMine(e.target.checked); reset(); }} />
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
        <Card><EmptyState icon={ShoppingBag} title={mine ? "You haven't listed anything" : 'No listings yet'} description="Sell furniture, give away books, find a maid's reference or rent out a parking slot." action={<Button icon={Plus} onClick={() => setCreating(true)}>Post a listing</Button>} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.data.map((l) => (
              <Card key={l._id} className="cursor-pointer overflow-hidden transition hover:border-brand-200" onClick={() => onOpen(l._id)}>
                <div className="relative">
                  {l.photos[0] ? <img src={l.photos[0].url} alt="" className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-slate-50"><Tag className="size-8 text-slate-300" /></div>}
                  <Badge tone={TYPE_TONE[l.type]} className="absolute left-2 top-2 bg-white/90">{TYPE_LABEL[l.type]}</Badge>
                  {l.status !== 'active' && <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-semibold uppercase text-slate-700">{label(l.status)}</span>}
                </div>
                <div className="p-2.5">
                  <p className="font-semibold text-slate-900">{priceText(l)}</p>
                  <p className="truncate text-sm text-slate-700">{l.title}</p>
                  <p className="truncate text-xs text-slate-400">{l.seller.units?.join(', ')} · {timeAgo(l.createdAt)}</p>
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
      {creating && <ListingFormModal open onClose={() => setCreating(false)} />}
      {openId && <ListingModal id={openId} onClose={() => onOpen(null)} />}
    </>
  );
}

function BusinessModal({ open, onClose, business }) {
  const { values, bind, applyServerErrors } = useForm({
    name: business?.name || '', category: business?.category || 'tutor', description: business?.description || '',
    priceNote: business?.priceNote || '', timings: business?.timings || '', contactPhone: business?.contactPhone || '',
  });
  const [photos, setPhotos] = useState([]);
  const create = useCreateBusiness({ onSuccess: onClose });
  const update = useUpdateBusiness({ onSuccess: onClose });
  const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v]));
  const submit = () => {
    const body = { ...clean, photos: photos.length ? photos.map((p) => p._id) : undefined };
    if (business) update.mutate({ id: business._id, ...body }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };
  return (
    <Modal open={open} onClose={onClose} title={business ? 'Edit business' : 'List your business'} description="The society admin approves local businesses before neighbours can see them."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>{business ? 'Save & resubmit' : 'Submit for approval'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Business name" required {...bind('name')} />
        <Select label="Category" options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} {...bind('category')} />
        <Input label="Business phone" hint="Shown to neighbours once approved" {...bind('contactPhone')} />
        <Textarea className="sm:col-span-2" label="What you offer" rows={3} {...bind('description')} />
        <Input label="Pricing" placeholder="e.g. ₹3,000 / month" {...bind('priceNote')} />
        <Input label="Timings" placeholder="e.g. Mon–Sat, 4–7 pm" {...bind('timings')} />
        <FileUpload className="sm:col-span-2" folder="marketplace" files={photos} onChange={setPhotos} max={6} label="Add photos" />
      </div>
    </Modal>
  );
}

function Businesses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const admin = user.role === ROLES.ADMIN;
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('approved');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | business
  const params = { category: category || undefined, search: search || undefined, page, ...(view === 'mine' ? { mine: true } : view === 'pending' ? { status: 'pending' } : {}) };
  const { data, isLoading } = useBusinesses(params);
  const review = useReviewBusiness();
  const remove = useDeleteBusiness();
  const contact = useContactBusiness({ onSuccess: (d) => navigate(`/messages/${d.conversation._id}`) });
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Tabs className="w-fit" value={view} onChange={(v) => { setView(v); setPage(1); }}
          tabs={[{ value: 'approved', label: 'Directory' }, { value: 'mine', label: 'Mine' }, ...(admin ? [{ value: 'pending', label: 'Awaiting approval' }] : [])]} />
        <Button icon={Plus} onClick={() => setEditing('new')}>List your business</Button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tutors, tiffin, beauty…" />
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} />
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
        <Card><EmptyState icon={Store} title={view === 'pending' ? 'Nothing to approve' : 'No local businesses yet'} description="Home tutors, tiffin services and other neighbours' businesses appear here after admin approval." /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.data.map((b) => (
              <Card key={b._id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">{label(b.category)} · by {personLine(b.owner)}</p>
                  </div>
                  {b.status !== 'approved' && <Badge tone={b.status === 'pending' ? 'amber' : 'red'}>{b.status === 'pending' ? <><Clock className="mr-1 size-3" />Pending</> : 'Rejected'}</Badge>}
                </div>
                {b.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{b.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {b.priceNote && <span>{b.priceNote}</span>}
                  {b.timings && <span>{b.timings}</span>}
                </div>
                {b.photos?.length > 0 && <div className="mt-2"><Attachments items={b.photos.slice(0, 4)} /></div>}
                {b.rejectReason && <p className="mt-2 text-xs text-red-600">Not approved: {b.rejectReason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.status === 'approved' && b.contactPhone && <a href={`tel:${b.contactPhone}`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"><Phone className="size-3.5" />{b.contactPhone}</a>}
                  {b.status === 'approved' && !b.isMine && <Button size="sm" variant="ghost" icon={MessageCircle} onClick={() => contact.mutate({ id: b._id, message: `Hi! I found ${b.name} in the marketplace and would like to know more.` })}>Message</Button>}
                  {b.isMine && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(b)}>Edit</Button>}
                  {admin && b.status !== 'approved' && <Button size="sm" variant="success" icon={Check} onClick={() => review.mutate({ id: b._id, status: 'approved' })}>Approve</Button>}
                  {admin && b.status === 'pending' && <Button size="sm" variant="secondary" icon={X} onClick={() => { const reason = window.prompt('Reason for rejecting'); if (reason) review.mutate({ id: b._id, status: 'rejected', reason }); }}>Reject</Button>}
                  {(b.isMine || isManager(user)) && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => window.confirm(`Remove ${b.name}?`) && remove.mutate(b._id)}>Remove</Button>}
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
      {editing && <BusinessModal open business={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function Moderation({ onOpen }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListingReports(true, { page });
  const resolve = useResolveListingReport();
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data?.data.length) return <Card><EmptyState icon={ShieldAlert} title="No reported listings" /></Card>;
  return (
    <div className="space-y-3">
      {data.data.map((r) => (
        <Card key={r._id} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="red"><Flag className="mr-1 size-3" />{label(r.reason)}</Badge>
            <span className="text-xs text-slate-400">by {r.reporter?.name} · {timeAgo(r.createdAt)}</span>
          </div>
          {r.listing && (
            <button type="button" onClick={() => onOpen(r.listing._id)} className="mt-2 block text-left">
              <p className="font-semibold text-slate-900">{r.listing.title}</p>
              <p className="text-xs text-slate-500">{TYPE_LABEL[r.listing.type]} · {personLine(r.listing.seller)} · {label(r.listing.status)}</p>
            </button>
          )}
          {r.note && <p className="mt-1 text-sm text-slate-600">“{r.note}”</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => resolve.mutate({ id: r._id, action: 'dismiss' })}>Dismiss</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => { const reason = window.prompt('Reason shown to the seller', 'Removed for breaking the marketplace rules'); if (reason !== null) resolve.mutate({ id: r._id, action: 'remove', reason: reason || undefined }); }}>Remove listing</Button>
          </div>
        </Card>
      ))}
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'listings';
  const openId = params.get('listing');
  const setTab = (t) => setParams(t === 'listings' ? {} : { tab: t });
  const open = (id) => setParams(id ? { ...(tab !== 'listings' ? { tab } : {}), listing: id } : tab !== 'listings' ? { tab } : {});
  return (
    <div>
      <PageHeader title="Marketplace" description="Buy, sell, rent and give away within the society. Find local businesses run by neighbours." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab}
        tabs={[{ value: 'listings', label: 'Listings' }, { value: 'businesses', label: 'Local businesses' }, ...(isManager(user) ? [{ value: 'moderation', label: 'Reports' }] : [])]} />
      {tab === 'listings' && <Listings openId={openId} onOpen={open} />}
      {tab === 'businesses' && <Businesses />}
      {tab === 'moderation' && isManager(user) && (
        <>
          <Moderation onOpen={open} />
          {openId && <ListingModal id={openId} onClose={() => open(null)} />}
        </>
      )}
    </div>
  );
}
