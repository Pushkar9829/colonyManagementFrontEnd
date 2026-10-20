import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { useActingCheck } from '../api';
import { actingSummary } from '../lib';

// Persistent amber bar while viewing someone else's account. Ends the session by itself when time is up, or as
// soon as the server says it has ended.
export function ActingAsBanner() {
  const { user, exitLoginAs } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [leaving, setLeaving] = useState(false);
  const acting = Boolean(user?.actingAs);
  const check = useActingCheck(acting);
  const exiting = useRef(false);

  const exit = async () => {
    if (exiting.current) return;
    exiting.current = true;
    setLeaving(true);
    await exitLoginAs();
    navigate('/');
  };

  useEffect(() => {
    if (!acting) return undefined;
    exiting.current = false;
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [acting]);

  const expiresAt = acting ? new Date(user.actingAs.expiresAt).getTime() : 0;
  useEffect(() => {
    if (!acting) return undefined;
    const id = setTimeout(exit, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acting, expiresAt]);

  useEffect(() => {
    if (acting && check.error?.status === 401) exit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acting, check.error]);

  const s = actingSummary(user, now);
  if (!s) return null;
  return (
    <div role="status" className="sticky top-16 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 sm:px-6">
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{t('You are viewing as')} {s.who}</span>
        <span className="text-amber-800"> · {s.minutes} {t('min left')}</span>
      </p>
      <button type="button" onClick={exit} disabled={leaving} className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-800 disabled:opacity-60">
        <LogOut className="size-3.5" aria-hidden="true" /> {t('Exit')}
      </button>
    </div>
  );
}
