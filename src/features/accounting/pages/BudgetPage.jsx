import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, Input, Select, Spinner, Tabs } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, money, toPaise, todayISO } from '../../../lib/format';
import { useAccounts, useBudget, useBudgetReport, useSaveBudget } from '../api';
import { fyLabel, fyOf, rupeesInput, varianceToDate } from '../lib';
import { DownloadButtons } from '../components/common';

// Amount and % share one colour: green when the account is doing better than planned so far.
const tone = (v) => (v.variance === 0 ? 'text-slate-500' : v.good ? 'text-emerald-700' : 'text-red-600');

function VarianceAmount({ row }) {
  const v = varianceToDate(row);
  if (!row.budgetToDate && !row.actual) return <span className="text-slate-400">—</span>;
  const word = v.variance === 0 ? 'on budget' : v.variance > 0 ? 'over' : 'under';
  return <span className={cn('tabular-nums font-medium', tone(v))}>{money(Math.abs(v.variance))} <span className="text-xs font-normal">{word}</span></span>;
}

function VarianceCell({ row }) {
  const v = varianceToDate(row);
  if (v.pct === null) return <span className="text-slate-400">—</span>;
  return <span className={cn('tabular-nums font-medium', tone(v))}>{v.pct > 0 ? '+' : ''}{v.pct}%</span>;
}

function Meter({ actual, budget, type }) {
  if (!budget) return null;
  const pct = Math.min(100, Math.round((actual / budget) * 100));
  const over = actual > budget;
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', over ? (type === 'income' ? 'bg-emerald-500' : 'bg-red-500') : 'bg-brand-500')} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Report({ fy }) {
  const { data, isLoading } = useBudgetReport(fy);
  if (isLoading || !data) return <div className="flex justify-center py-12"><Spinner /></div>;
  const section = (title, rows, totals) => (
    <>
      <tr className="bg-slate-50"><td colSpan={6} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</td></tr>
      {rows.map((r) => (
        <tr key={r.code}>
          <td className="px-4 py-2"><span className="font-mono text-xs text-slate-500">{r.code}</span> {r.name}<Meter actual={r.actual} budget={r.budget} type={r.type} /></td>
          <td className="px-4 py-2 text-right tabular-nums">{money(r.budget)}</td>
          <td className="px-4 py-2 text-right tabular-nums text-slate-500">{money(r.budgetToDate)}</td>
          <td className="px-4 py-2 text-right tabular-nums">{money(r.actual)}</td>
          <td className="px-4 py-2 text-right"><VarianceAmount row={r} /></td>
          <td className="px-4 py-2 text-right"><VarianceCell row={r} /></td>
        </tr>
      ))}
      {!rows.length && <tr><td colSpan={6} className="px-4 py-2 text-sm text-slate-400">No budget or activity</td></tr>}
      <tr className="font-semibold text-slate-900">
        <td className="px-4 py-2">Total {title.toLowerCase()}</td>
        <td className="px-4 py-2 text-right tabular-nums">{money(totals.budget)}</td>
        <td className="px-4 py-2 text-right tabular-nums">{money(totals.budgetToDate)}</td>
        <td className="px-4 py-2 text-right tabular-nums">{money(totals.actual)}</td>
        <td className="px-4 py-2 text-right"><VarianceAmount row={{ ...totals, type: title === 'Income' ? 'income' : 'expense' }} /></td>
        <td className="px-4 py-2 text-right"><VarianceCell row={{ ...totals, type: title === 'Income' ? 'income' : 'expense' }} /></td>
      </tr>
    </>
  );
  return (
    <Card>
      <CardHeader title={`Budget vs actual · ${fyLabel(fy)}`} subtitle={`Actuals to ${date(data.to)} · ${data.elapsedPct}% of the year gone, so "budget to date" is ${data.elapsedPct}% of the annual budget. Green = better than planned so far.`}
        action={<DownloadButtons path={`/accounting/budgets/${fy}/report`} query={{}} filename={`budget-vs-actual-${fy}`} />} />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2.5 text-left">Account</th><th className="px-4 py-2.5 text-right">Annual budget</th><th className="px-4 py-2.5 text-right">Budget to date</th><th className="px-4 py-2.5 text-right">Actual</th><th className="px-4 py-2.5 text-right">Under / over (to date)</th><th className="px-4 py-2.5 text-right">% (to date)</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {section('Income', data.income, data.totals.income)}
            {section('Expenditure', data.expenses, data.totals.expenses)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Editor({ fy, onSaved }) {
  const { data: accounts = [] } = useAccounts();
  const { data: budget, isLoading } = useBudget(fy);
  const [draft, setDraft] = useState(null);
  const save = useSaveBudget(fy, { onSuccess: () => { setDraft(null); onSaved(); } });
  if (isLoading || !budget) return <div className="flex justify-center py-12"><Spinner /></div>;
  const saved = Object.fromEntries(budget.lines.map((l) => [l.code, rupeesInput(l.amount)]));
  const values = draft || saved;
  const rows = accounts.filter((a) => ['income', 'expense'].includes(a.type) && (a.active || saved[a.code]));
  const total = (type) => rows.filter((a) => a.type === type).reduce((s, a) => s + toPaise(values[a.code]), 0);
  const changed = rows.filter((a) => (values[a.code] || '') !== (saved[a.code] || ''));
  const submit = () => save.mutate({ lines: changed.map((a) => ({ code: a.code, amount: toPaise(values[a.code]) })) });
  return (
    <Card>
      <CardHeader title={`Annual budget · ${fyLabel(fy)}`} subtitle={`Income ${money(total('income'))} · Expenditure ${money(total('expense'))} · ${total('income') - total('expense') >= 0 ? 'Surplus' : 'Deficit'} ${money(Math.abs(total('income') - total('expense')))}`}
        action={<Button icon={Save} disabled={!changed.length} loading={save.isPending} onClick={submit}>Save {changed.length ? `(${changed.length})` : ''}</Button>} />
      {['income', 'expense'].map((type) => (
        <div key={type}>
          <p className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{type === 'income' ? 'Income' : 'Expenditure'}</p>
          <div className="divide-y divide-slate-100">
            {rows.filter((a) => a.type === type).map((a) => (
              <div key={a.code} className="grid grid-cols-[1fr_9rem] items-center gap-3 px-4 py-2 sm:grid-cols-[1fr_12rem]">
                <p className="text-sm"><span className="font-mono text-xs text-slate-500">{a.code}</span> {a.name}</p>
                <Input type="number" min={0} step="1" placeholder="₹ per year" aria-label={`${a.name} budget`} value={values[a.code] || ''}
                  onChange={(e) => setDraft({ ...values, [a.code]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function BudgetPage() {
  const current = fyOf(todayISO());
  const [fy, setFy] = useState(current);
  const [tab, setTab] = useState('report');
  return (
    <div>
      <PageHeader title="Budget" description="Plan the year's income and expenses per account and track them against the books."
        actions={<Select aria-label="Financial year" value={String(fy)} onChange={(e) => setFy(Number(e.target.value))} options={[current - 1, current, current + 1].map((y) => ({ value: String(y), label: fyLabel(y) }))} />} />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'report', label: 'Budget vs actual' }, { value: 'edit', label: 'Set budget' }]} />
      {tab === 'report' ? <Report fy={fy} /> : <Editor key={fy} fy={fy} onSaved={() => setTab('report')} />}
    </div>
  );
}
