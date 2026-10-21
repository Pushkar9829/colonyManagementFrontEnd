import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronsUpDown, Clock, LayoutGrid, Plus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { ROLE_LABELS } from '../../../lib/roles';
import { cn } from '../../../lib/cn';
import { isPlatformMember } from '../../../lib/platformPermissions';
import { AddHomeModal } from './AddHomeModal';

const describe = (m, t) => [ROLE_LABELS[m.role] && t(ROLE_LABELS[m.role]), m.unit?.label].filter(Boolean).join(' · ');

// Sidebar header: shows the open society/home and lets the user jump between their memberships.
export function HomeSwitcher({ onSwitched }) {
  const { user, switchTo } = useAuth();
  const toast = useToast();
  const { t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);
  const isPlatform = !user.society;
  const others = user.memberships || [];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = async (membershipId) => {
    setBusy(membershipId ?? 'platform');
    try {
      await switchTo(membershipId);
      setOpen(false);
      onSwitched?.();
      navigate('/');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative px-3 pb-3" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50" aria-haspopup="listbox" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{isPlatform ? t('Platform console') : user.society?.name}</p>
          <p className="truncate text-xs text-slate-500">{isPlatform ? (user.platformRoleName ? t('{role} · all societies', { role: user.platformRoleName }) : t('All societies')) : describe(user, t)}</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute inset-x-3 z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="listbox">
          <ul className="max-h-72 overflow-y-auto py-1">
            {isPlatformMember(user) && (
              <li>
                <button type="button" onClick={() => choose(null)} disabled={isPlatform || busy} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-default">
                  <LayoutGrid className="size-4 text-brand-600" />
                  <span className="flex-1 font-medium text-slate-800">{t('Platform console')}</span>
                  {isPlatform && <Check className="size-4 text-brand-600" />}
                </button>
              </li>
            )}
            {others.map((m) => {
              const current = String(m._id) === String(user.membershipId);
              const pending = m.status === 'pending';
              return (
                <li key={m._id}>
                  <button type="button" onClick={() => !current && !pending && choose(m._id)} disabled={current || pending || Boolean(busy)}
                    className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-default', pending && 'opacity-60')}>
                    <Building2 className="size-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">{m.society?.name}</span>
                      <span className="block truncate text-xs text-slate-500">{describe(m, t)}</span>
                    </span>
                    {current && <Check className="size-4 text-brand-600" />}
                    {pending && <span className="flex items-center gap-1 text-[11px] text-amber-600"><Clock className="size-3" />{t('Pending')}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => { setOpen(false); setAdding(true); }} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50">
            <Plus className="size-4" /> {t('Add another home')}
          </button>
        </div>
      )}
      {adding && <AddHomeModal onClose={() => setAdding(false)} />}
    </div>
  );
}
