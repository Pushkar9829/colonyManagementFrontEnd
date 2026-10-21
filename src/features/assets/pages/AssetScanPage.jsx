import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import { Keyboard, ScanLine } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, ErrorState, Input, PageLoader } from '../../../components/ui';
import { lookupAssetCode } from '../api';
import { codeFromScan } from '../constants';
import { useT } from '../../../context/LanguageContext';
import { errorText } from '../../../lib/errorText';

// Scan an asset's QR label with the phone camera (or type the code) and jump to its page.
export default function AssetScanPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const video = useRef(null);
  const busy = useRef(false);
  const [camError, setCamError] = useState('');
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  const open = async (raw) => {
    const code = codeFromScan(raw);
    if (!code || busy.current) return;
    busy.current = true;
    setError('');
    try {
      const asset = await lookupAssetCode(code);
      navigate(`/assets/${asset._id}`, { replace: true });
    } catch (err) {
      setError(err.status === 404 ? t('No asset with code "{code}"', { code }) : errorText(err, t));
      setTimeout(() => { busy.current = false; }, 1500);
    }
  };
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!video.current) return undefined;
    const scanner = new QrScanner(video.current, (r) => openRef.current(r.data), { returnDetailedScanResult: true, highlightScanRegion: true, maxScansPerSecond: 4 });
    scanner.start().catch(() => setCamError(t('Camera not available. Type the code printed under the QR instead.')));
    return () => scanner.destroy();
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Scan asset" description="Point the camera at the QR label on the equipment." />
      <Card className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
          {camError && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">{camError}</p>}
          {!camError && <ScanLine className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-white/30" />}
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); busy.current = false; open(manual); }}>
          <Input className="flex-1" label="Asset code or tag" placeholder="AST-000001" value={manual} onChange={(e) => setManual(e.target.value)} />
          <Button type="submit" icon={Keyboard}>Open</Button>
        </form>
      </Card>
    </div>
  );
}

// /assets/code/:code — where printed QR labels point. Resolves the code and redirects.
export function AssetByCodePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  useEffect(() => {
    let live = true;
    lookupAssetCode(code)
      .then((a) => live && navigate(`/assets/${a._id}`, { replace: true }))
      .catch((err) => live && setError(err));
    return () => {
      live = false;
    };
  }, [code, navigate]);
  return error ? <ErrorState error={error} onRetry={() => navigate('/assets/scan')} /> : <PageLoader />;
}
