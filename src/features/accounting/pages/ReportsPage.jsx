import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, FileCode2, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, ErrorState, Input, Select, Spinner, Tabs } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useT } from '../../../context/LanguageContext';
import { date, money, todayISO } from '../../../lib/format';
import { useAccounts, useDownload, useReport } from '../api';
import { defaultRange } from '../lib';
import { Amount, DateRange, DownloadButtons, DrCr } from '../components/common';

const REPORTS = [
  { value: 'trial-balance', label: 'Trial balance' },
  { value: 'income-expenditure', label: 'Income & expenditure' },
  { value: 'balance-sheet', label: 'Balance sheet' },
  { value: 'funds', label: 'Funds' },
  { value: 'cash-bank-book', label: 'Cash & bank book' },
  { value: 'exports', label: 'Tally & exports' },
];

const th = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
const td = 'px-4 py-2 text-slate-700';
const num = 'px-4 py-2 text-right tabular-nums';

function Frame({ title, subtitle, actions, children, loading, error, refetch }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={actions} />
      {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <div className="flex justify-center py-12"><Spinner /></div> : <div className="overflow-x-auto">{children}</div>}
    </Card>
  );
}

function BalancedBadge({ ok }) {
  const { t } = useT();
  return ok ? <Badge tone="green"><CheckCircle2 className="mr-1 size-3" />{t('Balanced')}</Badge> : <Badge tone="red"><AlertTriangle className="mr-1 size-3" />{t('Out of balance')}</Badge>;
}

