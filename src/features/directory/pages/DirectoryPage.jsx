import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookUser, Briefcase, EyeOff, Mail, MessageCircle, Phone, Search, ShieldCheck, UserRound } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, FilterBar, Input, Pagination, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { ROLE_LABELS } from '../../../lib/roles';
import { useBlocks } from '../../units/api';
import { Avatar } from '../../forum/components/RichText';
import { useOpenDirect } from '../../chat/api';
import { useDirectory, useDirectoryContacts, useMyDirectoryProfile, useUpdateDirectoryProfile } from '../api';
import { Cake, GraduationCap } from 'lucide-react';
import { OCCUPATION_TYPES, WORK_CATEGORIES, dayMonth, occupationSummary } from '../../people/constants';
import { useMyPersonalDetails } from '../../people/api';

function PersonCard({ p, onMessage, messaging, onPrivacy }) {
  const { t } = useT();
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <Avatar name={p.name} className="size-11 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.name}{p.isMe && <Badge tone="brand" className="ml-2">{t('You')}</Badge>}</p>
          <p className="truncate text-sm text-slate-500">{p.units?.length ? p.units.join(', ') : p.designation || t(ROLE_LABELS[p.role] || '')}</p>
          {p.designation && p.units?.length === 0 && p.role && <p className="text-xs text-slate-400">{t(ROLE_LABELS[p.role] || '')}</p>}
        </div>
      </div>
      {(p.profession || p.skills?.length) && (
        <div className="mt-3 space-y-1">
          {p.profession && <p className="flex items-center gap-1.5 text-sm text-slate-700"><Briefcase className="size-4 text-slate-400" />{p.profession}</p>}
          {p.skills?.length > 0 && <div className="flex flex-wrap gap-1">{p.skills.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</div>}
          {p.about && <p className="text-xs text-slate-500">{p.about}</p>}
        </div>
      )}
      {(p.birthday || p.occupation) && (
        <div className="mt-2 space-y-1">
          {p.occupation && <p className="flex items-center gap-1.5 text-sm text-slate-700">{p.occupation.type === 'student' ? <GraduationCap className="size-4 text-slate-400" /> : <Briefcase className="size-4 text-slate-400" />}{occupationSummary(p.occupation, t)}</p>}
          {p.birthday && <p className="flex items-center gap-1.5 text-sm text-slate-700"><Cake className="size-4 text-slate-400" />{t('Birthday {date}', { date: dayMonth(p.birthday) })}</p>}
        </div>
      )}
      {p.isMe && onPrivacy && (
        <p className="mt-2 text-xs text-slate-500">{t('Shown to neighbours')} · <button type="button" onClick={onPrivacy} className="font-medium text-brand-700 hover:underline">{t('Change')}</button></p>
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
  const [occ, setOcc] = useState({ occupationType: '', occupationCategory: '', institution: '' });
  const [page, setPage] = useState(1);
  const { data: blocks = [] } = useBlocks();
  const institution = occ.institution.trim().length >= 2 ? occ.institution.trim() : undefined;
  const { data, isLoading } = useDirectory({ search: search || undefined, block: block || undefined, occupationType: occ.occupationType || undefined, occupationCategory: occ.occupationCategory || undefined, institution, page, limit: 24 });
  const setO = (k) => (e) => { setOcc((o) => ({ ...o, [k]: e.target.value })); setPage(1); };
  const filtersOn = [block, occ.occupationType, occ.occupationCategory, institution].filter(Boolean).length;
  const open = useOpenDirect({ onSuccess: (c) => navigate(`/messages/${c._id}`) });
  const { t } = useT();
  return (
    <div className="space-y-4">
      {!listed && (
        <Card className="flex flex-col gap-3 border-brand-200 bg-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-brand-900"><EyeOff className="mt-0.5 size-4 shrink-0" />{t("You are hidden from the directory. Neighbours can't find you until you list yourself.")}</p>
          <Button size="sm" onClick={onEdit}>List me</Button>
        </Card>
      )}
      <Card>
        <FilterBar cols={4} active={filtersOn} className="border-b-0" search={(
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('Search name, flat, block or profession')} aria-label={t('Search name, flat, block or profession')} className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        )}>
          <Select value={block} onChange={(e) => { setBlock(e.target.value); setPage(1); }} placeholder="All blocks" aria-label="Block" options={blocks.map((b) => ({ value: b._id, label: t('Block {name}', { name: b.name }) }))} />
          <Select value={occ.occupationType} onChange={setO('occupationType')} placeholder="Any occupation" aria-label="Occupation" options={OCCUPATION_TYPES} />
          <Select value={occ.occupationCategory} onChange={setO('occupationCategory')} placeholder="Any work category" aria-label="Work category" options={WORK_CATEGORIES} />
          <Input value={occ.institution} onChange={setO('institution')} placeholder="School / college" aria-label="School or college" />
        </FilterBar>
      </Card>
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
        <Card><EmptyState icon={BookUser} title={search || filtersOn ? 'No one matches' : 'No one has listed themselves yet'} description="Residents choose what to share. Only people who opted in appear here." /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((p) => <PersonCard key={p._id} p={{ ...p, role: 'resident' }} onPrivacy={onEdit} onMessage={open.mutate} messaging={open.isPending && open.variables === p._id} />)}
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
  const { t } = useT();
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  const section = (title, list) => (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t(title)}</h2>
      {!list.length ? <p className="text-sm text-slate-400">{t('No one yet.')}</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PersonCard key={`${p._id}-${p.role}`} p={{ ...p, units: [] }} onMessage={open.mutate} messaging={open.isPending && open.variables === p._id} />)}</div>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3 p-4 text-sm text-slate-600"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" /><>{t('To reach the guards, use')} <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => navigate('/messages')}>{t('Messages → Call gate')}</button>. {t('Any guard on duty will answer.')}</></Card>
      {section('Committee', data.committee)}
      {section('Staff', data.staff)}
    </div>
  );
}

