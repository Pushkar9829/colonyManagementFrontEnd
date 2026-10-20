import { Field } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useGates } from '../api';
import { useT } from '../../../context/LanguageContext';

const chip = (on) =>
  cn('min-h-9 rounded-full border px-3 py-1.5 text-sm font-medium transition', on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50');

// Pick the gates something is valid at. value: gate ids; [] means "Any gate".
// Hidden when the society has a single gate (there is nothing to choose).
export function GateMultiSelect({ label = 'Valid at', value = [], onChange, hint, anyLabel = 'Any gate' }) {
  const { data: gates = [] } = useGates();
  const { t } = useT();
  if (gates.length < 2) return null;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Field label={label} hint={hint || (value.length ? `Refused at other gates` : 'Accepted at every gate')}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t(label)}>
        <button type="button" aria-pressed={!value.length} onClick={() => onChange([])} className={chip(!value.length)}>
          {t(anyLabel)}
        </button>
        {gates.map((g) => (
          <button key={g._id} type="button" aria-pressed={value.includes(g._id)} onClick={() => toggle(g._id)} className={chip(value.includes(g._id))}>
            {g.name}
          </button>
        ))}
      </div>
    </Field>
  );
}
