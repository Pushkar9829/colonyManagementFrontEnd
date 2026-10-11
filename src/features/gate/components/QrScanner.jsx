import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImageUp } from 'lucide-react';
import { Button } from '../../../components/ui';

// Camera QR scanner (rear camera on phones/tablets). Calls onScan(text) once per distinct code;
// the same code is ignored for `cooldownMs` so a code held in front of the camera is not submitted twice.
// Falls back to scanning a photo when no camera is available or permission is denied.
export function QrScanner({ onScan, paused = false, cooldownMs = 3000, className = '' }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const lastRef = useRef({ text: '', at: 0 });
  const onScanRef = useRef(onScan);
  const [state, setState] = useState('starting'); // starting | running | denied | unavailable
  const [enabled, setEnabled] = useState(true);
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
      if (!(await Scanner.hasCamera())) {
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
  }, [enabled, paused]);

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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-slate-200">
            <CameraOff className="size-8 text-slate-400" />
            {!enabled || paused ? 'Camera off' : state === 'starting' ? 'Starting camera…' : state === 'denied' ? 'Camera permission was denied. Allow camera access in the browser, or scan a photo.' : 'No camera found on this device. Scan a photo instead.'}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={enabled ? CameraOff : Camera} onClick={() => setEnabled((v) => !v)}>
          {enabled ? 'Stop camera' : 'Start camera'}
        </Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          <ImageUp className="size-4" /> Scan a photo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={scanFile} />
        </label>
      </div>
    </div>
  );
}
