import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, Input, Select } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date as fmtDate } from '../../../lib/format';
import { useAmenities, useCheckPass } from '../api';

// Rear-camera QR reader; reports each decoded text once every few seconds.
function Scanner({ onScan }) {
  const video = useRef(null);
  const last = useRef({ text: '', at: 0 });
  const cb = useRef(onScan);
  const [on, setOn] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0); // a tap after an error asks for the camera again
  cb.current = onScan;

  useEffect(() => {
    if (!on) return undefined;
    let instance;
    let cancelled = false;
    (async () => {
      const { default: QrScanner } = await import('qr-scanner');
      if (cancelled || !video.current) return;
      instance = new QrScanner(
        video.current,
        (r) => {
          const now = Date.now();
          if (r.data === last.current.text && now - last.current.at < 3000) return;
          last.current = { text: r.data, at: now };
          cb.current(r.data);
        },
        { returnDetailedScanResult: true, preferredCamera: 'environment', highlightScanRegion: true },
      );
      try {
        await instance.start();
      } catch {
        if (!cancelled) setError('Camera unavailable or permission denied. Type the code instead.');
      }
    })();
    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [on, attempt]);

  const start = () => {
    setError(null);
    setOn(true);
    setAttempt((n) => n + 1);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: '4 / 3' }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={video} className="size-full object-cover" playsInline muted />
        {/* While the camera is off the whole box is the button, so it is easy to hit. */}
        {(!on || error) && (
          <button type="button" onClick={start} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-slate-200 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand-400">
            <Camera className="size-10 text-slate-300" />
            <span className="text-base font-semibold text-white">{error ? 'Tap to try again' : 'Tap to scan pass'}</span>
            {error && <span className="text-sm text-slate-300">{error}</span>}
          </button>
        )}
      </div>
      {on && !error && <Button className="mt-2" size="sm" variant="secondary" icon={CameraOff} onClick={() => setOn(false)}>Stop camera</Button>}
    </div>
  );
}

export default function PassCheckPage() {
  const { data: amenities = [] } = useAmenities();
  const [amenity, setAmenity] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const check = useCheckPass({ onSuccess: (r) => setResult(r) });
  const run = (c) => {
    const value = (c || '').trim();
    if (value.length >= 4) check.mutate({ code: value, amenity: amenity || undefined });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Pass check" description="Scan a member's amenity pass QR or type its code. Valid checks are logged as an entry." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <Select label="Checking at" placeholder="Any amenity" options={amenities.map((a) => ({ value: a._id, label: a.name }))} value={amenity} onChange={(e) => setAmenity(e.target.value)} />
          <Scanner onScan={(text) => { setCode(text); run(text); }} />
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(code); }}>
            <Input className="flex-1" placeholder="Pass code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <Button type="submit" className="self-start" loading={check.isPending}>Check</Button>
          </form>
        </Card>
        <Card className={cn('flex flex-col items-center justify-center p-6 text-center', result && (result.valid ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'))}>
          {!result ? <p className="text-sm text-slate-500">The result shows here.</p> : (
            <>
              {result.valid ? <CheckCircle2 className="size-14 text-emerald-600" /> : <XCircle className="size-14 text-red-600" />}
              <p className={cn('mt-2 text-xl font-semibold', result.valid ? 'text-emerald-800' : 'text-red-800')}>{result.valid ? 'Valid pass' : 'Not valid'}</p>
              {result.reason && <p className="text-sm text-red-700">{result.reason}</p>}
              {result.pass && (
                <div className="mt-3 text-sm text-slate-700">
                  <p className="font-medium">{result.pass.holder?.name}{result.pass.unit ? ` · ${result.pass.unit.label}` : ''}</p>
                  <p>{result.pass.amenity?.name} · {result.pass.plan?.name}</p>
                  <p className="text-xs text-slate-500">Valid {fmtDate(result.pass.validFrom)} – {fmtDate(result.pass.validTo)}{result.pass.entries ? ` · entry #${result.pass.entries}` : ''}</p>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
