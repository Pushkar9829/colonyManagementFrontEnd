import { useEffect, useState } from 'react';
import { Spinner } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';

// Renders `value` as a QR code image (data URL, so it can also be downloaded or printed).
export function QrImage({ value, size = 220, className = '', label }) {
  const [src, setSrc] = useState(null);
  const { t } = useT();
  useEffect(() => {
    let alive = true;
    import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' }).then((url) => alive && setSrc(url)),
    );
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <Spinner />
      </div>
    );
  }
  return <img src={src} width={size} height={size} alt={label || t('QR code')} className={className} />;
}

export async function qrDataUrl(value, size = 400) {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' });
}
