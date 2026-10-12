import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Flag, Heart, Lock, MessageSquare, MessagesSquare, Pin, Plus, Search, Settings2, ShieldAlert, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, EmptyState, FileUpload, Input, Modal, Pagination, Select, Spinner, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { label, timeAgo } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useCreateCategory, useCreateTopic, useForumCategories, useForumReports, useResolveReports, useTopics, useUpdateCategory } from '../api';
import { Avatar, personLine } from '../components/RichText';
import { keepMentions, MentionTextarea } from '../components/MentionTextarea';

function NewTopicModal({ open, onClose, categories, defaultCategory }) {
  const navigate = useNavigate();
  const { values, bind, set, errors, applyServerErrors, reset } = useForm({ category: defaultCategory || '', title: '', body: '' });
  const [mentions, setMentions] = useState([]);
  const [files, setFiles] = useState([]);
  const create = useCreateTopic({ onSuccess: (t) => { reset(); setFiles([]); setMentions([]); onClose(); navigate(`/forum/${t._id}`); } });
  const submit = () =>
    create.mutate(
      { ...values, category: values.category || categories[0]?._id, mentions: keepMentions(values.body, mentions), attachments: files.length ? files.map((f) => f._id) : undefined },
      { onError: applyServerErrors },
    );
  return (
    <Modal open={open} onClose={onClose} title="Start a discussion" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Post</Button></>}>
      <div className="space-y-4">
        <Select label="Category" options={categories.map((c) => ({ value: c._id, label: c.name }))} {...bind('category')} value={values.category || categories[0]?._id || ''} />
        <Input label="Title" required placeholder="e.g. Can we add a composting unit?" {...bind('title')} />
        <MentionTextarea label="Details" rows={6} required value={values.body} onChange={(v) => set('body', v)} error={errors.body} mentions={mentions} onMentionsChange={setMentions} />
        <FileUpload folder="forum" files={files} onChange={setFiles} max={4} label="Add photos" />
      </div>
    </Modal>
  );
}

