import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock, KeyRound, MapPin, ScanLine, XCircle } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, ErrorState, Spinner } from '../../../components/ui';
import { QrScanner } from '../../gate/components/QrScanner';
import { cn } from '../../../lib/cn';
import { dateTime, time } from '../../../lib/format';
import { getPosition, useCurrentPatrol, useScanCheckpoint } from '../api';
import { RoundStatus, windowLabel } from './shared';
import { useT } from '../../../context/LanguageContext';

function RouteCard({ item }) {
  const { t } = useT();
  const done = item.checkpoints.filter((c) => c.scannedAt).length;
  const total = item.checkpoints.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Card>
      <CardHeader
        title={item.route.name}
        subtitle={item.slot ? t('Round {window}', { window: windowLabel(item.slot) }) : t('No round running right now')}
        action={<RoundStatus status={item.status} className="shrink-0" />}
      />
      <div className="space-y-3 px-5 py-4">
        {item.slot && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{t('{done} of {total} checkpoints', { done, total })}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <ol className="space-y-2">
          {item.checkpoints.map((c, i) => (
            <li key={c._id} className="flex items-start gap-2.5 text-sm">
              {c.scannedAt ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" />}
              <div className="min-w-0 flex-1">
                <p className={cn('font-medium', c.scannedAt ? 'text-slate-900' : 'text-slate-600')}>
                  {item.route.enforceOrder && <span className="mr-1 text-slate-400">{i + 1}.</span>}
                  {c.name}
                </p>
                {c.location && <p className="truncate text-xs text-slate-500">{c.location}</p>}
                {c.gpsOk === false && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="size-3.5" /> {t('GPS did not match the checkpoint')}
                  </p>
                )}
              </div>
              {c.scannedAt && <span className="shrink-0 text-xs text-slate-500">{time(c.scannedAt)}</span>}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Clock className="size-3.5" /> {t('Every {n} min', { n: item.route.frequencyMinutes })}</span>
          {item.nextDueAt && <span>{t('Next round {when}', { when: dateTime(item.nextDueAt) })}</span>}
          {item.route.enforceOrder && <span className="font-medium text-slate-600">{t('Walk in order')}</span>}
        </div>
      </div>
    </Card>
  );
}

function ScanResult({ result }) {
  const { t } = useT();
  if (!result) return null;
  if (result.error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-red-800" role="alert">
        <XCircle className="size-7 shrink-0" />
        <div>
          <p className="text-base font-semibold">{t('Scan not recorded')}</p>
          <p className="text-sm">{result.error}</p>
        </div>
      </div>
    );
  }
  const { checkpoint, scan, rounds } = result.data;
  const already = rounds.length > 0 && rounds.every((r) => r.alreadyScanned || r.closed);
  const warn = scan.gpsOk === false || already || !rounds.length;
  return (
    <div className={cn('rounded-xl border-2 p-4', warn ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900')} role="status">
      <div className="flex items-start gap-3">
        {warn ? <AlertTriangle className="size-7 shrink-0" /> : <CheckCircle2 className="size-7 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{checkpoint.name}</p>
          {checkpoint.location && <p className="text-sm opacity-80">{checkpoint.location}</p>}
          <p className="mt-1 text-xs opacity-70">{t('Scanned at {time}', { time: time(scan.scannedAt) })}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
        <MapPin className="size-4" />
        {scan.gpsOk === true && (scan.distanceM != null ? t('GPS OK ({m} m away)', { m: scan.distanceM }) : t('GPS OK'))}
        {scan.gpsOk === false && t('GPS mismatch — {m} m from the checkpoint', { m: scan.distanceM })}
        {scan.gpsOk == null && t('GPS not checked')}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {!rounds.length && <li>{t('Not part of a running round — the scan was still logged.')}</li>}
        {rounds.map((r) => (
          <li key={r._id} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.route.name}:</span>
            <span>{t('{scanned}/{expected} done', { scanned: r.scanned, expected: r.expected })}</span>
            <RoundStatus status={r.status} />
            {r.alreadyScanned && <span className="font-semibold">{t('Already scanned this round')}</span>}
            {r.closed && <span className="font-semibold">{t('Round already closed')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScanPanel() {
  const { t } = useT();
  const [result, setResult] = useState(null);
  const [code, setCode] = useState('');
  const [locating, setLocating] = useState(false);
  const busyRef = useRef(false);
  const scan = useScanCheckpoint();

  const submit = async (raw) => {
    const value = raw?.trim();
    if (!value || busyRef.current) return;
    busyRef.current = true;
    setLocating(true);
    // Scans are still accepted without GPS; the server just skips the distance check.
    const pos = await getPosition(5000);
    setLocating(false);
    scan.mutate(
      { code: value, ...(pos || {}) },
      {
        onSuccess: (data) => {
          setResult({ data });
          setCode('');
          navigator.vibrate?.(120);
        },
        onError: (err) => {
          setResult({ error: err.message });
          navigator.vibrate?.([80, 60, 80]);
        },
        onSettled: () => {
          busyRef.current = false;
        },
      },
    );
  };

  const onScan = (text) => {
    if (text === null) setResult({ error: t('No QR code was found in that photo. Try again closer to the code.') });
    else submit(text);
  };

  const busy = locating || scan.isPending;
  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader title="Scan checkpoint" subtitle="Point the camera at the checkpoint QR code" />
      <div className="space-y-4 p-4 sm:p-5">
        <QrScanner onScan={onScan} paused={busy} fallbackHint={t('Or type the code printed under the QR in the box below.')} />
        {busy && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-600">
            <Spinner className="size-5" /> {locating ? t('Getting location…') : t('Recording scan…')}
          </div>
        )}
        <ScanResult result={result} />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(code);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('Checkpoint code')}
              aria-label={t('Checkpoint code')}
              autoCapitalize="characters"
              className="block h-12 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Button type="submit" size="lg" icon={ScanLine} disabled={!code.trim()} loading={busy}>
            Submit
          </Button>
        </form>
      </div>
    </Card>
  );
}

export function PatrolTab({ canScan }) {
  const { data, isLoading, error, refetch } = useCurrentPatrol();
  const list = (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={ScanLine} title="No active patrol routes" description="A facility manager needs to set up checkpoints and a route first." /></Card>
      ) : (
        data.map((item) => <RouteCard key={item.route._id} item={item} />)
      )}
    </div>
  );
  if (!canScan) return list;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <ScanPanel />
      {list}
    </div>
  );
}
