import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Card, StatCard } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { coverStyle } from '../../../lib/template';
import { tr, useT } from '../../../context/LanguageContext';

// The four home-screen layouts of the colony app templates (resident, guard and staff dashboards).
// Every layout gets the same pieces from the dashboard — alerts, numbers, quick actions, extra cards —
// and only arranges them differently:
//   cards — the classic grid of number cards and action buttons
//   tiles — big icon tiles that are easy to tap
//   list  — compact rows, like a phone settings screen
//   hero  — a big cover banner (the colony's photo) with a greeting and round quick actions

// AppLayout provides a slot above the page when the header floats over the cover ("transparent-on-cover").
export const CoverSlotContext = createContext(null);

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
  sky: 'bg-sky-50 text-sky-600',
};

// Quick-action icon: a filled circle or an outlined square (the template's icon style).
export function ActionIcon({ icon: Icon, shape = 'circle', size = 'md', onCover }) {
  const box = size === 'lg' ? 'size-14' : 'size-11';
  const glyph = size === 'lg' ? 'size-7' : 'size-5';
  if (shape === 'square') {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-xl border-2', box, onCover ? 'border-white/80 bg-white/10 text-white' : 'border-brand-600 bg-white text-brand-700')}>
        <Icon className={glyph} aria-hidden />
      </span>
    );
  }
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full', box, onCover ? 'bg-white text-brand-700' : 'bg-brand-600 text-white')}>
      <Icon className={glyph} aria-hidden />
    </span>
  );
}

// The original large action button (cards layout).
export function BigAction({ to, icon: Icon, children, primary, className }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-16 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-center font-semibold shadow-sm transition',
        primary ? 'tpl-btn-primary bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
        className,
      )}
    >
      <Icon className="size-6 shrink-0" />
      <span>{children}</span>
    </Link>
  );
}

function Stats({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (s.node ? <div key={s.key}>{s.node}</div> : <StatCard key={s.key} icon={s.icon} tone={s.tone} label={s.label} value={s.value} sub={s.sub} to={s.to} />))}
    </div>
  );
}

function CardsLayout({ alerts, stats, actions, extras, actionsFirst, bigActions }) {
  const actionGrid = actions.length > 0 && (
    <div className={cn('grid gap-3', bigActions ? 'sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4')}>
      {actions.map((a) => (
        <BigAction key={a.to} to={a.to} icon={a.icon} primary={a.primary} className={bigActions ? 'text-lg' : 'flex-col text-sm sm:flex-row sm:text-base'}>
          {a.label}
        </BigAction>
      ))}
    </div>
  );
  return (
    <div className="space-y-6">
      {alerts}
      {actionsFirst && actionGrid}
      {stats.length > 0 && <Stats stats={stats} />}
      {!actionsFirst && actionGrid}
      {extras}
    </div>
  );
}

function TilesLayout({ alerts, stats, actions, extras, icons }) {
  const { t } = useT();
  return (
    <div className="space-y-6">
      {alerts}
      {actions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {actions.map((a) => (
            <Link key={a.to} to={a.to} className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-brand-300 hover:shadow">
              <ActionIcon icon={a.icon} shape={icons} size="lg" />
              <span className="text-sm font-semibold leading-tight text-slate-800 sm:text-base">{tr(t, a.label)}</span>
            </Link>
          ))}
        </div>
      )}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            const body = (
              <div className="flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={cn('flex size-10 items-center justify-center rounded-xl', TONES[s.tone] || TONES.brand)}>{Icon && <Icon className="size-5" aria-hidden />}</span>
                <span className="text-2xl font-bold text-slate-900">{s.value}</span>
                <span className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-slate-500">{tr(t, s.label)}</span>
                {s.sub && <span className="line-clamp-2 text-xs text-slate-500">{tr(t, s.sub)}</span>}
              </div>
            );
            return s.to ? <Link key={s.key} to={s.to} className="block">{body}</Link> : <div key={s.key}>{body}</div>;
          })}
        </div>
      )}
      {extras}
    </div>
  );
}

