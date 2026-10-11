import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Lock, MessageSquare, XCircle } from 'lucide-react';
import { Attachments, Badge, Button, Card, CardHeader, Checkbox, ErrorState, FileUpload, Input, Modal, PageLoader, StatusBadge, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { dateTime, date, label, money, periodLabel, timeAgo } from '../../../lib/format';
import { downloadPdf } from '../../committee/lib';
import { useApproveRequest, useCancelRequest, useRejectRequest, useRequest, useRequestComment, useRequestInfo, useRespondRequest } from '../api';
import { requestTitle, statusTone } from '../constants';

function Detail({ k, v }) {
  if (v === undefined || v === null || v === '') return null;
  return <div><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="text-sm text-slate-800">{v}</dd></div>;
}

function ApproveModal({ r, open, onClose }) {
  const toast = useToast();
  const [fees, setFees] = useState(r.fees || '');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [editLetter, setEditLetter] = useState(false);
  const [body, setBody] = useState('');
  const approve = useApproveRequest({ onSuccess: onClose });
  const owes = r.kind === 'noc' && r.dues?.outstanding > 0;
  return (
    <Modal open={open} onClose={onClose} title={`Approve ${r.number}`} description="A letter on the society letterhead is issued to the resident."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" loading={approve.isPending} disabled={owes && !ack}
        onClick={() => approve.mutate({ id: r._id, fees: fees || undefined, note: note || undefined, acknowledgeDues: owes ? ack : undefined, letterBody: editLetter && body.trim() ? body : undefined }, { onError: (err) => toast.error(err) })}>Approve & issue letter</Button></>}>
      <div className="space-y-4">
        {owes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="size-4" />{money(r.dues.outstanding)} outstanding for {r.unitLabel}</p>
            <Checkbox className="mt-2" label="Approve the NOC despite outstanding dues" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          </div>
        )}
        <Input label="Fees (optional)" placeholder="e.g. Transfer fee ₹25,000 payable before registration" value={fees} onChange={(e) => setFees(e.target.value)} />
        <Input label="Internal note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Checkbox label="Write the letter text myself" checked={editLetter} onChange={(e) => setEditLetter(e.target.checked)} />
        {editLetter && <Textarea rows={8} placeholder="Leave blank to use the standard wording for this NOC" value={body} onChange={(e) => setBody(e.target.value)} hint="Separate paragraphs with a blank line." />}
      </div>
    </Modal>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const { data: r, isLoading, error, refetch } = useRequest(id);
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState([]);
  const [approving, setApproving] = useState(false);
  const [busy, setBusy] = useState(false);
  const comment = useRequestComment({ onSuccess: () => { setText(''); setFiles([]); } });
  const respond = useRespondRequest({ onSuccess: () => { setText(''); setFiles([]); } });
  const cancel = useCancelRequest();
  const askInfo = useRequestInfo();
  const reject = useRejectRequest();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const open = ['pending', 'info_requested'].includes(r.status);
  const own = String(r.raisedBy?._id) === String(user._id);
  const letter = async () => {
    setBusy(true);
    try {
      await downloadPdf(`/requests/${r._id}/letter/pdf`, `${r.letter.number}.pdf`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const send = () => {
    const attachments = files.length ? files.map((f) => f._id) : undefined;
    if (own && r.status === 'info_requested') respond.mutate({ id: r._id, text, attachments });
    else comment.mutate({ id: r._id, text, internal: r.canManage ? internal : undefined, attachments });
  };
  const m = r.move || {};
  const i = r.info || {};

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/requests" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> All requests</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-slate-500">{r.number}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{requestTitle(r)}</h1>
          <p className="mt-1 text-sm text-slate-600">{r.unitLabel} · {r.applicantName} ({label(r.residentType)}) · {dateTime(r.createdAt)}</p>
          <div className="mt-2 flex gap-2"><StatusBadge status={statusTone(r.status)} />{r.fees && <Badge tone="blue">Fees: {r.fees}</Badge>}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.hasLetter && <Button icon={Download} loading={busy} onClick={letter}>Download letter</Button>}
          {r.canManage && open && (
            <>
              <Button variant="success" icon={CheckCircle2} onClick={() => setApproving(true)}>Approve</Button>
              {r.status === 'pending' && <Button variant="secondary" icon={MessageSquare} onClick={() => { const note = window.prompt('What information do you need from the resident?'); if (note?.trim()) askInfo.mutate({ id: r._id, note }); }}>Ask for info</Button>}
              <Button variant="danger" icon={XCircle} onClick={() => { const reason = window.prompt('Reason for rejecting'); if (reason?.trim()) reject.mutate({ id: r._id, reason }); }}>Reject</Button>
            </>
          )}
          {own && open && <Button variant="ghost" onClick={() => { if (window.confirm('Withdraw this request?')) cancel.mutate(r._id); }}>Withdraw</Button>}
        </div>
      </div>

      {r.status === 'info_requested' && own && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The committee needs more information. Reply below and attach any documents asked for.</Card>
      )}
      {r.decisionNote && ['approved', 'rejected'].includes(r.status) && (
        <Card className="mb-6 p-4 text-sm text-slate-700">{r.status === 'approved' ? 'Approved' : 'Rejected'} by {r.decidedBy?.name || 'the committee'} on {date(r.decidedAt)}: {r.decisionNote}</Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail k="Addressed to" v={r.addressedTo} />
              <Detail k="Purpose" v={r.purpose} />
              <Detail k="Buyer" v={i.buyerName} />
              <Detail k="Bank" v={i.bankName} />
              <Detail k="Loan amount" v={i.loanAmount ? money(i.loanAmount) : undefined} />
              <Detail k="Provider" v={i.provider} />
              <Detail k="Work" v={i.workDescription} />
              <Detail k="Work period" v={i.workFrom ? `${date(i.workFrom)} – ${i.workTo ? date(i.workTo) : '…'}` : undefined} />
              <Detail k="Contractor" v={i.contractorName ? `${i.contractorName}${i.contractorPhone ? ` · ${i.contractorPhone}` : ''}` : undefined} />
              <Detail k="Moving date" v={m.date ? `${date(m.date)}, ${m.from} – ${m.to}` : undefined} />
              <Detail k="Lift" v={m.date ? (m.liftBooking ? 'Service lift booked' : 'Not needed') : undefined} />
              <Detail k="Vehicle" v={m.vehicleNumber ? `${m.vehicleNumber}${m.vehicleType ? ` (${m.vehicleType})` : ''}` : undefined} />
              <Detail k="Driver" v={m.driverName ? `${m.driverName}${m.driverPhone ? ` · ${m.driverPhone}` : ''}` : undefined} />
              <Detail k="Movers" v={m.moversCompany} />
              <Detail k="Occupancy" v={m.tenancy && label(m.tenancy)} />
            </dl>
            {r.description && <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{r.description}</p>}
            {r.attachments?.length > 0 && <div className="mt-4"><Attachments items={r.attachments} /></div>}
          </Card>

          <Card>
            <CardHeader title="Conversation" />
            <ul className="divide-y divide-slate-100">
              {r.comments.map((c) => (
                <li key={c._id} className={c.internal ? 'bg-amber-50/50 px-5 py-3' : 'px-5 py-3'}>
                  <p className="text-xs text-slate-500">{c.by?.name} · {timeAgo(c.createdAt)} {c.internal && <span className="inline-flex items-center gap-0.5 text-amber-700"><Lock className="size-3" />internal</span>}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-800">{c.text}</p>
                  {c.attachments?.length > 0 && <div className="mt-2"><Attachments items={c.attachments} /></div>}
                </li>
              ))}
              {!r.comments.length && <li className="px-5 py-4 text-sm text-slate-500">No messages yet.</li>}
            </ul>
            {r.status !== 'cancelled' && (
              <div className="space-y-2 border-t border-slate-100 p-4">
                <Textarea rows={2} placeholder={own && r.status === 'info_requested' ? 'Your reply to the committee' : 'Write a message'} value={text} onChange={(e) => setText(e.target.value)} />
                <FileUpload folder="documents" files={files} onChange={setFiles} max={3} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {r.canManage ? <Checkbox label="Internal note (committee only)" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> : <span />}
                  <Button size="sm" disabled={!text.trim()} loading={comment.isPending || respond.isPending} onClick={send}>{own && r.status === 'info_requested' ? 'Send reply' : 'Send'}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {r.canManage && r.dues && (
            <Card>
              <CardHeader title="Maintenance dues" subtitle={r.unitLabel} />
              <div className="p-5">
                <p className={r.dues.outstanding ? 'text-2xl font-semibold text-red-600' : 'text-2xl font-semibold text-emerald-600'}>{money(r.dues.outstanding)}</p>
                <p className="text-xs text-slate-500">{r.dues.outstanding ? 'outstanding — consider holding the NOC' : 'No dues pending'}</p>
                {r.dues.bills.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {r.dues.bills.map((b) => <li key={b._id} className="flex justify-between"><span>{periodLabel(b.period)}</span><span>{money(b.balance)}</span></li>)}
                  </ul>
                )}
                {r.duesAtApproval > 0 && r.status === 'approved' && <p className="mt-3 text-xs text-amber-700">Approved with {money(r.duesAtApproval)} outstanding.</p>}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="History" />
            <ul className="space-y-2 p-5 text-sm">
              {r.history.map((h, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={idx}><span className="font-medium text-slate-800">{label(h.to)}</span>{h.note ? <span className="text-slate-600"> — {h.note}</span> : null}<span className="block text-xs text-slate-500">{h.by?.name} · {dateTime(h.createdAt)}</span></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      {r.canManage && open && <ApproveModal r={r} open={approving} onClose={() => setApproving(false)} />}
    </div>
  );
}
