import { Cake } from 'lucide-react';
import { Card } from '../../../components/ui';
import { useTodayBirthdays } from '../api';

// Dashboard: who in the society has a birthday today (only people who opted in). Hidden when nobody does.
export function TodayBirthdaysCard() {
  const { data } = useTodayBirthdays();
  if (!data?.enabled || !data.people.length) return null;
  return (
    <Card className="mb-4 flex items-start gap-3 border-pink-200 bg-pink-50/60 p-4">
      <Cake className="mt-0.5 size-5 shrink-0 text-pink-600" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">Today&apos;s birthdays</p>
        <p className="text-sm text-slate-700">{data.people.map((p) => `${p.name}${p.unit ? ` (${p.unit})` : ''}`).join(', ')}</p>
      </div>
    </Card>
  );
}
