import { useId } from 'react';
import { cn } from '../../lib/cn';
import { longDate } from '../../lib/format';
import { tr, useT } from '../../context/LanguageContext';
import { translateText } from '../../lib/errorText';

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100';

export function Field({ label, error, hint, htmlFor, required, className, children }) {
  const { t } = useT();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {tr(t, label)}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-red-600">{translateText(error, t)}</p> : hint ? <p className="text-xs text-slate-500">{tr(t, hint)}</p> : null}
    </div>
  );
}

export function Input({ label, error, hint, className, required, placeholder, 'aria-label': ariaLabel, ...props }) {
  const id = useId();
  const { t } = useT();
  placeholder = tr(t, placeholder);
  const dateHint = props.type === 'date' && !hint ? longDate(props.value) : '';
  return (
    <Field label={label} error={error} hint={hint || dateHint || undefined} htmlFor={id} required={required} className={className}>
      <input id={id} required={required} placeholder={placeholder} aria-label={label ? undefined : tr(t, ariaLabel) || placeholder || tr(t, props.title)} className={cn(control, 'h-10', error ? 'border-red-400' : 'border-slate-300')} {...props} />
    </Field>
  );
}

export function Textarea({ label, error, hint, className, required, rows = 3, placeholder, ...props }) {
  const id = useId();
  const { t } = useT();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={className}>
      <textarea id={id} rows={rows} required={required} placeholder={tr(t, placeholder)} className={cn(control, 'py-2', error ? 'border-red-400' : 'border-slate-300')} {...props} />
    </Field>
  );
}

// options: [{ value, label }] or strings
export function Select({ label, error, hint, className, options = [], placeholder, required, 'aria-label': ariaLabel, ...props }) {
  const id = useId();
  const { t } = useT();
  placeholder = tr(t, placeholder);
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={className}>
      <select id={id} required={required} aria-label={label ? undefined : tr(t, ariaLabel) || placeholder || tr(t, props.title)} className={cn(control, 'h-10 pr-8', error ? 'border-red-400' : 'border-slate-300')} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {tr(t, opt.label)}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Checkbox({ label, className, ...props }) {
  const { t } = useT();
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700', className)}>
      <input type="checkbox" className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" {...props} />
      {tr(t, label)}
    </label>
  );
}
