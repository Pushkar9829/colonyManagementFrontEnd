import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, Spinner, StatusBadge } from '../../../components/ui';
import { label, timeAgo } from '../../../lib/format';
import { useComplaints } from '../../complaints/api';

const ACTIVE = ['open', 'assigned', 'in_progress', 'on_hold', 'reopened'];

// Complaints assigned to the signed-in person that still need work. The list API has no "any open status"
// filter, so the latest assigned tickets are fetched and the closed ones dropped here.
export function MyTicketsCard({ limit = 6 }) {
  const { data, isLoading } = useComplaints({ mine: true, limit: 50 });
  const open = (data?.data || []).filter((c) => ACTIVE.includes(c.status));
  const rows = open.slice(0, limit);
  return (
    <Card>
      <CardHeader
        title="My tickets"
        subtitle={open.length ? `${open.length} open complaint${open.length === 1 ? '' : 's'} assigned to you` : 'Complaints assigned to you'}
        action={<Link to="/complaints" className="text-sm font-medium text-brand-600 hover:underline">All</Link>}
      />
      {isLoading ? (
        <div className="flex justify-center p-6"><Spinner /></div>
      ) : !rows.length ? (
        <EmptyState icon={Wrench} title="No open tickets" description="New complaints assigned to you show up here." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c._id}>
              <Link to={`/complaints/${c._id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.ticketNumber} · {label(c.category)}{c.unit?.label ? ` · ${c.unit.label}` : ''} · {timeAgo(c.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  {c.isOverdue && <Badge tone="red">Late</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
