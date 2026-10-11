import { Inbox, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className }) {
  return <Loader2 className={cn('size-6 animate-spin text-brand-600', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="size-6 text-slate-400" />
      </div>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <AlertTriangle className="size-8 text-red-500" />
      <p className="mt-3 font-medium text-slate-700">Could not load data</p>
      <p className="mt-1 text-sm text-slate-500">{error?.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
