import { Car, Package, PhoneCall, ShieldAlert, ShieldX, User, Wrench, Truck, WifiOff } from 'lucide-react';
import { Badge, StatusBadge } from '../../../components/ui';
import { label, time, timeAgo } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';

const ICONS = { guest: User, delivery: Package, cab: Car, service: Wrench, other: Truck };

// `actionsBelow` keeps the buttons under the details at every width (narrow side columns, big gate buttons).
export function VisitorRow({ v, actions, showUnit = true, actionsBelow = false }) {
  const Icon = ICONS[v.purpose] || User;
  const { t } = useT();
  const at = v.occurredAt || v.createdAt;
  return (
    <li className={`flex flex-col gap-3 p-4 ${actionsBelow ? '' : 'sm:flex-row sm:items-center'} ${v.flag?.type === 'watch' ? 'bg-amber-50/60' : ''} ${v.callResident && v.status === 'pending' ? 'bg-red-50/60' : ''}`}>
      <div className="flex min-w-0 flex-1 gap-3">
        {v.photoUrl ? (
          <a href={v.photoUrl} target="_blank" rel="noreferrer" className="shrink-0"><img src={v.photoUrl} alt={v.name} className="size-10 rounded-full object-cover" /></a>
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{v.name}</p>
            <StatusBadge status={v.status} />
            {v.pass && <span className="text-xs text-brand-600">{t('Pre-approved')}</span>}
            {v.autoApproved && <Badge tone="green">{t('Frequent · auto')}</Badge>}
            {v.leftAtGate && <Badge tone="blue">{t('Left at gate')}</Badge>}
            {v.offline && <Badge tone="slate"><WifiOff className="mr-1 size-3" />{t('Offline entry')}</Badge>}
            {v.flag?.type === 'watch' && (
              <Badge tone="amber"><ShieldAlert className="mr-1 size-3" />{t('Watchlist')}</Badge>
            )}
            {v.flag?.type === 'block' && (
              <Badge tone="red"><ShieldX className="mr-1 size-3" />{t('Blocked')}</Badge>
            )}
            {v.callResident && v.status === 'pending' && (
              <Badge tone="red"><PhoneCall className="mr-1 size-3" />{t('Call resident')}</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {t(label(v.purpose))}
            {v.company ? ` · ${v.company}` : ''}
            {showUnit && v.unit ? ` · ${v.unit.label}` : ''}
            {v.phone ? ` · ${v.phone}` : ''}
            {v.vehicleNumber ? ` · ${v.vehicleNumber}` : ''}
          </p>
          {v.flag?.reason && <p className="text-xs font-medium text-amber-700">{v.flag.reason}</p>}
          <p className="text-xs text-slate-400">
            {timeAgo(at)}
            {v.checkInAt ? ` · ${t('in {time}', { time: time(v.checkInAt) })}` : ''}
            {v.checkOutAt ? ` · ${t('out {time}', { time: time(v.checkOutAt) })}` : ''}
            {v.respondedBy ? ` · ${t('by {name}', { name: v.respondedBy.name })}` : ''}
            {v.entryGateName ? ` · ${v.entryGateName}` : ''}
            {v.exitGateName && v.exitGateName !== v.entryGateName ? ` → ${v.exitGateName}` : ''}
          </p>
          {v.gateOverride?.reason && <p className="text-xs text-amber-700">{t('Gate override: {reason}', { reason: v.gateOverride.reason })}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}
