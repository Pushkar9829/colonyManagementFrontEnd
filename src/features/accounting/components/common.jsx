import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { money } from '../../../lib/format';
import { useAccounts, useDownload } from '../api';
import { ACCOUNT_TYPES, rangePresets } from '../lib';

// Account dropdown grouped by type. `types` limits the choice (e.g. ['expense']).
export function AccountSelect({ value, onChange, types, label, placeholder = 'Select account', includeInactive = false, error, className, required, bankOnly = false }) {
  const { data: accounts = [] } = useAccounts();
  const options = accounts
    .filter((a) => (includeInactive || a.active) && (!types || types.includes(a.type)) && (!bankOnly || a.isBank || a.isCash))
    .map((a) => ({ value: a.code, label: `${a.code} · ${a.name}${a.active ? '' : ' (inactive)'}`, type: a.type }));
  const grouped = ACCOUNT_TYPES.filter((t) => options.some((o) => o.type === t.value));
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <span className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <select
        aria-label={label || placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn('block h-10 w-full rounded-lg border bg-white px-3 pr-8 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20', error ? 'border-red-400' : 'border-slate-300')}
      >
        <option value="">{placeholder}</option>
        {grouped.map((t) => (
          <optgroup key={t.value} label={t.label}>
            {options.filter((o) => o.type === t.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// From/to date inputs with quick presets (this FY, this month, ...).
export function DateRange({ value, onChange, className }) {
  const presets = rangePresets();
  const active = presets.find((p) => p.from === value.from && p.to === value.to)?.key || '';
  return (
    <div className={cn('grid gap-3 sm:grid-cols-[1fr_1fr_1fr]', className)}>
      <Select aria-label="Period" placeholder="Custom range" value={active} onChange={(e) => { const p = presets.find((x) => x.key === e.target.value); if (p) onChange({ from: p.from, to: p.to }); }}
        options={presets.map((p) => ({ value: p.key, label: p.label }))} />
      <Input type="date" aria-label="From" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      <Input type="date" aria-label="To" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </div>
  );
}

// Excel + PDF download buttons for a report endpoint (adds ?format=).
export function DownloadButtons({ path, query, filename, formats = ['xlsx', 'pdf'] }) {
  const dl = useDownload();
  const busy = (f) => dl.isPending && dl.variables?.query?.format === f;
  return (
    <div className="flex flex-wrap gap-2">
      {formats.includes('xlsx') && (
        <Button size="sm" variant="secondary" icon={FileSpreadsheet} loading={busy('xlsx')} onClick={() => dl.mutate({ path, query: { ...query, format: 'xlsx' }, filename: `${filename}.xlsx` })}>
          Excel
        </Button>
      )}
      {formats.includes('pdf') && (
        <Button size="sm" variant="secondary" icon={FileText} loading={busy('pdf')} onClick={() => dl.mutate({ path, query: { ...query, format: 'pdf' }, filename: `${filename}.pdf` })}>
          PDF
        </Button>
      )}
    </div>
  );
}

// Signed money: negatives in red with a minus, zero muted.
export function Amount({ value, className, strong }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  return (
    <span className={cn('tabular-nums', value < 0 && 'text-red-600', value === 0 && 'text-slate-400', strong && 'font-semibold text-slate-900', className)}>
      {value < 0 ? `−${money(-value)}` : money(value)}
    </span>
  );
}

// Dr/Cr cell that hides zeroes, as accountants expect.
export const DrCr = ({ value }) => (value ? <span className="tabular-nums">{money(value)}</span> : <span className="text-slate-300">—</span>);
