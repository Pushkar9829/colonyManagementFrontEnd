import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LifeBuoy, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, FileUpload, Input, Modal, PageLoader, Pagination, Select, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { label, timeAgo } from '../../../lib/format';
import { CATEGORIES, PRIORITIES, useCloseTicket, useCreateTicket, useReopenTicket, useReplyTicket, useTicket, useTickets } from '../api';
import { SlaBadge, TicketThread } from '../components/TicketThread';

const opts = (list) => list.map((v) => ({ value: v, label: label(v) }));

function NewTicketModal({ onClose }) {
  const { values, bind, applyServerErrors } = useForm({ category: 'technical', priority: 'medium', subject: '', description: '' });
  const [files, setFiles] = useState([]);
  const create = useCreateTicket({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Contact ColonyHub support" description="For problems with the app, your plan or invoices. Residents’ issues go to the Helpdesk."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...values, description: values.description || undefined, attachments: files.length ? files.map((f) => f._id) : undefined }, { onError: applyServerErrors })}>Send</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" options={opts(CATEGORIES)} {...bind('category')} />
        <Select label="Priority" options={opts(PRIORITIES)} hint="Urgent: we reply within 4 hours" {...bind('priority')} />
        <Input className="sm:col-span-2" label="Subject" required {...bind('subject')} />
        <Textarea className="sm:col-span-2" label="Details" rows={5} placeholder="What happened, where, and what you expected" {...bind('description')} />
        <FileUpload className="sm:col-span-2" folder="support" files={files} onChange={setFiles} label="Screenshots" />
      </div>
    </Modal>
  );
}

function TicketModal({ id, onClose }) {
  const { data: t, isLoading } = useTicket(id);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const reply = useReplyTicket(id);
  const close = useCloseTicket(id);
  const reopen = useReopenTicket(id);
  const closed = t?.status === 'closed';
  const send = () => reply.mutate({ text, attachments: files.length ? files.map((f) => f._id) : undefined }, { onSuccess: () => { setText(''); setFiles([]); } });

  return (
    <Modal open onClose={onClose} size="lg" title={t ? `${t.number} · ${t.subject}` : 'Ticket'}
      footer={t && (
        <>
          {['resolved', 'closed'].includes(t.status) && <Button variant="secondary" loading={reopen.isPending} onClick={() => { const note = window.prompt('What is still wrong?'); if (note) reopen.mutate({ note }); }}>Reopen</Button>}
          {!closed && <Button variant="secondary" loading={close.isPending} onClick={() => { const r = window.prompt('Close this ticket. Rate the support from 1 to 5 (optional):', '5'); if (r !== null) close.mutate({ rating: Number(r) >= 1 && Number(r) <= 5 ? Number(r) : undefined }); }}>Close ticket</Button>}
        </>
      )}>
      {isLoading || !t ? <PageLoader /> : (
        <div className="space-y-4">
          <TicketThread ticket={t} viewer="society" />
          {!closed && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <Textarea label="Reply" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
              <FileUpload folder="support" files={files} onChange={setFiles} max={3} label="Attach" />
              <Button icon={LifeBuoy} disabled={!text.trim()} loading={reply.isPending} onClick={send}>Send reply</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function SupportPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('ticket');
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('active');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTickets({ page, ...(tab === 'active' ? { active: true } : {}) });
  const openTicket = (id) => setParams(id ? { ticket: id } : {});

  return (
    <div>
      <PageHeader title="Support" description="Tickets with the ColonyHub team about the app, your plan or invoices." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New ticket</Button>} />
      <Tabs className="mb-4 w-fit" value={tab} onChange={(v) => { setTab(v); setPage(1); }} tabs={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'All' }]} />
      <Card>
        <Table loading={isLoading} rows={data?.data} empty="No tickets" onRowClick={(t) => openTicket(t._id)}
          columns={[
            { key: 'number', header: 'Ticket', render: (t) => <div><p className="font-medium text-slate-900">{t.subject}</p><p className="text-xs text-slate-500">{t.number} · {label(t.category)} · by {t.raisedBy?.name}</p></div> },
            { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
            { key: 'status', header: 'Status', render: (t) => <div className="flex flex-wrap gap-1"><StatusBadge status={t.status} />{t.awaiting === 'society' && <Badge tone="blue">Your reply needed</Badge>}<SlaBadge ticket={t} /></div> },
            { key: 'lastActivityAt', header: 'Updated', render: (t) => timeAgo(t.lastActivityAt) },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      {creating && <NewTicketModal onClose={() => setCreating(false)} />}
      {openId && <TicketModal id={openId} onClose={() => openTicket(null)} />}
    </div>
  );
}
