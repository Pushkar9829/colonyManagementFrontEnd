import { useState } from 'react';
import { AlertTriangle, CloudOff, RefreshCw, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { dateTime, time } from '../../../lib/format';

const KIND = { entry: 'Entry', checkout: 'Check-out', pass: 'Pass', help_scan: 'Daily help' };

// "Offline — N queued" strip plus the list of queued actions and sync conflicts.
export function OfflineBanner({ queue }) {
  const [open, setOpen] = useState(false);
  const { online, queued, conflicts, syncing, sync, dismiss, retry } = queue;
  if (online && !queued.length && !conflicts.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {(!online || queued.length > 0) && (
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${online ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`} role="status">
          {online ? <RefreshCw className={`size-5 ${syncing ? 'animate-spin' : ''}`} /> : <CloudOff className="size-5" />}
          <p className="flex-1 font-medium">
            {online ? `Back online — ${syncing ? 'syncing' : 'waiting to sync'} ${queued.length} action${queued.length === 1 ? '' : 's'}` : `Offline — ${queued.length} queued`}
            {!online && <span className="block text-xs font-normal">Entries, check-outs and daily-help scans are saved on this device and sent when the connection returns.</span>}
          </p>
          {queued.length > 0 && <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'Show'} queue</Button>}
          {online && queued.length > 0 && <Button size="sm" variant="secondary" loading={syncing} onClick={sync}>Sync now</Button>}
        </div>
      )}
      {open && queued.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
          {queued.map((o) => (
            <li key={o.key} className="flex items-center gap-3 px-4 py-2">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{KIND[o.kind]}</span>
              <span className="flex-1 truncate text-slate-800">{o.label}</span>
              <span className="text-xs text-slate-400">{time(o.occurredAt)}</span>
            </li>
          ))}
        </ul>
      )}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" /> {conflicts.length} offline action{conflicts.length === 1 ? ' was' : 's were'} not applied</p>
          <ul className="space-y-2">
            {conflicts.map((o) => (
              <li key={o.key} className="flex flex-wrap items-start gap-2 rounded-lg bg-white/70 p-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{KIND[o.kind]}: {o.label}</p>
                  <p className="text-xs">{o.message} · at {dateTime(o.occurredAt)}</p>
                </div>
                {o.code !== 'VISITOR_BLOCKED' && <Button size="sm" variant="ghost" onClick={() => retry(o.key)}>Retry</Button>}
                <Button size="sm" variant="ghost" icon={X} aria-label="Dismiss" onClick={() => dismiss(o.key)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
