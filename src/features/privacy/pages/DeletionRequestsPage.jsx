import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, Modal, Pagination, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { dateTime, label } from '../../../lib/format';
import { PermissionGate } from '../../platform/components/PermissionGate';

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

// Society admins decide on their members' requests; the platform team (privacy.handle) on requests from
// people with no society.
export default function DeletionRequestsPage() {
  const { user } = useAuth();
  if (user.society) return <DeletionRequests />;
  return (
    <PermissionGate permission="privacy.handle">
      <DeletionRequests />
    </PermissionGate>
  );
}

function DeletionRequests() {
  const { user } = useAuth();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState(null); // { request, action }
  const [note, setNote] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['deletion-requests', status, page],
    queryFn: () => api.list('/privacy/deletion-requests', { status: status || undefined, page, limit: 20 }),
    placeholderData: (p) => p,
  });
  const close = () => { setDeciding(null); setNote(''); };
  const decide = useApiMutation(({ id, action, body }) => api.post(`/privacy/deletion-requests/${id}/${action}`, body), {
    invalidate: ['deletion-requests'],
    success: (d) => (d.status === 'approved' ? 'Account deleted' : d.status === 'rejected' ? 'Request declined' : 'Approved — waiting for the other societies'),
    onSuccess: close,
  });
  const approving = deciding?.action === 'approve';

  return (
    <div>
      <PageHeader
        title="Account deletion requests"
        description={user.society
          ? 'Members asking for their account and personal data to be erased. Bills, payments, receipts and registers are kept, as the law requires.'
          : 'Requests from people who are not in any society.'}
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={STATUSES} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No requests"
          columns={[
            { key: 'createdAt', header: 'Requested', render: (r) => dateTime(r.createdAt) },
            { key: 'userName', header: 'Member', render: (r) => (
              <div>
                <p className="font-medium text-slate-800">{r.userName}</p>
                {r.roles?.length > 0 && <p className="text-xs text-slate-500">{r.roles.map((m) => [label(m.role), m.unit].filter(Boolean).join(' · ')).join(', ')}</p>}
              </div>
            ) },
            { key: 'reason', header: 'Reason', className: 'max-w-xs', render: (r) => <span className="text-sm text-slate-600">{r.reason || '—'}</span> },
            { key: 'status', header: 'Status', render: (r) => (
              <div>
                <StatusBadge status={r.status} />
                {r.status === 'pending' && r.societies > 1 && <p className="mt-1 text-xs text-slate-500">{r.approvals}/{r.societies} societies approved</p>}
                {r.decisionNote && <p className="mt-1 text-xs text-slate-500">{r.decisionNote}</p>}
              </div>
            ) },
            { key: 'actions', header: '', render: (r) => r.status === 'pending' && !r.approvedHere && String(r.user) !== String(user._id) && (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="danger" onClick={() => setDeciding({ request: r, action: 'approve' })}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeciding({ request: r, action: 'reject' })}>Decline</Button>
              </div>
            ) },
          ]} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>

      <Modal open={Boolean(deciding)} onClose={close} title={approving ? `Delete ${deciding?.request.userName}'s account?` : 'Decline this request'}
        footer={<>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant={approving ? 'danger' : 'primary'} loading={decide.isPending} disabled={!approving && note.trim().length < 3}
            onClick={() => decide.mutate({ id: deciding.request._id, action: deciding.action, body: { note: note.trim() || undefined } })}>
            {approving ? 'Approve & delete' : 'Decline'}
          </Button>
        </>}>
        <div className="space-y-4 text-sm text-slate-600">
          {approving ? (
            <p>Their name, email, phone and photo are removed, all sessions end and their memberships close. Bills, payments, receipts, registers and the audit log stay with the flat. This cannot be undone.</p>
          ) : (
            <p>The member is told why. Under the DPDP Act a request can be declined only for a lawful reason (for example, an open dispute or records you must keep).</p>
          )}
          <Textarea label={approving ? 'Note (optional)' : 'Reason'} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
