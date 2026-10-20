import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { sendAdEvent, useActiveAds } from '../api';
import { adStore, bannerToShow, safeUrl } from '../lib';
import { AdMedia } from './AdMedia';

// Slim, dismissible strip under the header. One banner at a time; closing it shows the next one, and the server
// keeps it closed for that person for the rest of the day.
export function AdBanner() {
  const { user } = useAuth();
  const { t } = useT();
  const { data } = useActiveAds(user?.membershipId || 'platform', { enabled: Boolean(user) });
  const [hidden, setHidden] = useState(() => new Set());
  const ad = bannerToShow(data?.banners, hidden);

  // One impression per banner per visit.
  useEffect(() => {
    if (!ad) return;
    const key = `banner:${ad._id}`;
    if (adStore.visit().has(key)) return;
    adStore.markVisit(key);
    sendAdEvent(ad._id, 'impression', 'banner');
  }, [ad]);

  if (!ad) return null;
  const href = safeUrl(ad.landingUrl);
  const close = () => {
    setHidden((h) => new Set(h).add(String(ad._id)));
    sendAdEvent(ad._id, 'dismiss', 'banner');
  };
  return (
    <aside aria-label={t('Sponsored')} className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-6">
      <AdMedia ad={ad} className="h-11 w-16 shrink-0 rounded-md sm:h-12 sm:w-24" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{ad.title}</p>
        <p className="truncate text-xs text-slate-500">
          <span className="mr-1 rounded bg-slate-100 px-1 py-px text-[10px] font-medium uppercase tracking-wide text-slate-500">{t('Ad')}</span>
          {ad.body}
        </p>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => sendAdEvent(ad._id, 'click', 'banner')}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
          <span className="max-w-[7rem] truncate">{ad.ctaLabel}</span> <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
      <button type="button" onClick={close} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={t('Close ad')}>
        <X className="size-4" />
      </button>
    </aside>
  );
}
