import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Circle, Rocket } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { cn } from '../../../lib/cn';
import { useDismissSetup, useSetupStatus } from '../api';

// Shown to society admins until every step is done or they hide it.
export function SetupChecklist() {
  const { t } = useT();
  const { data } = useSetupStatus();
  const dismiss = useDismissSetup();
  if (!data || data.dismissedAt || data.done >= data.total) return null;
  const pct = Math.round((data.done / data.total) * 100);

  return (
    <Card className="mb-6" role="region" aria-labelledby="setup-checklist-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-lg bg-brand-50 p-2 text-brand-600"><Rocket className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h3 id="setup-checklist-title" className="font-semibold text-slate-900">{t('Finish setting up your society')}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{t('{done} of {total} steps done', { done: data.done, total: data.total })}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => dismiss.mutate()} loading={dismiss.isPending}>{t('Hide checklist')}</Button>
      </div>
      <div className="px-5 pt-4">
        <div className="h-2 rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={data.done} aria-label={t('Setup progress')}>
          <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="grid gap-1 p-3 sm:grid-cols-2">
        {data.steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.link}
              className={cn('flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50', step.done ? 'text-slate-400' : 'text-slate-700')}
            >
              {step.done ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-hidden="true" /> : <Circle className="size-5 shrink-0 text-slate-300" aria-hidden="true" />}
              <span className={cn('flex-1', step.done && 'line-through')}>{t(step.title)}</span>
              <span className="sr-only">{step.done ? t('Done') : t('To do')}</span>
              {!step.done && <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
