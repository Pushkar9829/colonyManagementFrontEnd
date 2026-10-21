import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { Button, Modal, Spinner } from '../../../components/ui';
import { CATEGORY_LABELS } from '../constants';
import { useT } from '../../../context/LanguageContext';

// The QR holds a link to /assets/code/<code>: any phone camera opens the asset page,
// and the in-app scanner reads the code out of it.
export const assetQrUrl = (code) => `${window.location.origin}/assets/code/${encodeURIComponent(code)}`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function QrLabelModal({ asset, open, onClose }) {
  const { t } = useT();
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!open || !asset) return;
    QRCode.toDataURL(assetQrUrl(asset.code), { width: 320, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [open, asset]);

  // Prints just the label in its own window, sized for a 60 × 80 mm sticker.
  const print = () => {
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(asset.code)}</title><style>
      @page { size: 60mm 80mm; margin: 3mm; }
      body { font-family: system-ui, sans-serif; margin: 0; text-align: center; }
      .label { width: 54mm; margin: 0 auto; padding: 2mm; border: 0.3mm solid #000; border-radius: 2mm; }
      img { width: 44mm; height: 44mm; }
      .code { font: 700 14pt ui-monospace, monospace; letter-spacing: 0.06em; margin: 1mm 0; }
      .name { font-size: 9pt; font-weight: 600; } .meta { font-size: 7pt; color: #333; }
    </style></head><body><div class="label"><img src="${qr}" alt="QR"/><div class="code">${esc(asset.code)}</div>
      <div class="name">${esc(asset.name)}</div><div class="meta">${esc(CATEGORY_LABELS[asset.category] ? t(CATEGORY_LABELS[asset.category]) : '')}${asset.location ? ` · ${esc(asset.location)}` : ''}</div>
      <div class="meta">${esc(t('Scan to view history / report a fault'))}</div></div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script></body></html>`);
    w.document.close();
  };

  return (
    <Modal open={open} onClose={onClose} title="QR label" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={Printer} disabled={!qr} onClick={print}>Print label</Button></>}>
      {asset && (
        <div className="mx-auto w-60 rounded-xl border-2 border-slate-900 p-4 text-center">
          <div className="mx-auto flex size-48 items-center justify-center">{qr ? <img src={qr} alt={t('QR code for {code}', { code: asset.code })} className="size-full" /> : <Spinner />}</div>
          <p className="mt-2 font-mono text-lg font-bold tracking-wider text-slate-900">{asset.code}</p>
          <p className="text-sm font-semibold text-slate-800">{asset.name}</p>
          <p className="text-xs text-slate-500">{CATEGORY_LABELS[asset.category] && t(CATEGORY_LABELS[asset.category])}{asset.location ? ` · ${asset.location}` : ''}</p>
        </div>
      )}
    </Modal>
  );
}
