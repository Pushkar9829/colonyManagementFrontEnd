import { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Select, Spinner } from '../../../components/ui';
import { date as fmtDate, label, time, todayISO } from '../../../lib/format';
import { OB_CATEGORIES, useAddOccurrence, useOccurrenceBook } from '../api';
import { useT } from '../../../context/LanguageContext';

const CATEGORY_TONES = { incident: 'red', handover: 'blue', round: 'green', visitor: 'brand', vehicle: 'brand', key: 'amber', maintenance: 'amber' };

const shift = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};

export function BookTab() {
  const { t } = useT();
  const today = todayISO();
  const [day, setDay] = useState(today);
  const { data, isLoading, error, refetch } = useOccurrenceBook(day);
  const [category, setCategory] = useState('note');
  const [text, setText] = useState('');
  const add = useAddOccurrence({ onSuccess: () => setText('') });
  const submit = (e) => {
    e.preventDefault();
    if (text.trim().length >= 2) add.mutate({ category, text: text.trim() });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <Button variant="secondary" icon={ChevronLeft} onClick={() => setDay((d) => shift(d, -1))} aria-label={t('Previous day')} />
        <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label={t('Date')}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        <Button variant="secondary" icon={ChevronRight} disabled={day >= today} onClick={() => setDay((d) => shift(d, 1))} aria-label={t('Next day')} />
        {day !== today && <Button variant="ghost" onClick={() => setDay(today)}>Today</Button>}
        <span className="ml-auto text-sm text-slate-500">{fmtDate(`${day}T00:00:00`)}</span>
      </div>

      {/* Entries are logged at the current time, so the add form only belongs on today's page. */}
      {day === today && (
        <form onSubmit={submit} className="grid gap-2 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-[10rem_1fr_auto]">
          <Select aria-label="Category" options={OB_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} value={category} onChange={(e) => setCategory(e.target.value)} />
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t('Add an entry, e.g. Water tanker arrived at Gate 2')} aria-label={t('Entry')}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          <Button type="submit" icon={Plus} loading={add.isPending} disabled={text.trim().length < 2}>Add</Button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.entries?.length ? (
        <EmptyState icon={BookOpen} title="No entries for this day" description="Handovers and incidents are logged here automatically." />
      ) : (
        <ol className="divide-y divide-slate-100">
          {data.entries.map((e) => (
            <li key={e._id} className="flex gap-3 px-4 py-3 text-sm">
              <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-slate-500">{time(e.at)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={CATEGORY_TONES[e.category] || 'slate'}>{t(label(e.category))}</Badge>
                  <span className="text-xs text-slate-500">{e.by?.name || t('System')}</span>
                </div>
                <p className="mt-1 break-words text-slate-800">{e.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
