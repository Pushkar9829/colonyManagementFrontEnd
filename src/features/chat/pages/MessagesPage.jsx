import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Building2, Check, CheckCheck, ImagePlus, MessageCircle, MessagesSquare, PhoneCall, Plus, Search, Send, ShieldCheck, Tag, UserX } from 'lucide-react';
import { Badge, Button, Card, EmptyState, FileUpload, Modal, Spinner } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/cn';
import { dateTime, time, timeAgo } from '../../../lib/format';
import { Avatar, RichText } from '../../forum/components/RichText';
import {
  sendTyping, useBlockUser, useChatBlocks, useChatContacts, useConversation, useConversations, useMarkChatRead, useMessages, useOpenDesk, useOpenDirect, useSendMessage, useUnblockUser,
} from '../api';
import { useChatSocket } from '../useChatSocket';

const DESK_ICON = { security: ShieldCheck, management: Building2 };
const agentDesks = (role) => ({ guard: ['security'], admin: ['management'], facility_manager: ['management'] }[role] || []);

function NewChatModal({ open, onClose, role }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useChatContacts(search || undefined, open);
  const go = { onSuccess: (c) => { onClose(); navigate(`/messages/${c._id}`); } };
  const direct = useOpenDirect(go);
  const desk = useOpenDesk(go);
  const asDesk = role === 'guard';
  return (
    <Modal open={open} onClose={onClose} title="New message">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or flat" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none" />
      </div>
      {data?.desks?.length > 0 && !search && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {data.desks.map((d) => {
            const Icon = DESK_ICON[d.desk];
            return (
              <button key={d.desk} type="button" onClick={() => desk.mutate({ desk: d.desk })} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50/40">
                <Icon className="size-5 text-brand-600" /><span className="text-sm font-medium text-slate-800">{d.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div> : !data?.people.length ? (
        <EmptyState icon={UserX} title="No one found" description={asDesk ? 'Search a resident by name or flat number.' : 'Neighbours appear here once they opt in to the resident directory.'} />
      ) : (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {data.people.map((p) => (
            <li key={p._id}>
              <button type="button" onClick={() => (asDesk ? desk.mutate({ desk: 'security', member: p._id }) : direct.mutate(p._id))} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50">
                <Avatar name={p.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="truncate text-xs text-slate-500">{p.units?.join(', ') || p.designation || ''}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function BlockedModal({ open, onClose }) {
  const { data = [], isLoading } = useChatBlocks(open);
  const unblock = useUnblockUser();
  return (
    <Modal open={open} onClose={onClose} title="Blocked people">
      {isLoading ? <Spinner /> : !data.length ? <EmptyState icon={Ban} title="You haven't blocked anyone" /> : (
        <ul className="divide-y divide-slate-100">
          {data.map((b) => (
            <li key={b.user._id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-slate-800">{b.user.name}<span className="font-normal text-slate-400"> · {b.user.units?.join(', ')}</span></span>
              <Button size="sm" variant="secondary" onClick={() => unblock.mutate(b.user._id)}>Unblock</Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ConversationList({ activeId, onNew, onBlocked }) {
  const navigate = useNavigate();
  const { data, isLoading } = useConversations({ limit: 50 });
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Chats</h2>
        <div className="flex gap-1">
          <button type="button" title="Blocked people" onClick={onBlocked} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Ban className="size-4" /></button>
          <Button size="sm" icon={Plus} onClick={onNew}>New</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : !data?.data.length ? (
          <EmptyState icon={MessagesSquare} title="No conversations yet" description="Message a neighbour, the security desk or the management office." action={<Button size="sm" icon={Plus} onClick={onNew}>Start a chat</Button>} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((c) => {
              const Icon = c.kind === 'desk' && !c.asDesk ? DESK_ICON[c.desk] : null;
              return (
                <li key={c._id}>
                  <button type="button" onClick={() => navigate(`/messages/${c._id}`)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50', activeId === c._id && 'bg-brand-50/60')}>
                    {Icon ? <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"><Icon className="size-4" /></span> : <Avatar name={c.counterpart?.name || c.title} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-sm', c.unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{c.title}</p>
                        <span className="shrink-0 text-[11px] text-slate-400">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-slate-500">
                          {c.asDesk && <span className="mr-1 font-medium text-brand-700">{c.desk === 'security' ? 'Security' : 'Office'}:</span>}
                          {c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.text || (c.lastMessage.hasAttachment ? 'Photo' : '')}` : 'No messages yet'}
                        </p>
                        {c.unread > 0 && <span className="shrink-0 rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Thread({ id, typing }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: conv, isLoading: convLoading, error } = useConversation(id);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(id);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [attaching, setAttaching] = useState(false);
  const markRead = useMarkChatRead();
  const block = useBlockUser({ onSuccess: () => qc.invalidateQueries({ queryKey: ['chat'] }) });
  const unblock = useUnblockUser();
  const bottom = useRef(null);
  const lastTyping = useRef(0);
  const send = useSendMessage({
    onSuccess: (m) => {
      appendMessage(qc, m);
      setText('');
      setFiles([]);
      setAttaching(false);
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  const messages = useMemo(() => (data ? [...data.pages].reverse().flatMap((p) => p.data) : []), [data]);
  const lastId = messages[messages.length - 1]?._id;
  const { mutate: read } = markRead;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);
  useEffect(() => {
    if (conv?.unread) read(id);
  }, [conv?.unread, id, read, lastId]);

  if (convLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (error) return <Card className="h-full"><EmptyState icon={MessageCircle} title="Conversation not found" /></Card>;

  const submit = () => {
    if (!text.trim() && !files.length) return;
    send.mutate({ id, text, attachments: files.length ? files.map((f) => f._id) : undefined });
  };
  const onType = (v) => {
    setText(v);
    if (Date.now() - lastTyping.current > 3000) {
      lastTyping.current = Date.now();
      sendTyping(id);
    }
  };
  const lastMine = [...messages].reverse().find((m) => m.mine);
  const seen = lastMine && conv.otherReadAt && new Date(conv.otherReadAt) >= new Date(lastMine.createdAt);
  const DeskIcon = conv.kind === 'desk' && !conv.asDesk ? DESK_ICON[conv.desk] : null;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <button type="button" onClick={() => navigate('/messages')} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Back"><ArrowLeft className="size-5" /></button>
        {DeskIcon ? <span className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-white"><DeskIcon className="size-4" /></span> : <Avatar name={conv.counterpart?.name || conv.title} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{conv.title}</p>
          <p className="truncate text-xs text-slate-500">
            {typing ? <span className="text-brand-600">{typing} is typing…</span> : conv.kind === 'desk' ? (conv.asDesk ? `Replying as ${conv.desk === 'security' ? 'Security desk' : 'Management office'}` : 'Any staff member on duty can reply') : conv.counterpart?.units?.join(', ') || conv.counterpart?.designation || ''}
          </p>
        </div>
        {conv.kind === 'direct' && (conv.blockedByMe ? (
          <Button size="sm" variant="secondary" onClick={() => unblock.mutate(conv.counterpart._id, { onSuccess: () => qc.invalidateQueries({ queryKey: ['chat'] }) })}>Unblock</Button>
        ) : (
          <button type="button" title="Block" onClick={() => window.confirm(`Block ${conv.title}? Neither of you will be able to send messages.`) && block.mutate(conv.counterpart._id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Ban className="size-4" /></button>
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4">
        {hasNextPage && (
          <div className="text-center"><Button size="sm" variant="ghost" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Load earlier messages</Button></div>
        )}
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : !messages.length ? (
          <p className="py-10 text-center text-sm text-slate-400">Say hello 👋</p>
        ) : messages.map((m) => (
          <div key={m._id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]', m.mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-white text-slate-800')}>
              {conv.kind === 'desk' && m.asDesk && (
                <p className={cn('mb-0.5 text-[11px] font-medium', m.mine ? 'text-brand-100' : 'text-brand-700')}>{m.sender.name} · {conv.desk === 'security' ? 'Security desk' : 'Management'}</p>
              )}
              {m.context && (
                <p className={cn('mb-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]', m.mine ? 'bg-brand-700/60 text-brand-50' : 'bg-slate-100 text-slate-600')}><Tag className="size-3" />{m.context.title}</p>
              )}
              {m.attachments.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {m.attachments.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name || 'photo'} className="max-h-48 rounded-lg object-cover" /></a>)}
                </div>
              )}
              {m.text && <RichText text={m.text} mentions={false} className={cn(m.mine && '[&_a]:text-white')} />}
              <p className={cn('mt-0.5 text-right text-[10px]', m.mine ? 'text-brand-100' : 'text-slate-400')} title={dateTime(m.createdAt)}>{time(m.createdAt)}</p>
            </div>
          </div>
        ))}
        {lastMine && conv.kind === 'direct' && (
          <p className="flex items-center justify-end gap-1 text-[11px] text-slate-400">{seen ? <><CheckCheck className="size-3.5 text-brand-600" />Seen</> : <><Check className="size-3.5" />Sent</>}</p>
        )}
        <div ref={bottom} />
      </div>

      {conv.kind === 'direct' && conv.blockedByMe ? (
        <p className="border-t border-slate-100 p-4 text-center text-sm text-slate-500">You blocked this person. Unblock to send messages.</p>
      ) : (
        <div className="border-t border-slate-100 p-2 sm:p-3">
          {attaching && <FileUpload className="mb-2" folder="chat" files={files} onChange={setFiles} max={4} camera={false} label="Add photo" />}
          <div className="flex items-end gap-2">
            <button type="button" title="Attach photo" onClick={() => setAttaching((a) => !a)} className={cn('rounded-lg p-2 text-slate-500 hover:bg-slate-100', attaching && 'bg-slate-100 text-brand-600')}><ImagePlus className="size-5" /></button>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Type a message"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <Button icon={Send} loading={send.isPending} disabled={!text.trim() && !files.length} onClick={submit} aria-label="Send" />
          </div>
        </div>
      )}
    </Card>
  );
}

// Adds a message to the cached thread (newest page), ignoring duplicates from the socket echo.
function appendMessage(qc, m) {
  qc.setQueryData(['chat', 'messages', String(m.conversation)], (old) => {
    if (!old) return old;
    if (old.pages.some((p) => p.data.some((x) => x._id === m._id))) return old;
    const [first, ...rest] = old.pages;
    return { ...old, pages: [{ ...first, data: [...first.data, m] }, ...rest] };
  });
}

function QuickActions({ role }) {
  const navigate = useNavigate();
  const open = useOpenDesk({ onSuccess: (c) => navigate(`/messages/${c._id}`) });
  const mine = agentDesks(role);
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
      {!mine.includes('security') && (
        <Button variant="secondary" icon={PhoneCall} loading={open.isPending && open.variables?.desk === 'security'} onClick={() => open.mutate({ desk: 'security' })}>Call gate</Button>
      )}
      {!mine.includes('management') && (
        <Button variant="secondary" icon={Building2} loading={open.isPending && open.variables?.desk === 'management'} onClick={() => open.mutate({ desk: 'management' })}>Message office</Button>
      )}
      {mine.length > 0 && <Badge tone="brand" className="col-span-2 self-center">You answer the {mine.map((d) => (d === 'security' ? 'security desk' : 'management office')).join(' & ')}</Badge>}
    </div>
  );
}

export default function MessagesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [typing, setTyping] = useState(null);
  const typingTimer = useRef(null);

  const onMessage = useCallback((m) => {
    appendMessage(qc, m);
    qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    qc.invalidateQueries({ queryKey: ['chat', 'unread'] });
    if (String(m.conversation) === id) {
      qc.invalidateQueries({ queryKey: ['chat', 'conversation', id] });
      if (!m.mine) setTyping(null);
    }
  }, [qc, id]);
  const onTyping = useCallback((t) => {
    if (String(t.conversation) !== id) return;
    setTyping(t.name || 'Someone');
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(null), 4000);
  }, [id]);
  const onRead = useCallback((r) => {
    qc.invalidateQueries({ queryKey: ['chat', 'conversation', String(r.conversation)] });
    qc.invalidateQueries({ queryKey: ['chat', 'unread'] });
  }, [qc]);
  useChatSocket({ onMessage, onTyping, onRead });
  useEffect(() => () => clearTimeout(typingTimer.current), []);
  useEffect(() => setTyping(null), [id]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Chat with neighbours, the security desk and the management office.</p>
        </div>
        <Link to="/directory" className="text-sm font-medium text-brand-600 hover:underline">Resident directory</Link>
      </div>
      <QuickActions role={user.role} />
      <div className="grid h-[calc(100dvh-15rem)] min-h-[420px] gap-4 lg:grid-cols-[20rem_1fr]">
        <div className={cn('min-h-0', id && 'hidden lg:block')}>
          <ConversationList activeId={id} onNew={() => setCreating(true)} onBlocked={() => setBlocked(true)} />
        </div>
        <div className={cn('min-h-0', !id && 'hidden lg:block')}>
          {id ? <Thread key={id} id={id} typing={typing} /> : (
            <Card className="flex h-full items-center justify-center"><EmptyState icon={MessageCircle} title="Pick a conversation" description="Or start a new one with a neighbour." /></Card>
          )}
        </div>
      </div>
      {creating && <NewChatModal open onClose={() => setCreating(false)} role={user.role} />}
      <BlockedModal open={blocked} onClose={() => setBlocked(false)} />
    </div>
  );
}
