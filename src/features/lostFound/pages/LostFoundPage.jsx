import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, MapPin, MessageCircle, PackageSearch, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, label, timeAgo, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { personLine } from '../../forum/components/RichText';
import { useOpenDirect } from '../../chat/api';
import { useClaim, useCreateItem, useDecideClaim, useDeleteItem, useItemStatus, useLostFound, useLostFoundItem, useWithdrawClaim } from '../api';

const CATEGORIES = ['keys', 'wallet', 'phone', 'electronics', 'documents', 'jewellery', 'clothing', 'bag', 'pet', 'toy', 'other'];
const STATUS_TONE = { open: 'amber', resolved: 'green', expired: 'slate', closed: 'slate' };

function PostModal({ open, onClose }) {
  const { values, bind, applyServerErrors, reset } = useForm({ kind: 'found', title: '', category: 'other', description: '', location: '', date: todayISO() });
  const [photos, setPhotos] = useState([]);
  const create = useCreateItem({ onSuccess: () => { reset(); setPhotos([]); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Post to lost & found"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...values, description: values.description || undefined, location: values.location || undefined, photos: photos.length ? photos.map((p) => p._id) : undefined }, { onError: applyServerErrors })}>Post</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Tabs className="w-fit sm:col-span-2" value={values.kind} onChange={(v) => bind('kind').onChange({ target: { value: v } })} tabs={[{ value: 'found', label: 'I found something' }, { value: 'lost', label: 'I lost something' }]} />
        <Input className="sm:col-span-2" label="What" required placeholder="e.g. Car keys with a red tag" {...bind('title')} />
        <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} {...bind('category')} />
        <Input type="date" label={values.kind === 'found' ? 'Found on' : 'Lost on'} max={todayISO()} {...bind('date')} />
        <Input className="sm:col-span-2" label="Where" placeholder="e.g. Near the gym" {...bind('location')} />
        <Textarea className="sm:col-span-2" label="Details" rows={3} hint={values.kind === 'found' ? 'Tip: hold back one detail so the real owner can prove it is theirs.' : undefined} {...bind('description')} />
        <FileUpload className="sm:col-span-2" folder="lostfound" files={photos} onChange={setPhotos} max={6} label="Add photos" />
      </div>
    </Modal>
  );
}

function ItemModal({ id, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: item, isLoading } = useLostFoundItem(id);
  const [message, setMessage] = useState('');
  const claim = useClaim({ onSuccess: () => setMessage('') });
  const withdraw = useWithdrawClaim();
  const decide = useDecideClaim();
  const status = useItemStatus();
  const remove = useDeleteItem({ onSuccess: onClose });
  const chat = useOpenDirect({ onSuccess: (c) => navigate(`/messages/${c._id}`) });

  return (
    <Modal open={Boolean(id)} onClose={onClose} title={item?.title || 'Item'} size="lg">
      {isLoading || !item ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={item.kind === 'lost' ? 'red' : 'blue'}>{item.kind === 'lost' ? 'Lost' : 'Found'}</Badge>
            <Badge tone={STATUS_TONE[item.status]}>{label(item.status)}</Badge>
            <Badge>{label(item.category)}</Badge>
          </div>
          <Attachments items={item.photos} />
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {item.location && <p className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" />{item.location}</p>}
            {item.date && <p className="flex items-center gap-2"><CalendarDays className="size-4 text-slate-400" />{date(item.date)}</p>}
          </div>
          {item.description && <p className="whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>}
          <p className="text-xs text-slate-400">Posted by {personLine(item.postedBy)} · {timeAgo(item.createdAt)}{item.status === 'open' ? ` · expires ${date(item.expiresAt)}` : ''}</p>

          {item.isMine ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">{item.kind === 'found' ? 'People who say it is theirs' : 'People who may have found it'}</h3>
              {!item.claims.length ? <p className="text-sm text-slate-400">No responses yet.</p> : (
                <ul className="space-y-2">
                  {item.claims.map((c) => (
                    <li key={c._id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{personLine(c.by)}</p>
                        <Badge tone={{ pending: 'amber', accepted: 'green', rejected: 'slate', withdrawn: 'slate' }[c.status]}>{label(c.status)}</Badge>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{c.message}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" icon={MessageCircle} onClick={() => chat.mutate(c.by._id)}>Message</Button>
                        {c.status === 'pending' && item.status === 'open' && (
                          <>
                            <Button size="sm" variant="success" icon={Check} onClick={() => window.confirm(`Confirm ${c.by.name}? The post will be marked as returned.`) && decide.mutate({ id: item._id, claimId: c._id, accept: true })}>Confirm & resolve</Button>
                            <Button size="sm" variant="secondary" icon={X} onClick={() => decide.mutate({ id: item._id, claimId: c._id, accept: false })}>Decline</Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                {item.status === 'open' && <Button size="sm" variant="secondary" onClick={() => status.mutate({ id: item._id, status: 'resolved' })}>Mark resolved</Button>}
                {item.status === 'open' && <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: item._id, status: 'closed' })}>Close post</Button>}
                {['expired', 'closed'].includes(item.status) && <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => status.mutate({ id: item._id, status: 'open' })}>Reopen for 30 days</Button>}
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => window.confirm('Delete this post?') && remove.mutate(item._id)}>Delete</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              {item.myClaim ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">Your message · <span className="font-normal">{label(item.myClaim.status)}</span></p>
                  <p className="mt-1 text-slate-600">{item.myClaim.message}</p>
                  {item.myClaim.status === 'accepted' && <p className="mt-2 text-emerald-700">Confirmed! Message {item.postedBy.name} to arrange the handover.</p>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" icon={MessageCircle} onClick={() => chat.mutate(item.postedBy._id)}>Message {item.postedBy.name.split(' ')[0]}</Button>
                    {item.myClaim.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => withdraw.mutate(item._id)}>Withdraw</Button>}
                  </div>
                </div>
              ) : item.status === 'open' ? (
                <>
                  <Textarea label={item.kind === 'found' ? 'This is mine — describe it so the finder can confirm' : 'I found it — say where and when'} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                  <Button loading={claim.isPending} disabled={message.trim().length < 5} onClick={() => claim.mutate({ id: item._id, message: message.trim() })}>{item.kind === 'found' ? "It's mine" : 'I found it'}</Button>
                </>
              ) : <p className="text-sm text-slate-500">This post is {item.status}.</p>}
              {isManager(user) && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => window.confirm('Remove this post for everyone?') && remove.mutate(item._id)}>Remove post</Button>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function LostFoundPage() {
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [posting, setPosting] = useState(false);
  const { data, isLoading } = useLostFound({ kind: kind || undefined, category: category || undefined, search: search || undefined, mine: mine || undefined, page });
  const openId = params.get('item');
  const openItem = (id) => setParams(id ? { item: id } : {});

  return (
    <div>
      <PageHeader title="Lost & found" description="Lost something or found something? Posts close automatically after 30 days." actions={<Button icon={Plus} onClick={() => setPosting(true)}>Post</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs className="w-fit" value={mine ? 'mine' : kind} onChange={(v) => { setMine(v === 'mine'); setKind(v === 'mine' ? '' : v); setPage(1); }}
          tabs={[{ value: '', label: 'All' }, { value: 'found', label: 'Found' }, { value: 'lost', label: 'Lost' }, { value: 'mine', label: 'My posts' }]} />
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search items or places" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} />
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
        <Card><EmptyState icon={PackageSearch} title="Nothing here" description={mine ? "You haven't posted anything." : 'No open lost or found posts right now.'} action={<Button icon={Plus} onClick={() => setPosting(true)}>Post an item</Button>} /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((i) => (
              <Card key={i._id} className="cursor-pointer overflow-hidden transition hover:border-brand-200" onClick={() => openItem(i._id)}>
                {i.photos[0] ? <img src={i.photos[0].url} alt="" className="h-40 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-slate-50"><PackageSearch className="size-8 text-slate-300" /></div>}
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={i.kind === 'lost' ? 'red' : 'blue'}>{i.kind === 'lost' ? 'Lost' : 'Found'}</Badge>
                    {i.status !== 'open' && <Badge tone={STATUS_TONE[i.status]}>{label(i.status)}</Badge>}
                    {i.isMine && i.claimCount > 0 && <Badge tone="amber">{i.claimCount} response{i.claimCount > 1 ? 's' : ''}</Badge>}
                  </div>
                  <p className="mt-1.5 truncate font-semibold text-slate-900">{i.title}</p>
                  <p className="truncate text-xs text-slate-500">{[i.location, i.date && date(i.date)].filter(Boolean).join(' · ')}</p>
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
      <PostModal open={posting} onClose={() => setPosting(false)} />
      {openId && <ItemModal id={openId} onClose={() => openItem(null)} />}
    </div>
  );
}