function TrialBalance({ range }) {
  const { t } = useT();
  const q = useReport('trial-balance', range);
  const d = q.data;
  return (
    <Frame title="Trial balance" subtitle={d && <span className="flex items-center gap-2">{date(range.from)} – {date(range.to)} <BalancedBadge ok={d.balanced} /></span>}
      actions={<DownloadButtons path="/accounting/reports/trial-balance" query={range} filename={`trial-balance-${range.to}`} />} loading={q.isLoading} error={q.error} refetch={q.refetch}>
      {d && (
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr><th className={th}>{t('Account')}</th><th className={cn(th, 'text-right')}>{t('Opening Dr')}</th><th className={cn(th, 'text-right')}>{t('Opening Cr')}</th><th className={cn(th, 'text-right')}>{t('Debit')}</th><th className={cn(th, 'text-right')}>{t('Credit')}</th><th className={cn(th, 'text-right')}>{t('Closing Dr')}</th><th className={cn(th, 'text-right')}>{t('Closing Cr')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {d.rows.map((r) => (
              <tr key={r.code}>
                <td className={td}><span className="font-mono text-xs text-slate-500">{r.code}</span> {r.name}</td>
                {['openingDebit', 'openingCredit', 'debit', 'credit', 'closingDebit', 'closingCredit'].map((k) => <td key={k} className={num}><DrCr value={r[k]} /></td>)}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className={td}>{t('Total')}</td>
              {['openingDebit', 'openingCredit', 'debit', 'credit', 'closingDebit', 'closingCredit'].map((k) => <td key={k} className={num}>{money(d.totals[k])}</td>)}
            </tr>
          </tbody>
        </table>
      )}
      {d && !d.rows.length && <p className="px-4 py-8 text-center text-sm text-slate-500">{t('No entries in this period.')}</p>}
    </Frame>
  );
}

function SectionRows({ title, rows, total, totalLabel }) {
  const { t } = useT();
  return (
    <>
      <tr className="bg-slate-50"><td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t(title)}</td></tr>
      {rows.map((r) => (
        <tr key={r.code}><td className={td}><span className="font-mono text-xs text-slate-500">{r.code}</span> {r.name}</td><td className={num}><Amount value={r.amount} /></td></tr>
      ))}
      {!rows.length && <tr><td colSpan={2} className="px-4 py-2 text-sm text-slate-400">{t('Nothing recorded')}</td></tr>}
      {totalLabel && <tr className="font-semibold text-slate-900"><td className={td}>{t(totalLabel)}</td><td className={num}><Amount value={total} strong /></td></tr>}
    </>
  );
}

function IncomeExpenditure({ range }) {
  const { t } = useT();
  const q = useReport('income-expenditure', range);
  const d = q.data;
  return (
    <Frame title="Income & expenditure" subtitle={`${date(range.from)} – ${date(range.to)}`} loading={q.isLoading} error={q.error} refetch={q.refetch}
      actions={<DownloadButtons path="/accounting/reports/income-expenditure" query={range} filename={`income-expenditure-${range.to}`} />}>
      {d && (
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <tbody className="divide-y divide-slate-100">
            <SectionRows title="Income" rows={d.income} total={d.totalIncome} totalLabel="Total income" />
            <SectionRows title="Expenditure" rows={d.expenses} total={d.totalExpenses} totalLabel="Total expenditure" />
            <tr className={cn('text-base font-semibold', d.surplus >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
              <td className="px-4 py-3">{d.surplus >= 0 ? t('Surplus (income over expenditure)') : t('Deficit (expenditure over income)')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{money(Math.abs(d.surplus))}</td>
            </tr>
          </tbody>
        </table>
      )}
    </Frame>
  );
}

function BalanceSheet() {
  const { t } = useT();
  const [asOf, setAsOf] = useState(todayISO());
  const q = useReport('balance-sheet', { asOf });
  const d = q.data;
  return (
    <Frame title="Balance sheet" subtitle={d && <span className="flex items-center gap-2">{t('As of {date}', { date: date(asOf) })} <BalancedBadge ok={d.balanced} /></span>} loading={q.isLoading} error={q.error} refetch={q.refetch}
      actions={<div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-slate-700">{t('As of')}</span><Input type="date" aria-label={t('As of')} value={asOf} onChange={(e) => setAsOf(e.target.value)} /><DownloadButtons path="/accounting/reports/balance-sheet" query={{ asOf }} filename={`balance-sheet-${asOf}`} /></div>}>
      {d && (
        <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <SectionRows title="Funds & reserves" rows={[...d.funds, { code: '—', name: t('Accumulated surplus'), amount: d.surplus }]} total={d.totalFunds} totalLabel="Total funds" />
              <SectionRows title="Liabilities" rows={d.liabilities} total={d.totalLiabilities} totalLabel="Total liabilities" />
              <tr className="bg-slate-100 font-semibold text-slate-900"><td className={td}>{t('Funds & liabilities')}</td><td className={num}>{money(d.totalFunds + d.totalLiabilities)}</td></tr>
            </tbody>
          </table>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <SectionRows title="Assets" rows={d.assets} total={d.totalAssets} totalLabel="Total assets" />
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}

function Funds({ range }) {
  const { t } = useT();
  const q = useReport('funds', range);
  const d = q.data;
  return (
    <Frame title="Fund balances" subtitle="General, sinking and repair funds (and their sub-funds)" loading={q.isLoading} error={q.error} refetch={q.refetch}
      actions={<DownloadButtons path="/accounting/reports/funds" query={range} filename={`funds-${range.to}`} />}>
      {d && (
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr><th className={th}>{t('Fund')}</th><th className={cn(th, 'text-right')}>{t('Opening')}</th><th className={cn(th, 'text-right')}>{t('Additions')}</th><th className={cn(th, 'text-right')}>{t('Utilised')}</th><th className={cn(th, 'text-right')}>{t('Closing')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {d.rows.map((r) => (
              <tr key={r.code}>
                <td className={td}><span className="font-mono text-xs text-slate-500">{r.code}</span> {r.name}</td>
                <td className={num}><Amount value={r.opening} /></td><td className={num}><DrCr value={r.additions} /></td><td className={num}><DrCr value={r.utilised} /></td><td className={num}><Amount value={r.closing} strong /></td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold"><td className={td}>{t('Total')}</td><td className={num}>{money(d.totals.opening)}</td><td className={num}>{money(d.totals.additions)}</td><td className={num}>{money(d.totals.utilised)}</td><td className={num}>{money(d.totals.closing)}</td></tr>
          </tbody>
        </table>
      )}
    </Frame>
  );
}

function CashBankBook({ range }) {
  const { t } = useT();
  const { data: accounts = [] } = useAccounts();
  const [code, setCode] = useState('');
  const q = useReport('cash-bank-book', { ...range, code: code || undefined });
  const query = { ...range, code: code || undefined };
  return (
    <Frame title="Cash & bank book" subtitle="Receipts and payments with running balance" loading={q.isLoading} error={q.error} refetch={q.refetch}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label={t('Book')} placeholder="All cash & bank accounts" value={code} onChange={(e) => setCode(e.target.value)}
            options={accounts.filter((a) => a.isBank || a.isCash).map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))} />
          <DownloadButtons path="/accounting/reports/cash-bank-book" query={query} filename={`cash-bank-book-${range.to}`} />
        </div>
      )}>
      {q.data?.books.map((b) => (
        <div key={b.account.code} className="border-b border-slate-100 last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 text-sm">
            <span className="font-semibold text-slate-900">{b.account.code} · {b.account.name}</span>
            <span className="text-slate-600">{t('Opening')} <Amount value={b.opening} /> · {t('Receipts')} {money(b.receipts)} · {t('Payments')} {money(b.payments)} · {t('Closing')} <Amount value={b.closing} strong /></span>
          </div>
          {b.rows.length ? (
            <table className="min-w-full text-sm">
              <thead><tr><th className={th}>{t('Date')}</th><th className={th}>{t('Voucher')}</th><th className={th}>{t('Particulars')}</th><th className={cn(th, 'text-right')}>{t('Receipt')}</th><th className={cn(th, 'text-right')}>{t('Payment')}</th><th className={cn(th, 'text-right')}>{t('Balance')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {b.rows.map((r) => (
                  <tr key={r.lineId}>
                    <td className={cn(td, 'whitespace-nowrap')}>{date(r.date)}</td>
                    <td className={cn(td, 'font-mono text-xs')}>{r.number}</td>
                    <td className={cn(td, 'max-w-xs')}><p className="truncate">{r.narration}</p>{r.against && <p className="truncate text-xs text-slate-500">{r.against}</p>}</td>
                    <td className={num}><DrCr value={r.receipt} /></td>
                    <td className={num}><DrCr value={r.payment} /></td>
                    <td className={num}><Amount value={r.balance} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="px-4 py-4 text-sm text-slate-400">{t('No transactions in this period.')}</p>}
        </div>
      ))}
    </Frame>
  );
}

function Exports({ range }) {
  const { t } = useT();
  const dl = useDownload();
  const busy = (k) => dl.isPending && dl.variables?.key === k;
  const go = (key, path, query, filename) => dl.mutate({ key, path, query, filename });
  const items = [
    { key: 'tally', icon: FileCode2, title: 'Tally vouchers (XML)', text: 'Sales, receipt, payment, contra and journal vouchers for the period. Import in Tally: Gateway → Import Data → Vouchers.', action: () => go('tally', '/accounting/exports/tally', { ...range, kind: 'vouchers' }, `tally-vouchers-${range.from}-to-${range.to}.xml`) },
    { key: 'masters', icon: FileCode2, title: 'Tally ledgers (XML)', text: 'Creates every account as a Tally ledger under the matching group. Import this once before the vouchers.', action: () => go('masters', '/accounting/exports/tally', { kind: 'masters' }, 'tally-ledgers.xml') },
    { key: 'journal', icon: FileSpreadsheet, title: 'Journal (Excel)', text: 'One row per journal line with account codes — for Zoho Books, QuickBooks or your auditor.', action: () => go('journal', '/accounting/exports/journal', range, `journal-${range.from}-to-${range.to}.xlsx`) },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((i) => (
        <Card key={i.key} className="flex flex-col p-5">
          <i.icon className="size-6 text-brand-600" />
          <h3 className="mt-3 font-semibold text-slate-900">{t(i.title)}</h3>
          <p className="mt-1 flex-1 text-sm text-slate-500">{t(i.text)}</p>
          <Button className="mt-4 w-fit" variant="secondary" icon={Download} loading={busy(i.key)} onClick={i.action}>Download</Button>
        </Card>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('report') || 'trial-balance';
  const [range, setRange] = useState(defaultRange());
  const usesRange = !['balance-sheet'].includes(tab);
  return (
    <div>
      <PageHeader title="Financial reports" description="Statements built from the society's books. Download any of them as Excel or PDF." />
      <Tabs className="mb-4" value={tab} onChange={(v) => setParams((p) => { p.set('report', v); return p; }, { replace: true })} tabs={REPORTS} />
      {usesRange && <DateRange className="mb-4 max-w-2xl" value={range} onChange={setRange} />}
      {tab === 'trial-balance' && <TrialBalance range={range} />}
      {tab === 'income-expenditure' && <IncomeExpenditure range={range} />}
      {tab === 'balance-sheet' && <BalanceSheet />}
      {tab === 'funds' && <Funds range={range} />}
      {tab === 'cash-bank-book' && <CashBankBook range={range} />}
      {tab === 'exports' && <Exports range={range} />}
    </div>
  );
}
