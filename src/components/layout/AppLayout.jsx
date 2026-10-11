import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Home, LogOut, Menu, UserCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navGroupsFor } from '../../app/navigation';
import { cn } from '../../lib/cn';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { RaiseSosButton } from '../../features/sos/components/RaiseSosButton';
import { RealtimeProvider, useRealtime } from '../../realtime/RealtimeProvider';
import { HomeSwitcher } from '../../features/homes/components/HomeSwitcher';
import { ErrorBoundary } from './ErrorBoundary';
import { useT } from '../../context/LanguageContext';
import { useFeatures } from '../../features/features/api';
import { PreferencesMenu } from './PreferencesMenu';

const OPEN_KEY = 'cms.navOpen';
const readOpen = () => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}');
  } catch {
    return {};
  }
};

function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const { t } = useT();
  const location = useLocation();
  const features = useFeatures();
  // Until the society's feature list loads, show everything the role may use (avoids a flash of an empty menu).
  const groups = navGroupsFor(user.role, user.society && features.data ? features.isEnabled : null);
  const [open, setOpen] = useState(readOpen);

  const isActiveGroup = (g) => g.items.some((i) => (i.end ? location.pathname === i.to : location.pathname === i.to || location.pathname.startsWith(`${i.to}/`)));
  const toggle = (section) =>
    setOpen((o) => {
      const next = { ...o, [section]: !(o[section] ?? true) };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <nav className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex h-16 items-center gap-2 px-5 text-lg font-semibold text-brand-700">
        <Home className="size-6" /> ColonyHub
      </Link>
      <HomeSwitcher onSwitched={onNavigate} />
      <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          // sections are open by default; the one holding the current page is always open
          const expanded = !group.section || isActiveGroup(group) || (open[group.section] ?? true);
          return (
            <div key={group.section || 'top'}>
              {group.section && (
                <button type="button" onClick={() => toggle(group.section)} aria-expanded={expanded}
                  className="mb-1 flex w-full items-center justify-between rounded px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                  {t(group.section)}
                  <ChevronDown className={cn('size-3.5 transition', !expanded && '-rotate-90')} />
                </button>
              )}
              {expanded && (
                <ul className="space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon, end }) => (
                    <li key={`${to}-${label}`}>
                      <NavLink
                        to={to}
                        end={end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                            isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                          )
                        }
                      >
                        <Icon className="size-4.5 shrink-0" />
                        {t(label)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function LiveDot() {
  const { connected } = useRealtime();
  return (
    <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex" title={connected ? 'Live updates on' : 'Reconnecting…'}>
      <span className={cn('size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-400')} />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
}

export function AppLayout() {
  const { user } = useAuth();
  // Keyed by membership so switching homes reconnects the socket with the new society's token.
  return (
    <RealtimeProvider key={user.membershipId || 'platform'} enabled={Boolean(user.society)}>
      <Shell />
    </RealtimeProvider>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { t } = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button type="button" onClick={closeMobile} className="absolute right-3 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close menu">
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={closeMobile} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          {user.society && (
            <>
              <LiveDot />
              {user.role !== 'guard' && <RaiseSosButton />}
              <NotificationBell />
            </>
          )}
          <PreferencesMenu />
          <Link to="/profile" className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100', location.pathname === '/profile' && 'bg-slate-100')}>
            <UserCircle className="size-6 text-slate-400" />
            <span className="hidden font-medium text-slate-700 sm:inline">{user.name}</span>
          </Link>
          <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label={t('Log out')} title={t('Log out')}>
            <LogOut className="size-5" />
          </button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

