import { useState } from 'react';
import { Pencil, Plus, Search, ShieldAlert, ShieldX, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { date, timeAgo } from '../../../lib/format';
import { hasRole, ROLES } from '../../../lib/roles';
import { checkWatchlist, useCreateWatch, useRemoveWatch, useUpdateWatch, useWatchlist } from '../api';

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

function EntryModal({ open, onClose, entry }) {
  const { values, bind, applyServerErrors } = useForm({
    type: entry?.type || 'block',
    name: entry?.name || '',
    phone: entry?.phone || '',
    vehicleNumber: entry?.vehicleNumber || '',
    reason: entry?.reason || '',
    expiresAt: entry?.expiresAt ? entry.expiresAt.slice(0, 10) : '',
  });
  const [photo, setPhoto] = useState([]);
  const create = useCreateWatch({ onSuccess: onClose });
  const update = useUpdateWatch({ onSuccess: onClose });
  const submit = () => {
    const body = clean({ ...values, expiresAt: values.expiresAt ? new Date(`${values.expiresAt}T23:59:59`).toISOString() : undefined, photo: photo[0]?._id });
    if (entry) update.mutate({ id: entry._id, ...body, expiresAt: body.expiresAt ?? null }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };
  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit entry' : 'Add to blocklist / watchlist'} description="Matched at the gate by phone or vehicle number (name only when neither is given)."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Type" className="sm:col-span-2" options={[{ value: 'block', label: 'Block — refuse entry' }, { value: 'watch', label: 'Watch — allow but alert' }]} {...bind('type')} />
        <Input label="Name" {...bind('name')} />
        <Input label="Phone" type="tel" {...bind('phone')} />
        <Input label="Vehicle number" placeholder="MH12AB1234" {...bind('vehicleNumber')} />
        <Input label="Expires on (optional)" type="date" {...bind('expiresAt')} />
        <Textarea className="sm:col-span-2" label="Reason" required rows={2} {...bind('reason')} />
        <div className="sm:col-span-2">
          <FileUpload folder="security" files={photo} onChange={setPhoto} max={1} camera label={entry?.photoUrl ? 'Replace photo' : 'Photo (optional)'} />
        </div>
      </div>
    </Modal>
  );
}

function QuickCheck() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    const body = /^\+?[\d\s-]{10,}$/.test(v) ? { phone: v } : /\d/.test(v) ? { vehicleNumber: v } : { name: v };
    setBusy(true);
    try {
      setResult(await checkWatchlist(body));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const tone = { block: 'border-red-200 bg-red-50 text-red-800', watch: 'border-amber-200 bg-amber-50 text-amber-800', clear: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
  return (
    <Card className="mb-6 p-4">
      <form onSubmit={run} className="flex flex-col gap-2 sm:flex-row">
        <Input className="flex-1" placeholder="Check a phone, vehicle number or name" value={q} onChange={(e) => { setQ(e.target.value); setResult(null); }} />
        <Button type="submit" icon={Search} loading={busy}>Check</Button>
      </form>
      {result && (
        <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${tone[result.status]}`}>
          {result.status === 'clear' ? 'Not on the list.' : result.matches.map((m) => <p key={m.entry}><strong>{m.type === 'block' ? 'BLOCKED' : 'WATCH'}</strong>{m.name ? ` · ${m.name}` : ''} — {m.reason}</p>)}
        </div>
      )}
    </Card>
  );
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const manager = hasRole(user, ROLES.FACILITY_MANAGER);
  const [filters, setFilters] = useState({ type: '', search: '', active: 'true', page: 1 });
  const [editing, setEditing] = useState(null); // null | 'new' | entry
  const { data, isLoading } = useWatchlist({ type: filters.type || undefined, search: filters.search || undefined, active: filters.active || undefined, page: filters.page });
  const remove = useRemoveWatch();
  const update = useUpdateWatch();
  const rows = data?.data || [];
  const expired = (e) => !e.active || (e.expiresAt && new Date(e.expiresAt) < new Date());

  return (
    <div>
      <PageHeader
        title="Blocklist & watchlist"
        description={manager ? 'People and vehicles the gate should refuse or keep an eye on.' : 'Check visitors and vehicles before letting them in.'}
        actions={manager && <Button icon={Plus} onClick={() => setEditing('new')}>Add entry</Button>}
      />
      <QuickCheck />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <Tabs className="w-fit" value={filters.type} onChange={(type) => setFilters((f) => ({ ...f, type, page: 1 }))} tabs={[{ value: '', label: 'All' }, { value: 'block', label: 'Blocked' }, { value: 'watch', label: 'Watch' }]} />
          <Input className="lg:max-w-xs" placeholder="Search" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
          <select value={filters.active} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm lg:ml-auto">
            <option value="true">Active</option>
            <option value="false">Expired / inactive</option>
            <option value="">All</option>
          </select>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !rows.length ? (
          <EmptyState icon={ShieldAlert} title="Nothing on the list" />
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((e) => (
              <li key={e._id} className={`flex gap-3 rounded-xl border p-3 ${e.type === 'block' ? 'border-red-200' : 'border-amber-200'} ${expired(e) ? 'opacity-60' : ''}`}>
                {e.photoUrl ? (
                  <a href={e.photoUrl} target="_blank" rel="noreferrer"><img src={e.photoUrl} alt={e.name || 'photo'} className="size-16 shrink-0 rounded-lg object-cover" /></a>
                ) : (
                  <div className={`flex size-16 shrink-0 items-center justify-center rounded-lg ${e.type === 'block' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                    {e.type === 'block' ? <ShieldX className="size-7" /> : <ShieldAlert className="size-7" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={e.type === 'block' ? 'red' : 'amber'}>{e.type === 'block' ? 'Blocked' : 'Watch'}</Badge>
                    {expired(e) && <Badge>Inactive</Badge>}
                  </div>
                  <p className="mt-1 truncate font-medium text-slate-900">{e.name || e.vehicleNumber || e.phone}</p>
                  <p className="truncate text-xs text-slate-500">{[e.phone, e.vehicleNumber].filter(Boolean).join(' · ')}</p>
                  <p className="mt-1 text-sm text-slate-700">{e.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {e.expiresAt ? `Until ${date(e.expiresAt)} · ` : ''}
                    {e.hits ? `${e.hits} hit${e.hits > 1 ? 's' : ''}, last ${timeAgo(e.lastHitAt)}` : 'No hits yet'}
                  </p>
                  {manager && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(e)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: e._id, active: !e.active })}>{e.active ? 'Deactivate' : 'Activate'}</Button>
                      <Button size="sm" variant="ghost" icon={Trash2} aria-label="Delete" onClick={() => window.confirm('Delete this entry?') && remove.mutate(e._id)} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {editing && <EntryModal open entry={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
