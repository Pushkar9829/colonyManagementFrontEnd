import { Package } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { dateTime, label } from '../../../lib/format';
import { formatAge, OPEN_STATUSES } from '../api';

const STATUS_TONE = { received: 'amber', notified: 'blue', collected: 'green', returned: 'slate' };

export function ParcelStatus({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'slate'}>{label(status)}</Badge>;
}

export function AgeBadge({ hours }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', hours >= 24 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>
      {formatAge(hours)}
    </span>
  );
}

// One parcel in a list; `actions` renders on the right (stacked below on phones).
export function ParcelRow({ p, actions, showUnit = true }) {
  const waiting = OPEN_STATUSES.includes(p.status);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        {p.photoUrl ? (
          <a href={p.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={p.photoUrl} alt={`Parcel ${p.number}`} className="size-12 rounded-lg object-cover" />
          </a>
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Package className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{p.courier}</p>
            <ParcelStatus status={p.status} />
            {waiting && <AgeBadge hours={p.ageHours} />}
            {p.leftAtGate && <Badge tone="green">Left at gate</Badge>}
          </div>
          <p className="truncate text-sm text-slate-500">
            {p.number}
            {showUnit && p.unit ? ` · ${p.unit.label}` : ''}
            {p.recipientName ? ` · ${p.recipientName}` : ''}
            {p.packages > 1 ? ` · ${p.packages} packages` : ''}
            {p.trackingNo ? ` · ${p.trackingNo}` : ''}
          </p>
          <p className="text-xs text-slate-400">
            Received {dateTime(p.receivedAt)}
            {p.storageLocation ? ` · ${p.storageLocation}` : ''}
            {p.collectedAt ? ` · collected ${dateTime(p.collectedAt)}${p.collectedBy?.name ? ` by ${p.collectedBy.name}` : p.collectedBy?.type ? ` by ${label(p.collectedBy.type)}` : ''}` : ''}
            {p.returnedAt ? ` · returned ${dateTime(p.returnedAt)}${p.returnReason ? ` (${p.returnReason})` : ''}` : ''}
          </p>
          {p.note && <p className="mt-0.5 text-xs text-slate-500">“{p.note}”</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </li>
  );
}
