import { Inbox, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { tr, useT } from '../../context/LanguageContext';

export function Spinner({ className }) {
  return <Loader2 className={cn('size-6 animate-spin text-brand-600', className)} />;
}

export function PageLoader() {
  const { t } = useT();
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
      <div className="flex items-center gap-2 pt-2 text-sm text-slate-500">
        <Spinner className="size-4" /> {t('Loading…')}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="size-6 text-slate-400" />
      </div>
      <p className="mt-3 font-medium text-slate-700">{tr(t, title)}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{tr(t, description)}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <AlertTriangle className="size-8 text-red-500" />
      <p className="mt-3 font-medium text-slate-700">{t('Could not load data')}</p>
      <p className="mt-1 text-sm text-slate-500">{error?.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
          {t('Try again')}
        </button>
      )}
    </div>
  );
}