function Row({ to, icon, tone, label, sub, value, icons }) {
  const { t } = useT();
  const Icon = icon;
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
      {tone ? (
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone] || TONES.brand)}><Icon className="size-4.5" aria-hidden /></span>
      ) : (
        <ActionIcon icon={icon} shape={icons} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800">{tr(t, label)}</span>
        {sub && <span className="block truncate text-xs text-slate-500">{tr(t, sub)}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 text-base font-semibold text-slate-900">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
    </Link>
  );
}

function ListLayout({ alerts, stats, actions, extras, icons }) {
  const { t } = useT();
  return (
    <div className="space-y-6">
      {alerts}
      <div className="grid gap-6 lg:grid-cols-2">
        {actions.length > 0 && (
          <Card className="overflow-hidden">
            <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Quick actions')}</h2>
            <div className="divide-y divide-slate-100">
              {actions.map((a) => <Row key={a.to} to={a.to} icon={a.icon} label={a.label} icons={icons} />)}
            </div>
          </Card>
        )}
        {stats.length > 0 && (
          <Card className="overflow-hidden">
            <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('At a glance')}</h2>
            <div className="divide-y divide-slate-100">
              {stats.map((s) => <Row key={s.key} to={s.to || '/'} icon={s.icon} tone={s.tone || 'brand'} label={s.label} sub={s.sub} value={s.value} />)}
            </div>
          </Card>
        )}
      </div>
      {extras}
    </div>
  );
}

function HeroBanner({ greeting, description, society, logoUrl, coverUrl, actions, icons, overlay }) {
  const { t } = useT();
  return (
    <section
      className={cn('tpl-cover relative overflow-hidden text-white', overlay ? 'px-4 pb-6 pt-20 sm:px-6 lg:px-8' : 'rounded-2xl px-5 pb-5 pt-6 shadow-sm sm:px-8 sm:pt-8')}
      style={coverStyle(coverUrl)}
    >
      <div className={cn(overlay && 'mx-auto max-w-7xl')}>
        <div className="flex items-center gap-2 text-sm font-medium text-white/90">
          {logoUrl ? <img src={logoUrl} alt="" className="size-8 rounded-lg bg-white object-contain p-0.5" /> : <Home className="size-5" aria-hidden />}
          <span className="truncate">{society}</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold leading-tight drop-shadow-sm sm:text-3xl">{greeting}</h1>
        {description && <p className="mt-1 text-sm text-white/85 sm:text-base">{description}</p>}
        {actions.length > 0 && (
          <div className="mt-6 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-5">
            {actions.map((a) => (
              <Link key={a.to} to={a.to} className="group flex flex-col items-center gap-1.5 rounded-xl p-1 text-center sm:w-24">
                <span className="transition group-hover:scale-105"><ActionIcon icon={a.icon} shape={icons} onCover /></span>
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white sm:text-xs">{tr(t, a.label)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HeroLayout({ alerts, stats, actions, extras, icons, hero }) {
  const slot = useContext(CoverSlotContext);
  const banner = <HeroBanner {...hero} actions={actions} icons={icons} overlay={Boolean(slot)} />;
  return (
    <div className="space-y-6">
      {slot ? createPortal(banner, slot) : banner}
      {alerts}
      {stats.length > 0 && <Stats stats={stats} />}
      {extras}
    </div>
  );
}

// layout: 'cards' | 'tiles' | 'list' | 'hero'; icons: 'circle' | 'square'.
// stats: [{ key, icon, tone, label, value, sub, to, node? }] (node: a custom card for the cards layout)
// actions: [{ to, icon, label, primary }]
// hero: { greeting, description, society, logoUrl, coverUrl }
export function HomeView({ layout = 'cards', ...props }) {
  if (layout === 'tiles') return <TilesLayout {...props} />;
  if (layout === 'list') return <ListLayout {...props} />;
  if (layout === 'hero') return <HeroLayout {...props} />;
  return <CardsLayout {...props} />;
}