function MyListing() {
  const { user } = useAuth();
  const { data, isLoading } = useMyDirectoryProfile();
  const { data: personal } = useMyPersonalDetails();
  const save = useUpdateDirectoryProfile();
  const { t } = useT();
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
    ...(form.listed && form.showOccupation && personal?.occupation ? { occupation: personal.occupation } : {}),
    ...(form.listed && form.showBirthday && personal?.dateOfBirth ? { birthday: personal.dateOfBirth.slice(5) } : {}),
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader title="Your directory listing" subtitle="You decide what neighbours can see. Hidden details are never shared." />
        <div className="space-y-4 p-4 sm:p-5">
          <Checkbox label="List me in the resident directory (name and flat)" checked={form.listed} onChange={set('listed')} />
          <div className={form.listed ? 'space-y-3 pl-6' : 'pointer-events-none space-y-3 pl-6 opacity-50'}>
            <Checkbox label={user.phone ? t('Show my phone ({phone})', { phone: user.phone }) : t('Show my phone')} checked={form.showPhone} onChange={set('showPhone')} />
            <Checkbox label={user.email ? t('Show my email ({email})', { email: user.email }) : t('Show my email')} checked={form.showEmail} onChange={set('showEmail')} />
            <Checkbox label="Show my profession and skills" checked={form.showProfession} onChange={set('showProfession')} />
            <Checkbox label={personal?.occupation ? t('Show my occupation ({occupation})', { occupation: occupationSummary(personal.occupation, t) }) : t('Show my occupation')} checked={form.showOccupation} onChange={set('showOccupation')} />
          </div>
          <Checkbox label={personal?.dateOfBirth ? t('Show my birthday — day and month only, never the year ({date}). Also puts you on the “Today\'s birthdays” card.', { date: dayMonth(personal.dateOfBirth.slice(5)) }) : t('Show my birthday — day and month only, never the year. Also puts you on the “Today\'s birthdays” card.')} checked={form.showBirthday} onChange={set('showBirthday')} />
          {!personal?.dateOfBirth && !personal?.occupation && <p className="text-xs text-slate-500">{t('Add your birthday and occupation in')} <Link to="/profile" className="font-medium text-brand-700 hover:underline">{t('My profile')}</Link>.</p>}
          <Input label="Profession" placeholder="e.g. Pediatrician, CA, Yoga teacher" value={form.profession} onChange={set('profession')} />
          <Input label="Skills / can help with" hint="Comma separated, up to 10" placeholder="e.g. Math tuition, Plumbing advice" value={form.skills} onChange={set('skills')} />
          <Textarea label="About" rows={2} maxLength={300} value={form.about} onChange={set('about')} />
          <Button loading={save.isPending} onClick={() => save.mutate({ listed: form.listed, showPhone: form.showPhone, showEmail: form.showEmail, showProfession: form.showProfession, showOccupation: form.showOccupation, showBirthday: form.showBirthday, profession: form.profession, skills, about: form.about })}>Save</Button>
        </div>
      </Card>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">{t('What neighbours see')}</p>
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
