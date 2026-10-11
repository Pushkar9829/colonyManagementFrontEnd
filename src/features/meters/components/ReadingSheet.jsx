import { useEffect, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { currentPeriod, date, label, todayISO } from '../../../lib/format';
import { useBlocks } from '../../units/api';
import { downloadFile } from '../../billing/download';
import { METER_TYPES, uomOf, useBulkReadings, useImportReadings, useReadingSheet } from '../api';

// Month-end reading round for one block: type the new readings in a grid and save them together.
export function ReadingSheet() {
  const toast = useToast();
  const { data: blocks } = useBlocks();
  const [filters, setFilters] = useState({ block: '', type: 'water', period: currentPeriod() });
  const [readAt, setReadAt] = useState(todayISO());
  const [values, setValues] = useState({});
  const [results, setResults] = useState({});
  const params = { block: filters.block || undefined, type: filters.type || undefined, period: filters.period };
  const { data: rows, isLoading } = useReadingSheet(params, Boolean(filters.period));
  const bulk = useBulkReadings({
    onSuccess: (r) => {
      setResults(Object.fromEntries(r.results.map((x) => [String(x.meter), x])));
      setValues((v) => Object.fromEntries(Object.entries(v).filter(([id]) => !r.results.find((x) => String(x.meter) === id && x.ok))));
    },
  });
  const imp = useImportReadings({ onSuccess: (r) => setResults(Object.fromEntries(r.results.filter((x) => x.meter).map((x) => [String(x.meter), x]))) });

  useEffect(() => {
    setValues({});
    setResults({});
  }, [filters.block, filters.type, filters.period]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const filled = Object.entries(values).filter(([, v]) => v !== '');
  const save = () =>
    bulk.mutate({ readAt: new Date(`${readAt}T12:00:00`).toISOString(), readings: filled.map(([meter, v]) => ({ meter, reading: Number(v) })) });
  const exportSheet = () => downloadFile('/meters/sheet.xlsx', params, `meter-readings-${filters.period}.xlsx`).catch((err) => toast.error(err));

  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4">
        <Select label="Block" placeholder="All blocks" value={filters.block} onChange={set('block')} options={(blocks || []).map((b) => ({ value: b._id, label: b.name }))} />
        <Select label="Type" placeholder="All types" value={filters.type} onChange={set('type')} options={METER_TYPES} />
        <Input label="Month" type="month" value={filters.period} onChange={set('period')} />
        <Input label="Read on" type="date" value={readAt} max={todayISO()} onChange={(e) => setReadAt(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Button size="sm" disabled={!filled.length} loading={bulk.isPending} onClick={save}>Save {filled.length || ''} readings</Button>
        <Button size="sm" variant="secondary" icon={FileSpreadsheet} onClick={exportSheet}>Download sheet</Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          <Upload className="size-3.5" /> {imp.isPending ? 'Importing…' : 'Import filled sheet'}
          <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) imp.mutate(f); e.target.value = ''; }} />
        </label>
        <span className="text-xs text-slate-500">Sheet columns: Serial, Reading, Read on (optional)</span>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !rows?.length ? (
        <EmptyState title="No active meters here" description="Add meters on the Meters tab first." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Meter</th><th className="px-4 py-3">Last reading</th><th className="px-4 py-3">This month</th><th className="px-4 py-3">New reading</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => {
                const id = String(r.meter._id);
                const v = values[id] ?? '';
                const low = v !== '' && Number(v) < r.lastReading;
                const res = results[id];
                return (
                  <tr key={id}>
                    <td className="px-4 py-2 font-medium text-slate-900">{r.unit?.label}</td>
                    <td className="px-4 py-2 text-slate-600">{r.meter.serial} · {label(r.meter.type)}</td>
                    <td className="whitespace-nowrap px-4 py-2">{r.lastReading} <span className="text-xs text-slate-400">{date(r.lastReadAt)}</span></td>
                    <td className="px-4 py-2">{r.periodReading ? r.periodReading.reading : '—'}</td>
                    <td className="px-4 py-2">
                      <input type="number" step="any" min={0} inputMode="decimal" value={v} onChange={(e) => setValues((x) => ({ ...x, [id]: e.target.value }))}
                        className={`h-9 w-32 rounded-lg border px-2 text-sm ${low ? 'border-red-400' : 'border-slate-300'}`} aria-label={`New reading for ${r.meter.serial}`} placeholder={uomOf(r.meter.type)} />
                    </td>
                    <td className="px-4 py-2">{res ? (res.ok ? <Badge tone="green">Saved</Badge> : <span className="text-xs text-red-600">{res.error}</span>) : low ? <span className="text-xs text-red-600">Below last reading</span> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
