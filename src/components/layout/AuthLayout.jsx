import { Outlet } from 'react-router-dom';
import { Home, ShieldCheck, Receipt, Wrench } from 'lucide-react';
import { PreferencesMenu } from './PreferencesMenu';
import { useT } from '../../context/LanguageContext';
import { useTemplate } from '../../context/TemplateContext';
import { appNameOf } from '../../features/whitelabel/brand';
import { coverStyle } from '../../lib/template';
import { cn } from '../../lib/cn';

const points = [
  { icon: ShieldCheck, text: 'Visitor approvals, guest passes and daily-help tracking at the gate' },
  { icon: Receipt, text: 'Maintenance bills, online payments and instant receipts' },
  { icon: Wrench, text: 'Helpdesk with SLAs, notices, polls and amenity booking' },
];

function Mark({ name, logo, className }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      {logo ? <img src={logo} alt="" className="size-8 shrink-0 rounded-lg bg-white object-contain p-0.5" /> : <Home className="size-6 shrink-0" aria-hidden />}
      <span className="truncate">{name}</span>
    </span>
  );
}

// Login, register, join and password pages. The look follows the app template (login layout):
// split-photo (the classic two-panel page), centered-card, full-cover or minimal. A colony reached through its
// link (?society=CODE) shows its name, logo and cover photo; a generated cover is used when it has none.
export function AuthLayout() {
  const { t } = useT();
  const { template, appearance } = useTemplate();
  const society = appearance?.society || null;
  const brand = appearance?.brand;
  const name = society?.name || appNameOf(brand);
  const logo = society?.logoUrl || (brand?.reseller ? brand.logoUrl : null) || null;
  const cover = society?.coverUrl || null;
  const headline = society ? t('Welcome to {name}', { name: society.name }) : t('Run your society from one place.');
  const tagline = t('For residents, committees, guards and facility teams.');
  const layout = template.login || 'split-photo';

  if (layout === 'centered-card') {
    return (
      <div className="relative flex min-h-screen flex-col items-center bg-brand-50 px-4 pb-10 pt-16 sm:justify-center sm:pt-10" data-login-layout="centered-card">
        <div className="tpl-cover absolute inset-x-0 top-0 h-60 sm:h-72" style={coverStyle(cover)} aria-hidden />
        <div className="tpl-on-dark absolute right-4 top-4"><PreferencesMenu /></div>
        <div className="relative w-full max-w-md">
          <div className="mb-5 flex flex-col items-center gap-1 text-center text-white">
            <Mark name={name} logo={logo} className="text-xl font-semibold drop-shadow-sm" />
            <p className="text-sm text-white/85">{headline}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <Outlet />
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">{tagline}</p>
        </div>
      </div>
    );
  }

  if (layout === 'full-cover') {
    return (
      <div className="tpl-cover relative flex min-h-screen items-center justify-center px-4 py-16 lg:justify-end lg:px-16" style={coverStyle(cover)} data-login-layout="full-cover">
        <div className="tpl-on-dark absolute right-4 top-4"><PreferencesMenu /></div>
        <div className="absolute inset-x-6 top-5 text-white lg:inset-x-auto lg:bottom-16 lg:left-16 lg:top-auto lg:max-w-md">
          <Mark name={name} logo={logo} className="text-lg font-semibold drop-shadow-sm lg:text-2xl" />
          <h2 className="mt-4 hidden text-3xl font-semibold leading-tight drop-shadow lg:block">{headline}</h2>
          <p className="mt-2 hidden text-white/85 lg:block">{tagline}</p>
        </div>
        <div className="relative mt-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8 lg:mt-0">
          <Outlet />
        </div>
      </div>
    );
  }

  if (layout === 'minimal') {
    return (
      <div className="flex min-h-screen flex-col bg-white" data-login-layout="minimal">
        <div className="h-1.5 bg-brand-600" aria-hidden />
        <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Mark name={name} logo={logo} className="text-lg font-semibold text-brand-700" />
          <PreferencesMenu />
        </header>
        <main className="flex flex-1 justify-center px-4 pb-12 pt-6 sm:items-center sm:pt-0">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>
        <footer className="px-4 pb-6 text-center text-xs text-slate-400">{tagline}</footer>
      </div>
    );
  }

  // split-photo: Classic Blue's page — the brand panel (or the colony's cover photo) beside the form.
  return (
    <div className="flex min-h-screen flex-col lg:flex-row" data-login-layout="split-photo">
      <aside className="dark-keep tpl-cover hidden w-[42%] flex-col justify-between p-12 text-white lg:flex" style={coverStyle(cover)}>
        <Mark name={name} logo={logo} className="text-lg font-semibold" />
        <div>
          <h2 className="text-3xl font-semibold leading-tight">{headline}</h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-white/90">
                <Icon className="mt-0.5 size-5 shrink-0" />
                <span>{t(text)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/80">{tagline}</p>
      </aside>
      {/* phones: the colony's photo as a strip above the form, when it has one */}
      {cover && (
        <div className="tpl-cover flex h-36 items-end p-5 text-white lg:hidden" style={coverStyle(cover)}>
          <Mark name={name} logo={logo} className="text-lg font-semibold drop-shadow-sm" />
        </div>
      )}
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4"><PreferencesMenu /></div>
        <div className="w-full max-w-md">
          {!cover && <Mark name={name} logo={logo} className="mb-8 text-lg font-semibold text-brand-700 lg:hidden" />}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
