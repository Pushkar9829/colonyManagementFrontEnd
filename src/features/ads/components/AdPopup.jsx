import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { sendAdEvent, useActiveAds } from '../api';
import { adStore, popupDue, safeUrl } from '../lib';
import { AdMedia } from './AdMedia';

const DELAY_MS = 1500;

// Pop-up ad: at most one per visit, after a short pause so it never fights the page loading. On phones it stops
// above the bottom bar so navigation stays usable. Not shown while viewing someone else's account.
export function AdPopup() {
  const { user } = useAuth();
  const { t } = useT();
  const { data } = useActiveAds(user?.membershipId || 'platform', { enabled: Boolean(user) });
  const [ad, setAd] = useState(null);
  const candidate = data?.popup;

  useEffect(() => {
    if (!candidate || user?.actingAs || !popupDue(candidate, { seen: adStore.seen(), shownThisVisit: adStore.visit() })) return undefined;
    const id = setTimeout(() => {
      adStore.markVisit(candidate._id);
      adStore.markSeen(candidate._id);
      sendAdEvent(candidate._id, 'impression', 'popup');
      setAd(candidate);
    }, DELAY_MS);
    return () => clearTimeout(id);
  }, [candidate, user?.actingAs]);

  useEffect(() => {
    if (!ad) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!ad) return null;
  const href = safeUrl(ad.landingUrl);
  function close() {
    sendAdEvent(ad._id, 'dismiss', 'popup');
    setAd(null);
  }
  return (
    <div className="fixed inset-x-0 top-0 bottom-16 z-40 flex items-center justify-center p-4 lg:bottom-0" role="dialog" aria-modal="true" aria-labelledby="ad-popup-title">
      <div className="absolute inset-0 bg-slate-900/50" onClick={close} />
      <div className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button type="button" onClick={close} className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-slate-600 shadow hover:bg-white" aria-label={t('Close ad')}>
          <X className="size-5" />
        </button>
        <AdMedia ad={ad} controls className="aspect-video w-full shrink-0" />
        <div className="space-y-3 overflow-y-auto p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('Sponsored')}</p>
          <h2 id="ad-popup-title" className="text-lg font-semibold text-slate-900">{ad.title}</h2>
          {ad.body && <p className="text-sm text-slate-600">{ad.body}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {href && (
              <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => { sendAdEvent(ad._id, 'click', 'popup'); setAd(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                {ad.ctaLabel} <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
            <button type="button" onClick={close} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t('Not now')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
