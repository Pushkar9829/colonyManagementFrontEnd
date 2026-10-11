import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, FileUpload, Input, Modal, Pagination, Spinner, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date, dateTime, label, money, toPaise } from '../../../lib/format';
import { isFinance, ROLES } from '../../../lib/roles';
import {
  useCreatePurchaseRequest, useDecidePurchaseRequest, useDeletePurchaseRequest, useExpenseSettings, usePurchaseRequest, usePurchaseRequests, useSubmitPurchaseRequest,
} from '../api';
import { VendorPicker } from '../components/VendorPicker';

const blank = () => ({ key: Math.random().toString(36).slice(2), description: '', quantity: '1', rate: '' });

function NewRequestModal({ onClose }) {
  const [v, setV] = useState({ title: '', vendor: '', justification: '', amount: '' });
  const [items, setItems] = useState([blank()]);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const { data: settings } = useExpenseSettings();
  const create = useCreatePurchaseRequest({ onSuccess: onClose });
  const filled = items.filter((i) => i.description.trim() && Number(i.rate) > 0);
  const itemsTotal = filled.reduce((s, i) => s + Math.round(Number(i.quantity || 0) * toPaise(i.rate)), 0);
  const total = filled.length ? itemsTotal : toPaise(v.amount);
  const setItem = (key, patch) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const send = (submit) =>
    create.mutate(
      {
        title: v.title, vendor: v.vendor || undefined, justification: v.justification || undefined, submit,
        items: filled.length ? filled.map((i) => ({ description: i.description, quantity: Number(i.quantity || 1), rate: toPaise(i.rate) })) : undefined,
        amount: filled.length ? undefined : toPaise(v.amount),
        attachments: files.length ? files.map((f) => f._id) : undefined,
      },
      { onError: (err) => setErrors(err.fieldErrors || {}) },
    );
  const auto = settings?.autoApproveLimit > 0 && total > 0 && total <= settings.autoApproveLimit;
  return (
    <Modal open onClose={onClose} size="lg" title="New purchase request" description="An admin other than you approves it before anything is bought."
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" loading={create.isPending && create.variables?.submit === false} disabled={v.title.trim().length < 3 || !total} onClick={() => send(false)}>Save draft</Button>
          <Button icon={Send} loading={create.isPending && create.variables?.submit === true} disabled={v.title.trim().length < 3 || !total} onClick={() => send(true)}>{auto ? 'Submit (auto-approves)' : 'Submit for approval'}</Button>
        </>
      )}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="What is needed" required placeholder="e.g. Replace basement water pump" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={errors.title} />
        <VendorPicker className="sm:col-span-2" label="Preferred vendor" placeholder="Not decided yet" value={v.vendor} onChange={(id) => setV({ ...v, vendor: id })} />
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-slate-700">Items</p>
        {items.map((i) => (
          <div key={i.key} className="grid grid-cols-[1fr_4.5rem_6.5rem_auto] gap-2">
            <Input placeholder="Description" aria-label="Item" value={i.description} onChange={(e) => setItem(i.key, { description: e.target.value })} />
            <Input type="number" min={0} aria-label="Quantity" value={i.quantity} onChange={(e) => setItem(i.key, { quantity: e.target.value })} />
            <Input type="number" min={0} step="0.01" placeholder="Rate ₹" aria-label="Rate" value={i.rate} onChange={(e) => setItem(i.key, { rate: e.target.value })} />
            <button type="button" aria-label="Remove item" disabled={items.length === 1} onClick={() => setItems((xs) => xs.filter((x) => x.key !== i.key))} className="flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setItems((xs) => [...xs, blank()])}>Add item</Button>
        {!filled.length && <Input label="Or an estimated total (₹)" type="number" min={0} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} error={errors.amount} />}
        <p className="text-sm text-slate-600">Estimated total <b>{money(total)}</b>{settings?.autoApproveLimit ? ` · requests up to ${money(settings.autoApproveLimit)} are approved automatically` : ''}</p>
      </div>
      <div className="mt-4 space-y-4">
        <Textarea label="Justification" rows={3} placeholder="Why is this needed? Quotes compared?" value={v.justification} onChange={(e) => setV({ ...v, justification: e.target.value })} />
        <FileUpload folder="expenses" files={files} onChange={setFiles} label="Attach quotes" />
      </div>
    </Modal>
  );
}

