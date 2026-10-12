import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Home, LogOut, Menu, UserCircle, WifiOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BOTTOM_BAR, navFor, navGroupsFor } from '../../app/navigation';
import { cn } from '../../lib/cn';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { RaiseSosButton } from '../../features/sos/components/RaiseSosButton';
import { RealtimeProvider, useRealtime } from '../../realtime/RealtimeProvider';
import { HomeSwitcher } from '../../features/homes/components/HomeSwitcher';
import { ErrorBoundary } from './ErrorBoundary';
import { useT } from '../../context/LanguageContext';
import { useFeatures } from '../../features/features/api';
import { PreferencesMenu } from './PreferencesMenu';
import { SearchButton } from '../../features/search/components/CommandPalette';

const OPEN_KEY = 'cms.navOpen';
const readOpen = () => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}');
  } catch {
    return {};
  }
};
const isActiveItem = (pathname, i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`));

function useNavItems() {
  const { user } = useAuth();
  const features = useFeatures();
  // Until the society's feature list loads, show everything the role may use (avoids a flash of an empty menu).
  return user.society && features.data ? features.isEnabled : null;
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const { t } = useT();
  const location = useLocation();
  const groups = navGroupsFor(user.role, useNavItems());
  const [open, setOpen] = useState(readOpen);
  const listRef = useRef(null);

  // Keep the current page in view in a long menu.
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [location.pathname]);

  const isActiveGroup = (g) => g.items.some((i) => isActiveItem(location.pathname, i));
  // Only the section holding the current page starts open (short role menus keep their groups open,
  // except "More"); the person's own choices are remembered.
  const shortMenu = groups.some((g) => g.section === 'More');
  const defaultOpen = (section) => (shortMenu ? section !== 'More' : false);
  const toggle = (section, expanded) =>
    setOpen((o) => {
      const next = { ...o, [section]: !expanded };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <nav className="flex h-full flex-col" aria-label={t('Menu')}>
      <Link to="/" onClick={onNavigate} className="flex h-16 items-center gap-2 px-5 text-lg font-semibold text-brand-700">
        <Home className="size-6" /> ColonyHub
      </Link>
      <HomeSwitcher onSwitched={onNavigate} />
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const expanded = !group.section || isActiveGroup(group) || (open[group.section] ?? defaultOpen(group.section));
          return (
            <div key={group.section || 'top'}>
              {group.section && (
                <button type="button" onClick={() => toggle(group.section, expanded)} aria-expanded={expanded}
                  className="mb-1 flex w-full items-center justify-between rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                  <span>
                    {t(group.section)}
                    {!expanded && <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">({group.items.length})</span>}
                  </span>
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
      {/* On phones logging out lives here, away from the profile icon in the header. */}
      {onNavigate && (
        <div className="flex items-center gap-2 border-t border-slate-100 p-3">
          <PreferencesMenu placement="up" className="sm:hidden" />
          <button type="button" onClick={logout} className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <LogOut className="size-4.5" /> {t('Log out')}
          </button>
        </div>
      )}
    </nav>
  );
}

// Phones: the role's four most used pages one tap away, plus the full menu.
function BottomBar({ onMenu }) {
  const { user } = useAuth();
  const { t } = useT();
  const location = useLocation();
  const items = navFor(user.role, useNavItems());
  const shortcuts = (BOTTOM_BAR[user.role] || []).map((p) => items.find((i) => i.to === p)).filter(Boolean);
  if (!shortcuts.length) return null;
  const short = (label) => (label === 'Dashboard' ? 'Home' : label);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label={t('Shortcuts')}>
      <ul className="grid grid-cols-5">
        {shortcuts.map((i) => {
          const Icon = i.icon;
          const active = isActiveItem(location.pathname, i);
          return (
            <li key={i.to}>
              <Link to={i.to} aria-current={active ? 'page' : undefined} className={cn('flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-tight', active ? 'text-brand-700' : 'text-slate-500')}>
                <Icon className="size-5" />
                <span className="line-clamp-1 text-center">{t(short(i.label))}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMenu} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
            <Menu className="size-5" />
            {t('Menu')}
          </button>
        </li>
      </ul>
    </nav>
  );
}

function LiveDot() {
  const { connected } = useRealtime();
  return (
    // phones: the offline banner below the header covers losing the connection, so the dot is desktop-only
    <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex" title={connected ? 'Live updates on' : 'Reconnecting…'}>
      <span className={cn('size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-400')} />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
}

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// The flat being shown, on phones (the switcher itself is in the menu).
function CurrentHome({ onOpen }) {
  const { user } = useAuth();
  const current = (user.memberships || []).find((m) => String(m._id) === String(user.membershipId));
  const unit = current?.unit?.label;
  if (!unit || (user.memberships || []).length < 2) return null;
  return (
    <button type="button" onClick={onOpen} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 sm:hidden">
      {unit} ▾
    </button>
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
  const online = useOnline();
  const closeMobile = () => setMobileOpen(false);
  const hasBottomBar = Boolean(user.society && BOTTOM_BAR[user.role]);

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
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button type="button" onClick={closeMobile} className="absolute right-3 top-4 rounded-md p-2 text-slate-400 hover:bg-slate-100" aria-label="Close menu">
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={closeMobile} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-1.5 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:gap-2 sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <CurrentHome onOpen={() => setMobileOpen(true)} />
          <div className="flex min-w-10 flex-1">
            <SearchButton />
          </div>
          {user.society && (
            <>
              <LiveDot />
              {user.role !== 'guard' && <RaiseSosButton />}
              <NotificationBell />
            </>
          )}
          <PreferencesMenu className="hidden sm:block" />
          <Link to="/profile" aria-label={t('My profile')} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100', location.pathname === '/profile' && 'bg-slate-100')}>
            <UserCircle className="size-6 text-slate-400" />
            <span className="hidden font-medium text-slate-700 sm:inline">{user.name}</span>
          </Link>
          <button type="button" onClick={logout} className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:inline-flex" aria-label={t('Log out')} title={t('Log out')}>
            <LogOut className="size-5" />
          </button>
        </header>
        {!online && (
          <div role="status" className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6">
            <WifiOff className="size-4 shrink-0" />
            {t("You're offline. Pages may be out of date and changes won't save until you're back online (the gate console keeps working offline).")}
          </div>
        )}
        <main className={cn('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8', hasBottomBar && 'pb-24 lg:pb-6')}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {hasBottomBar && <BottomBar onMenu={() => setMobileOpen(true)} />}
    </div>
  );
}
