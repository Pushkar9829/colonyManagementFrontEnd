import { useEffect, useId, useRef, useState } from 'react';
import { Field } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useUnits } from '../api';

// Type-ahead unit search ("A-1" -> A-101, A-102 ...). Works for societies with thousands of units.
export function UnitPicker({ label = 'Unit', value, onChange, error, required, autoFocus, initialLabel = '' }) {
  const id = useId();
  const [text, setText] = useState(value ? initialLabel : '');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (!value) setText('');
  }, [value]);

  useEffect(() => {
    const onClick = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { data, isFetching } = useUnits({ search: debounced || undefined, limit: 20 }, { enabled: open });
  const options = data?.data || [];

  const pick = (u) => {
    onChange(u._id, u);
    setText(u.label);
    setOpen(false);
  };

  return (
    <Field label={label} error={error} htmlFor={id} required={required}>
      <div className="relative" ref={wrapRef}>
        <input
          id={id}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Search unit e.g. A-101"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (value) onChange('', null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && open && options[0]) {
              e.preventDefault();
              pick(options[0]);
            }
          }}
          className={cn(
            'block h-10 w-full rounded-lg border bg-white px-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            error ? 'border-red-400' : 'border-slate-300',
          )}
        />
        {open && (
          <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {!options.length && <li className="px-3 py-2 text-sm text-slate-500">{isFetching ? 'Searching…' : 'No units found'}</li>}
            {options.map((u) => (
              <li key={u._id}>
                <button type="button" onClick={() => pick(u)} className={cn('w-full px-3 py-2 text-left text-sm hover:bg-slate-50', u._id === value && 'bg-brand-50 text-brand-700')}>
                  {u.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}
