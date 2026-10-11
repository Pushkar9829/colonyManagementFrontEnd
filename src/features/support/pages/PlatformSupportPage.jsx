import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Inbox, LifeBuoy, MessageSquare } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Modal, PageLoader, Pagination, Select, StatCard, StatusBadge, Table, Textarea } from '../../../components/ui';
import { label, timeAgo } from '../../../lib/format';
import { CATEGORIES, PRIORITIES, STATUSES, useAssignTicket, usePlatformReply, usePlatformStatus, usePlatformTicket, usePlatformTickets, useSupportStats } from '../api';
import { SlaBadge, TicketThread } from '../components/TicketThread';

const opts = (list) => list.map((v) => ({ value: v, label: label(v) }));

function ConsoleTicketModal({ id, onClose }) {
  const { data: t, isLoading } = usePlatformTicket(id);
  const [text, setText] = useState('');
  const [after, setAfter] = useState('waiting_on_customer');
  const reply = usePlatformReply(id);
  const status = usePlatformStatus(id);
  const assign = useAssignTicket(id);

  return (
    <Modal open onClose={onClose} size="lg" title={t ? `${t.number} · ${t.subject}` : 'Ticket'} description={t ? `${t.society?.name} (${t.society?.code}) · raised by ${t.raisedBy?.name} (${label(t.raisedByRole)}) · ${t.raisedBy?.email || t.raisedBy?.phone || ''}` : undefined}
      footer={t && t.status !== 'closed' && (
        <>
          {!t.assignedTo && <Button variant="secondary" loading={assign.isPending} onClick={() => assign.mutate({})}>Assign to me</Button>}
          {t.status !== 'resolved' && <Button variant="success" loading={status.isPending} onClick={() => status.mutate({ status: 'resolved' })}>Mark resolved</Button>}
          <Button variant="ghost" loading={status.isPending} onClick={() => status.mutate({ status: 'closed', note: 'Closed by support' })}>Close</Button>
        </>
      )}>
      {isLoading || !t ? <PageLoader /> : (
        <div className="space-y-4">
          {t.assignedTo && <p className="text-xs text-slate-500">Assigned to {t.assignedTo.name}</p>}
          <TicketThread ticket={t} viewer="platform" />
          {t.status !== 'closed' && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <Textarea label="Reply to the society" hint="Sent in-app and by email to the requester and the society’s admins" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex flex-wrap items-end gap-2">
                <Select className="w-56" label="Then set status" value={after} onChange={(e) => setAfter(e.target.value)} options={opts(['waiting_on_customer', 'in_progress', 'resolved'])} />
                <Button icon={MessageSquare} disabled={!text.trim()} loading={reply.isPending} onClick={() => reply.mutate({ text, status: after }, { onSuccess: () => setText('') })}>Send reply</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function PlatformSupportPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('ticket');
  const [f, setF] = useState({ status: '', priority: '', category: '', awaiting: 'platform', breached: '', search: '', page: 1 });
  const query = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
  const { data, isLoading } = usePlatformTickets({ ...query, active: f.status ? undefined : true });
  const { data: stats } = useSupportStats();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <PageHeader title="Support tickets" description="Tickets raised by society admins, facility managers and accountants across all societies." />
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Inbox} label="Waiting for us" value={stats.awaitingPlatform} tone="amber" />
          <StatCard icon={AlertTriangle} label="First-response SLA missed" value={stats.breached} tone="red" />
          <StatCard icon={LifeBuoy} label="Open / in progress" value={(stats.byStatus.open || 0) + (stats.byStatus.in_progress || 0)} tone="sky" />
        </div>
      )}
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Input className="lg:col-span-2" placeholder="Search subject or SUP-number" value={f.search} onChange={set('search')} />
          <Select placeholder="Active tickets" value={f.status} onChange={set('status')} options={opts(STATUSES)} />
          <Select placeholder="Any priority" value={f.priority} onChange={set('priority')} options={opts(PRIORITIES)} />
          <Select placeholder="Any category" value={f.category} onChange={set('category')} options={opts(CATEGORIES)} />
          <Select placeholder="Anyone’s turn" value={f.awaiting} onChange={set('awaiting')} options={[{ value: 'platform', label: 'Waiting for us' }, { value: 'society', label: 'Waiting for society' }]} />
        </div>
        <div className="flex gap-3 px-4 pt-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.breached === 'true'} onChange={(e) => setF((x) => ({ ...x, breached: e.target.checked ? 'true' : '', page: 1 }))} /> SLA missed only</label>
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No tickets match" onRowClick={(t) => setParams({ ticket: t._id })}
          columns={[
            { key: 'subject', header: 'Ticket', render: (t) => <div><p className="font-medium text-slate-900">{t.subject}</p><p className="text-xs text-slate-500">{t.number} · {label(t.category)}</p></div> },
            { key: 'society', header: 'Society', render: (t) => <div><p>{t.society?.name}</p><p className="text-xs text-slate-500">{t.raisedBy?.name}</p></div> },
            { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
            { key: 'status', header: 'Status', render: (t) => <div className="flex flex-wrap gap-1"><StatusBadge status={t.status} />{t.awaiting === 'platform' && <Badge tone="amber">Needs reply</Badge>}<SlaBadge ticket={t} /></div> },
            { key: 'assignedTo', header: 'Owner', render: (t) => t.assignedTo?.name || '—' },
            { key: 'lastActivityAt', header: 'Updated', render: (t) => timeAgo(t.lastActivityAt) },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      </Card>
      {openId && <ConsoleTicketModal id={openId} onClose={() => setParams({})} />}
    </div>
  );
}