function RequestDetail({ id, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pr, isLoading } = usePurchaseRequest(id);
  const [note, setNote] = useState('');
  const decide = useDecidePurchaseRequest({ onSuccess: onClose });
  const submit = useSubmitPurchaseRequest();
  const remove = useDeletePurchaseRequest({ onSuccess: onClose });
  const mine = pr && String(pr.requestedBy?._id) === String(user._id);
  const canDecide = pr && user.role === ROLES.ADMIN && pr.status === 'pending' && !mine;
  return (
    <Modal open onClose={onClose} size="lg" title={pr ? `${pr.number} · ${pr.title}` : 'Purchase request'} description={pr && `Raised by ${pr.requestedBy?.name} on ${date(pr.createdAt)}`}
      footer={pr && (
        <>
          {mine && pr.status === 'draft' && <Button variant="ghost" icon={Trash2} loading={remove.isPending} onClick={() => window.confirm('Delete this draft?') && remove.mutate(pr._id)}>Delete</Button>}
          {mine && pr.status === 'draft' && <Button icon={Send} loading={submit.isPending} onClick={() => submit.mutate(pr._id)}>Submit</Button>}
          {canDecide && (
            <>
              <Button variant="danger" icon={XCircle} disabled={note.trim().length < 3} loading={decide.isPending && decide.variables?.decision === 'reject'} onClick={() => decide.mutate({ id: pr._id, decision: 'reject', note })}>Reject</Button>
              <Button variant="success" icon={CheckCircle2} loading={decide.isPending && decide.variables?.decision === 'approve'} onClick={() => decide.mutate({ id: pr._id, decision: 'approve', note })}>Approve</Button>
            </>
          )}
          {isFinance(user) && pr.status === 'approved' && <Button onClick={() => navigate(`/expenses/bills?fromPr=${pr._id}`)}>Record vendor bill</Button>}
        </>
      )}>
      {isLoading || !pr ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={pr.status} />
            {pr.autoApproved && <Badge tone="blue">Auto-approved</Badge>}
            {pr.vendor && <span className="text-slate-600">Vendor: <b>{pr.vendor.name}</b></span>}
            {pr.vendorBill && <span className="text-slate-600">Billed as <b>{pr.vendorBill.number}</b></span>}
          </div>
          {pr.items.length > 0 && (
            <table className="min-w-full overflow-hidden rounded-lg border border-slate-200">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pr.items.map((i, n) => <tr key={n}><td className="px-3 py-2">{i.description}</td><td className="px-3 py-2 text-right">{i.quantity}</td><td className="px-3 py-2 text-right tabular-nums">{money(i.rate)}</td><td className="px-3 py-2 text-right tabular-nums">{money(i.amount)}</td></tr>)}
              </tbody>
            </table>
          )}
          <p className="text-base font-semibold text-slate-900">Total {money(pr.amount)}</p>
          {pr.justification && <p className="whitespace-pre-line text-slate-700">{pr.justification}</p>}
          <Attachments items={pr.attachments} />
          {pr.decisionNote && <p className="rounded-lg bg-slate-50 px-3 py-2">Decision note: {pr.decisionNote}{pr.decidedBy ? ` — ${pr.decidedBy.name}` : ''}</p>}
          {canDecide && <Textarea label="Note (required to reject)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
          {user.role === ROLES.ADMIN && pr.status === 'pending' && mine && <p className="text-xs text-amber-700">You raised this request, so another admin has to approve it.</p>}
          <ol className="space-y-1 border-l border-slate-200 pl-4 text-xs text-slate-500">
            {pr.history.map((h, n) => <li key={n}>{dateTime(h.createdAt)} · {label(h.to)}{h.by?.name ? ` by ${h.by.name}` : ''}{h.note ? ` — ${h.note}` : ''}</li>)}
          </ol>
        </div>
      )}
    </Modal>
  );
}

export default function PurchaseRequestsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(user.role === ROLES.ADMIN ? 'awaiting' : '');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const query = { page, ...(tab === 'awaiting' ? { awaitingMe: true } : tab ? { status: tab } : {}) };
  const { data, isLoading } = usePurchaseRequests(query);
  const openId = params.get('open');
  const setOpen = (id) => setParams((p) => { if (id) p.set('open', id); else p.delete('open'); return p; }, { replace: true });
  const tabs = [
    ...(user.role === ROLES.ADMIN ? [{ value: 'awaiting', label: 'Awaiting my approval' }] : []),
    { value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'draft', label: 'Drafts' },
    { value: 'rejected', label: 'Rejected' }, { value: 'converted', label: 'Billed' },
  ];
  return (
    <div>
      <PageHeader title="Purchase requests" description={isFinance(user) ? 'Requests to spend society money, approved by an admin other than the requester.' : 'Ask the committee before buying anything for the society.'}
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>New request</Button>} />
      <Tabs className="mb-4" value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={tabs} />
      <Card>
        <Table loading={isLoading} rows={data?.data} empty={tab === 'awaiting' ? 'Nothing waiting for you' : 'No purchase requests'} onRowClick={(p) => setOpen(p._id)}
          columns={[
            { key: 'number', header: 'Request', render: (p) => <span className="font-mono text-xs font-semibold">{p.number}</span> },
            { key: 'title', header: 'Title', className: 'max-w-xs', render: (p) => <div className="truncate"><p className="truncate font-medium text-slate-900">{p.title}</p><p className="text-xs text-slate-500">{p.vendor?.name || 'No vendor yet'}</p></div> },
            { key: 'amount', header: 'Amount', className: 'text-right', render: (p) => <span className="tabular-nums">{money(p.amount)}</span> },
            { key: 'requestedBy', header: 'Raised by', render: (p) => p.requestedBy?.name },
            { key: 'createdAt', header: 'Date', render: (p) => date(p.createdAt) },
            { key: 'status', header: 'Status', render: (p) => <div className="flex items-center gap-1"><StatusBadge status={p.status} />{p.autoApproved && <Badge tone="blue">Auto</Badge>}</div> },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      {!isLoading && !data?.data?.length && tab === '' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><ClipboardList className="size-4" />Raise a request for repairs, supplies or services; it is tracked until the vendor bill is paid.</p>
      )}
      {creating && <NewRequestModal onClose={() => setCreating(false)} />}
      {openId && <RequestDetail id={openId} onClose={() => setOpen(null)} />}
    </div>
  );
}
