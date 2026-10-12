import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImageUp } from 'lucide-react';
import { Button } from '../../../components/ui';

// Camera QR scanner (rear camera on phones/tablets). Calls onScan(text) once per distinct code;
// the same code is ignored for `cooldownMs` so a code held in front of the camera is not submitted twice.
// Falls back to scanning a photo when no camera is available or permission is denied; `fallbackHint` tells the
// user what to type instead.
export function QrScanner({ onScan, paused = false, cooldownMs = 3000, className = '', fallbackHint = 'Or type the code printed under the QR.' }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const lastRef = useRef({ text: '', at: 0 });
  const onScanRef = useRef(onScan);
  const [state, setState] = useState('starting'); // starting | running | denied | unavailable
  const [enabled, setEnabled] = useState(true);
  const [attempt, setAttempt] = useState(0); // bumped by "Turn on camera" to ask for the camera again
  onScanRef.current = onScan;

  const emit = (text) => {
    const now = Date.now();
    if (text === lastRef.current.text && now - lastRef.current.at < cooldownMs) return;
    lastRef.current = { text, at: now };
    onScanRef.current?.(text);
  };

  useEffect(() => {
    if (!enabled || paused) return undefined;
    let cancelled = false;
    let instance;
    (async () => {
      const { default: Scanner } = await import('qr-scanner');
      if (cancelled) return;
      const hasCamera = await Scanner.hasCamera();
      // closed while the camera check ran: the <video> is gone
      if (cancelled || !videoRef.current) return;
      if (!hasCamera) {
        setState('unavailable');
        return;
      }
      instance = new Scanner(videoRef.current, (r) => emit(r.data), { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment', maxScansPerSecond: 5 });
      scannerRef.current = instance;
      try {
        await instance.start();
        if (!cancelled) setState('running');
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => {
      cancelled = true;
      instance?.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paused, attempt]);

  const turnOn = () => {
    setState('starting');
    setEnabled(true);
    setAttempt((n) => n + 1);
  };

  const scanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const { default: Scanner } = await import('qr-scanner');
    try {
      const r = await Scanner.scanImage(file, { returnDetailedScanResult: true });
      emit(r.data);
    } catch {
      onScanRef.current?.(null);
    }
  };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: '4 / 3' }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        {(state !== 'running' || !enabled || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-slate-200">
            <CameraOff className="size-8 text-slate-400" />
            <p>
              {paused ? 'Checking…' : !enabled ? 'Camera is off.' : state === 'starting' ? 'Starting camera…' : state === 'denied' ? 'The camera is blocked. Tap “Turn on camera” and choose Allow when the browser asks.' : 'No camera found on this device.'}
            </p>
            {!paused && (!enabled || state === 'denied') && (
              <Button size="lg" icon={Camera} onClick={turnOn}>Turn on camera</Button>
            )}
            {!paused && (!enabled || state === 'denied' || state === 'unavailable') && fallbackHint && <p className="font-medium text-white">{fallbackHint}</p>}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={enabled ? CameraOff : Camera} onClick={() => (enabled ? setEnabled(false) : turnOn())}>
          {enabled ? 'Stop camera' : 'Start camera'}
        </Button>
        <label className="inline-flex h-9 cursor-pointer sm:h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          <ImageUp className="size-4" /> Scan a photo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={scanFile} />
        </label>
      </div>
    </div>
  );
}
