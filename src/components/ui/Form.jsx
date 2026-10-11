import { useId } from 'react';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100';

export function Field({ label, error, hint, htmlFor, required, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, error, hint, className, required, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={className}>
      <input id={id} required={required} className={cn(control, 'h-10', error ? 'border-red-400' : 'border-slate-300')} {...props} />
    </Field>
  );
}

export function Textarea({ label, error, hint, className, required, rows = 3, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={className}>
      <textarea id={id} rows={rows} required={required} className={cn(control, 'py-2', error ? 'border-red-400' : 'border-slate-300')} {...props} />
    </Field>
  );
}

// options: [{ value, label }] or strings
export function Select({ label, error, hint, className, options = [], placeholder, required, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={className}>
      <select id={id} required={required} className={cn(control, 'h-10 pr-8', error ? 'border-red-400' : 'border-slate-300')} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700', className)}>
      <input type="checkbox" className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" {...props} />
      {label}
    </label>
  );
}