function CategoriesModal({ open, onClose }) {
  const { data: cats = [] } = useForumCategories({ all: true });
  const [name, setName] = useState('');
  const create = useCreateCategory({ onSuccess: () => setName('') });
  const update = useUpdateCategory();
  return (
    <Modal open={open} onClose={onClose} title="Forum categories">
      <div className="mb-4 flex gap-2">
        <Input className="flex-1" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button icon={Plus} loading={create.isPending} disabled={name.trim().length < 2} onClick={() => create.mutate({ name: name.trim(), order: cats.length + 1 })}>Add</Button>
      </div>
      <ul className="divide-y divide-slate-100">
        {cats.map((c) => (
          <li key={c._id} className="flex items-center justify-between py-2 text-sm">
            <span className={cn('font-medium', !c.active && 'text-slate-400 line-through')}>{c.name} <span className="font-normal text-slate-400">({c.topicCount})</span></span>
            <Checkbox label="Active" checked={c.active} onChange={() => update.mutate({ id: c._id, active: !c.active })} />
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ModerationQueue() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useForumReports(true, { page });
  const resolve = useResolveReports();
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data?.data.length) return <Card><EmptyState icon={ShieldAlert} title="Nothing to review" description="Posts reported by residents show up here." /></Card>;
  return (
    <div className="space-y-3">
      {data.data.map((r) => (
        <Card key={r.target} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="red"><Flag className="mr-1 size-3" />{r.count} report{r.count > 1 ? 's' : ''}</Badge>
            {r.reasons.map((x) => <Badge key={x}>{label(x)}</Badge>)}
            <span className="text-xs text-slate-400">{timeAgo(r.lastAt)}</span>
          </div>
          <button type="button" onClick={() => navigate(`/forum/${r.topic}`)} className="mt-2 block text-left">
            <p className="text-xs text-slate-500">{r.targetType === 'reply' ? `Reply in "${r.topicTitle}"` : 'Topic'} · by {personLine(r.content?.author)}</p>
            {r.content?.title && <p className="font-semibold text-slate-900">{r.content.title}</p>}
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{r.content?.body}</p>
          </button>
          {r.notes.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => resolve.mutate({ targetType: r.targetType, targetId: r.target, action: 'dismiss' })}>Keep post</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => {
              const reason = window.prompt('Reason shown to the author', 'Removed for breaking the community guidelines');
              if (reason !== null) resolve.mutate({ targetType: r.targetType, targetId: r.target, action: 'remove', reason: reason || undefined });
            }}>Remove post</Button>
          </div>
        </Card>
      ))}
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}

function TopicCard({ t }) {
  const navigate = useNavigate();
  return (
    <Card className="cursor-pointer p-4 transition hover:border-brand-200" onClick={() => navigate(`/forum/${t._id}`)}>
      <div className="flex gap-3">
        <Avatar name={t.author?.name} className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {t.pinned && <Pin className="size-4 text-brand-600" />}
            {t.locked && <Lock className="size-4 text-slate-400" />}
            <h3 className="font-semibold text-slate-900">{t.title}</h3>
            {t.resolved && <Badge tone="green"><CheckCircle2 className="mr-1 size-3" />Resolved</Badge>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{personLine(t.author)}</span>
            {t.category?.name && <Badge>{t.category.name}</Badge>}
            <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" />{t.replyCount}</span>
            <span className="inline-flex items-center gap-1"><Heart className={cn('size-3.5', t.likedByMe && 'fill-red-500 text-red-500')} />{t.likeCount}</span>
            <span>active {timeAgo(t.lastActivityAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ForumPage() {
  const { user } = useAuth();
  const moderator = isManager(user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'topics';
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const { data: categories = [] } = useForumCategories();
  const query = { category: category || undefined, search: search || undefined, page, ...(status === 'open' ? { resolved: false } : status === 'resolved' ? { resolved: true } : status === 'mine' ? { mine: true } : {}) };
  const { data, isLoading } = useTopics(query);

  return (
    <div>
      <PageHeader
        title="Discussion forum"
        description="Ask neighbours, share ideas and keep the conversation friendly."
        actions={<>
          {moderator && <Button variant="secondary" icon={Settings2} onClick={() => setManaging(true)}>Categories</Button>}
          <Button icon={Plus} onClick={() => setCreating(true)} disabled={!categories.length}>New topic</Button>
        </>}
      />
      {moderator && (
        <Tabs className="mb-4 w-fit" value={tab} onChange={(v) => setParams(v === 'topics' ? {} : { tab: v })} tabs={[{ value: 'topics', label: 'Topics' }, { value: 'moderation', label: 'Moderation' }]} />
      )}
      {tab === 'moderation' && moderator ? <ModerationQueue /> : (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Category">
            {[{ _id: '', name: 'All categories', topicCount: undefined }, ...categories].map((c) => (
              <button key={c._id || 'all'} type="button" aria-pressed={category === c._id} onClick={() => { setCategory(c._id); setPage(1); }}
                className={cn('inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition sm:min-h-8', category === c._id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                {c.name}{c.topicCount !== undefined ? ` · ${c.topicCount}` : ''}
              </button>
            ))}
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search topics" aria-label="Search topics" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            {/* a different filter from the category chips above, so it says what it does */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="shrink-0">Show:</span>
              <Select className="flex-1 sm:w-48" aria-label="Show topics" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: '', label: 'All topics' }, { value: 'open', label: 'Unanswered / unresolved' }, { value: 'resolved', label: 'Resolved' }, { value: 'mine', label: 'My topics' }]} />
            </div>
          </div>
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? (
            <Card><EmptyState icon={MessagesSquare} title={search || category || status ? 'No matching topics' : 'No discussions yet'} description="Start the first conversation with your neighbours." action={<Button icon={Plus} onClick={() => setCreating(true)}>New topic</Button>} /></Card>
          ) : (
            <div className="space-y-3">
              {data.data.map((t) => <TopicCard key={t._id} t={t} />)}
              <Pagination meta={data.meta} onPage={setPage} />
            </div>
          )}
        </>
      )}
      {creating && <NewTopicModal open onClose={() => setCreating(false)} categories={categories} defaultCategory={category} />}
      {moderator && <CategoriesModal open={managing} onClose={() => setManaging(false)} />}
    </div>
  );
}
