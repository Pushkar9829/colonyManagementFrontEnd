import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Flag, Heart, Lock, MessageCircle, Pencil, Pin, Trash2, Unlock } from 'lucide-react';
import { Attachments, Badge, Button, Card, EmptyState, ErrorState, Input, PageLoader, Pagination, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { cn } from '../../../lib/cn';
import { dateTime, timeAgo } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import {
  useDeleteReply, useDeleteTopic, useLikeReply, useLikeTopic, useLockTopic, usePinTopic, useReply, useReportPost, useResolveTopic, useTopic, useUpdateReply, useUpdateTopic,
} from '../api';
import { Avatar, personLine, RichText } from '../components/RichText';
import { keepMentions, MentionTextarea } from '../components/MentionTextarea';
import { FORUM_REPORT_REASONS, ReportModal } from '../components/ReportModal';
import { useOpenDirect } from '../../chat/api';

function IconAction({ icon: Icon, label, onClick, active, danger, children }) {
  const { t } = useT();
  return (
    <button type="button" title={t(label)} onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700', active && 'text-red-600', danger && 'hover:bg-red-50 hover:text-red-600')}>
      <Icon className={cn('size-3.5', active && 'fill-red-500')} />{children ?? <span className="hidden sm:inline">{t(label)}</span>}
    </button>
  );
}

function Reply({ r, onReport, moderator }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(r.body);
  const like = useLikeReply();
  const update = useUpdateReply({ onSuccess: () => setEditing(false) });
  const remove = useDeleteReply();
  const hidden = r.status !== 'visible';
  return (
    <li className="flex gap-3 py-4">
      <Avatar name={r.author?.name} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold text-slate-900">{r.author?.name}</span>
          <span className="text-slate-400"> · {r.author?.units?.join(', ') || r.author?.designation || ''}</span>
          {r.isTopicAuthor && <Badge tone="brand" className="ml-2">{t('Author')}</Badge>}
        </p>
        <p className="text-xs text-slate-400">{timeAgo(r.createdAt)}{r.editedAt ? ` · ${t('edited')}` : ''}</p>
        {hidden ? (
          <p className="mt-2 text-sm italic text-slate-400">{r.status === 'removed' ? (moderator && r.removedReason ? t('Removed by a moderator: {reason}', { reason: r.removedReason }) : t('Removed by a moderator')) : t('Deleted by the author')}</p>
        ) : editing ? (
          <div className="mt-2 space-y-2">
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" loading={update.isPending} onClick={() => update.mutate({ id: r._id, body })}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <RichText text={r.body} className="mt-1.5 text-sm text-slate-700" />
        )}
        {!hidden && !editing && (
          <div className="mt-1.5 -ml-2 flex flex-wrap gap-1">
            <IconAction icon={Heart} label="Like" active={r.likedByMe} onClick={() => like.mutate(r._id)}>{r.likeCount || ''}</IconAction>
            {r.canEdit && <IconAction icon={Pencil} label="Edit" onClick={() => { setBody(r.body); setEditing(true); }} />}
            {r.canDelete && <IconAction icon={Trash2} label="Delete" danger onClick={() => window.confirm(t('Delete this reply?')) && remove.mutate(r._id)} />}
            {!r.isMine && <IconAction icon={Flag} label="Report" onClick={() => onReport({ targetType: 'reply', targetId: r._id })} />}
          </div>
        )}
      </div>
    </li>
  );
}

export default function TopicPage() {
  const { t } = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const moderator = isManager(user);
  const [page, setPage] = useState(1);
  const { data: topic, isLoading, error, refetch } = useTopic(id, page);
  const [replyText, setReplyText] = useState('');
  const [mentions, setMentions] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [reporting, setReporting] = useState(null);
  const like = useLikeTopic();
  const resolve = useResolveTopic();
  const pin = usePinTopic();
  const lock = useLockTopic();
  const update = useUpdateTopic({ onSuccess: () => setEditing(false) });
  const remove = useDeleteTopic({ onSuccess: () => navigate('/forum') });
  const reply = useReply({ onSuccess: () => { setReplyText(''); setMentions([]); } });
  const report = useReportPost({ onSuccess: () => setReporting(null) });
  const openChat = useOpenDirect({ onSuccess: (c) => navigate(`/messages/${c._id}`) });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const hidden = topic.status !== 'visible';
  const canReply = !hidden && (!topic.locked || moderator);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/forum" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('Forum')}</Link>
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {topic.category?.name && <Badge>{topic.category.name}</Badge>}
          {topic.pinned && <Badge tone="brand"><Pin className="mr-1 size-3" />{t('Pinned')}</Badge>}
          {topic.locked && <Badge><Lock className="mr-1 size-3" />{t('Locked')}</Badge>}
          {topic.resolved && <Badge tone="green"><CheckCircle2 className="mr-1 size-3" />{t('Resolved')}</Badge>}
        </div>
        {editing ? (
          <div className="mt-3 space-y-3">
            <Input label="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            <Textarea label="Details" rows={6} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
            <div className="flex gap-2"><Button loading={update.isPending} onClick={() => update.mutate({ id, ...draft })}>Save</Button><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        ) : (
          <>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">{topic.title}</h1>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={topic.author?.name} />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-800">{personLine(topic.author)}</p>
                <p className="text-xs text-slate-400">{dateTime(topic.createdAt)}{topic.editedAt ? ` · ${t('edited')}` : ''}</p>
              </div>
              {!topic.isMine && !hidden && (
                <Button size="sm" variant="ghost" icon={MessageCircle} className="ml-auto" loading={openChat.isPending} onClick={() => openChat.mutate(topic.author._id)}>Message</Button>
              )}
            </div>
            {hidden ? <p className="mt-4 text-sm italic text-slate-400">{topic.status === 'removed' ? t('This topic was removed by a moderator.') : t('This topic was deleted by its author.')}</p> : (
              <>
                <RichText text={topic.body} className="mt-4 text-[15px] leading-relaxed text-slate-700" />
                {topic.attachments?.length > 0 && <div className="mt-4"><Attachments items={topic.attachments} /></div>}
              </>
            )}
          </>
        )}
        {!hidden && !editing && (
          <div className="mt-4 -ml-2 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
            <IconAction icon={Heart} label="Like" active={topic.likedByMe} onClick={() => like.mutate(id)}>{topic.likeCount || t('Like')}</IconAction>
            {(topic.isMine || moderator) && <IconAction icon={CheckCircle2} label={topic.resolved ? 'Reopen' : 'Mark resolved'} onClick={() => resolve.mutate({ id, resolved: !topic.resolved })} />}
            {moderator && <IconAction icon={Pin} label={topic.pinned ? 'Unpin' : 'Pin'} onClick={() => pin.mutate({ id, value: !topic.pinned })} />}
            {moderator && <IconAction icon={topic.locked ? Unlock : Lock} label={topic.locked ? 'Unlock' : 'Lock'} onClick={() => lock.mutate({ id, value: !topic.locked })} />}
            {topic.canEdit && <IconAction icon={Pencil} label="Edit" onClick={() => { setDraft({ title: topic.title, body: topic.body }); setEditing(true); }} />}
            {topic.canDelete && <IconAction icon={Trash2} label="Delete" danger onClick={() => window.confirm(topic.isMine ? t('Delete your topic?') : t('Remove this topic for everyone?')) && remove.mutate(id)} />}
            {!topic.isMine && <IconAction icon={Flag} label="Report" onClick={() => setReporting({ targetType: 'topic', targetId: id })} />}
          </div>
        )}
        {topic.canEdit && <p className="mt-2 text-[11px] text-slate-400">{t('You can edit or delete this until {date}.', { date: dateTime(topic.editableUntil) })}</p>}
      </Card>

      <h2 className="mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">{t(topic.replyCount === 1 ? '{n} reply' : '{n} replies', { n: topic.replyCount })}</h2>
      <Card className="px-4 sm:px-6">
        {!topic.replies.length ? <EmptyState icon={MessageCircle} title="No replies yet" description="Be the first to help." /> : (
          <ul className="divide-y divide-slate-100">
            {topic.replies.map((r) => <Reply key={r._id} r={r} moderator={moderator} onReport={setReporting} />)}
          </ul>
        )}
        <Pagination meta={topic.repliesMeta} onPage={setPage} />
      </Card>

      <Card className="mt-4 p-4">
        {canReply ? (
          <div className="space-y-2">
            <MentionTextarea rows={3} placeholder="Write a reply…" value={replyText} onChange={setReplyText} mentions={mentions} onMentionsChange={setMentions} topic={id} />
            <div className="flex justify-end">
              <Button loading={reply.isPending} disabled={!replyText.trim()} onClick={() => reply.mutate({ id, body: replyText, mentions: keepMentions(replyText, mentions) })}>Reply</Button>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-500"><Lock className="size-4" />{hidden ? t('This topic is no longer available.') : t('This topic is locked by the moderators.')}</p>
        )}
      </Card>

      {reporting && (
        <ReportModal open onClose={() => setReporting(null)} reasons={FORUM_REPORT_REASONS} loading={report.isPending}
          onSubmit={(b) => report.mutate({ ...reporting, ...b })} />
      )}
    </div>
  );
}
