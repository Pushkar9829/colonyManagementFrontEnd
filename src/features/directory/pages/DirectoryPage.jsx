import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookUser, Briefcase, EyeOff, Mail, MessageCircle, Phone, Search, ShieldCheck, UserRound } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { ROLE_LABELS } from '../../../lib/roles';
import { useBlocks } from '../../units/api';
import { Avatar } from '../../forum/components/RichText';
import { useOpenDirect } from '../../chat/api';
import { useDirectory, useDirectoryContacts, useMyDirectoryProfile, useUpdateDirectoryProfile } from '../api';

function PersonCard({ p, onMessage, messaging }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <Avatar name={p.name} className="size-11 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.name}{p.isMe && <Badge tone="brand" className="ml-2">You</Badge>}</p>
          <p className="truncate text-sm text-slate-500">{p.units?.length ? p.units.join(', ') : p.designation || ROLE_LABELS[p.role]}</p>
          {p.designation && p.units?.length === 0 && p.role && <p className="text-xs text-slate-400">{ROLE_LABELS[p.role]}</p>}
        </div>
      </div>
      {(p.profession || p.skills?.length) && (
        <div className="mt-3 space-y-1">
          {p.profession && <p className="flex items-center gap-1.5 text-sm text-slate-700"><Briefcase className="size-4 text-slate-400" />{p.profession}</p>}
          {p.skills?.length > 0 && <div className="flex flex-wrap gap-1">{p.skills.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</div>}
          {p.about && <p className="text-xs text-slate-500">{p.about}</p>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-3">
        {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"><Phone className="size-3.5" />{p.phone}</a>}
        {p.email && <a href={`mailto:${p.email}`} className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"><Mail className="size-3.5" />{p.email}</a>}
        {!p.isMe && onMessage && p.role !== 'guard' && (
          <Button size="sm" variant="ghost" icon={MessageCircle} loading={messaging} onClick={() => onMessage(p._id)}>Message</Button>
        )}
      </div>
    </Card>
  );
}

function Neighbours({ listed, onEdit }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [block, setBlock] = useState('');
  const [page, setPage] = useState(1);
  const { data: blocks = [] } = useBlocks();
  const { data, isLoading } = useDirectory({ search: search || undefined, block: block || undefined, page, limit: 24 });
  const open = useOpenDirect({ onSuccess: (c) => navigate(`/messages/${c._id}`) });
  return (
    <div className="space-y-4">
      {!listed && (
        <Card className="flex flex-col gap-3 border-brand-200 bg-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-brand-900"><EyeOff className="mt-0.5 size-4 shrink-0" />You are hidden from the directory. Neighbours can&apos;t find you until you list yourself.</p>
          <Button size="sm" onClick={onEdit}>List me</Button>
        </Card>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, flat, block or profession" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <Select value={block} onChange={(e) => { setBlock(e.target.value); setPage(1); }} placeholder="All blocks" options={blocks.map((b) => ({ value: b._id, label: `Block ${b.name}` }))} />
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
        <Card><EmptyState icon={BookUser} title={search || block ? 'No one matches' : 'No one has listed themselves yet'} description="Residents choose what to share. Only people who opted in appear here." /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((p) => <PersonCard key={p._id} p={{ ...p, role: 'resident' }} onMessage={open.mutate} messaging={open.isPending && open.variables === p._id} />)}
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function Contacts() {
  const navigate = useNavigate();
  const { data, isLoading } = useDirectoryContacts();
  const open = useOpenDirect({ onSuccess: (c) => navigate(`/messages/${c._id}`) });
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  const section = (title, list) => (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {!list.length ? <p className="text-sm text-slate-400">No one yet.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PersonCard key={`${p._id}-${p.role}`} p={{ ...p, units: [] }} onMessage={open.mutate} messaging={open.isPending && open.variables === p._id} />)}</div>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3 p-4 text-sm text-slate-600"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" />To reach the guards, use <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => navigate('/messages')}>Messages → Call gate</button>. Any guard on duty will answer.</Card>
      {section('Committee', data.committee)}
      {section('Staff', data.staff)}
    </div>
  );
}

function MyListing() {
  const { user } = useAuth();
  const { data, isLoading } = useMyDirectoryProfile();
  const save = useUpdateDirectoryProfile();
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (data) setForm({ ...data, skills: (data.skills || []).join(', ') });
  }, [data]);
  if (isLoading || !form) return <div className="flex justify-center py-12"><Spinner /></div>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const preview = {
    _id: 'preview', name: user.name, units: user.unit?.label ? [user.unit.label] : [],
    ...(form.showPhone && user.phone ? { phone: user.phone } : {}),
    ...(form.showEmail && user.email ? { email: user.email } : {}),
    ...(form.showProfession ? { profession: form.profession, skills, about: form.about } : {}),
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader title="Your directory listing" subtitle="You decide what neighbours can see. Hidden details are never shared." />
        <div className="space-y-4 p-4 sm:p-5">
          <Checkbox label="List me in the resident directory (name and flat)" checked={form.listed} onChange={set('listed')} />
          <div className={form.listed ? 'space-y-3 pl-6' : 'pointer-events-none space-y-3 pl-6 opacity-50'}>
            <Checkbox label={`Show my phone${user.phone ? ` (${user.phone})` : ''}`} checked={form.showPhone} onChange={set('showPhone')} />
            <Checkbox label={`Show my email${user.email ? ` (${user.email})` : ''}`} checked={form.showEmail} onChange={set('showEmail')} />
            <Checkbox label="Show my profession and skills" checked={form.showProfession} onChange={set('showProfession')} />
          </div>
          <Input label="Profession" placeholder="e.g. Pediatrician, CA, Yoga teacher" value={form.profession} onChange={set('profession')} />
          <Input label="Skills / can help with" hint="Comma separated, up to 10" placeholder="e.g. Math tuition, Plumbing advice" value={form.skills} onChange={set('skills')} />
          <Textarea label="About" rows={2} maxLength={300} value={form.about} onChange={set('about')} />
          <Button loading={save.isPending} onClick={() => save.mutate({ listed: form.listed, showPhone: form.showPhone, showEmail: form.showEmail, showProfession: form.showProfession, profession: form.profession, skills, about: form.about })}>Save</Button>
        </div>
      </Card>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">What neighbours see</p>
        {form.listed ? <PersonCard p={preview} /> : <Card><EmptyState icon={UserRound} title="You're hidden" description="Nobody can find you in the directory." /></Card>}
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  const [tab, setTab] = useState('people');
  const { data: me } = useMyDirectoryProfile();
  return (
    <div>
      <PageHeader title="Resident directory" description="Find neighbours who chose to be listed, plus committee and staff contacts." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'people', label: 'Neighbours' }, { value: 'contacts', label: 'Committee & staff' }, { value: 'me', label: 'My privacy' }]} />
      {tab === 'people' && <Neighbours listed={me?.listed ?? true} onEdit={() => setTab('me')} />}
      {tab === 'contacts' && <Contacts />}
      {tab === 'me' && <MyListing />}
    </div>
  );
}
