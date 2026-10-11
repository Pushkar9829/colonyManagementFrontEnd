import { Outlet } from 'react-router-dom';
import { Home, ShieldCheck, Receipt, Wrench } from 'lucide-react';
import { PreferencesMenu } from './PreferencesMenu';

const points = [
  { icon: ShieldCheck, text: 'Visitor approvals, guest passes and daily-help tracking at the gate' },
  { icon: Receipt, text: 'Maintenance bills, online payments and instant receipts' },
  { icon: Wrench, text: 'Helpdesk with SLAs, notices, polls and amenity booking' },
];

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="dark-keep hidden w-[42%] flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-500 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Home className="size-6" /> ColonyHub
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Run your society from one place.</h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-brand-50">
                <Icon className="mt-0.5 size-5 shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-100">For residents, committees, guards and facility teams.</p>
      </aside>
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <PreferencesMenu className="absolute right-4 top-4" />
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-brand-700 lg:hidden">
            <Home className="size-6" /> ColonyHub
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
