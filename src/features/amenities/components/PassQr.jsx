import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// QR of the pass code; guards scan it (or type the code) on the pass-check screen.
export function PassQr({ code, size = 160 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(code, { width: size, margin: 1 })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [code, size]);
  return (
    <div className="flex flex-col items-center gap-1">
      {src ? <img src={src} alt={`Pass ${code}`} width={size} height={size} className="rounded-lg border border-slate-200" /> : <div style={{ width: size, height: size }} className="rounded-lg bg-slate-100" />}
      <p className="font-mono text-sm font-semibold tracking-widest text-slate-800">{code}</p>
    </div>
  );
}
