import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button, Card, EmptyState, Input, Spinner, StatCard } from '../../../components/ui';
import { date, money } from '../../../lib/format';
import { UnitPicker } from '../../units/components/UnitPicker';
import { useApplyCredit, useDownload, useStatement } from '../api';
import { useT } from '../../../context/LanguageContext';

const balanceText = (b) => (b < 0 ? `${money(-b)} Cr` : money(b));

// Ledger with running balance. Residents see their own home; finance staff pick a unit.
export function StatementPanel({ finance }) {
  const { t } = useT();
  const [unit, setUnit] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const query = { unit: finance ? unit || undefined : undefined, from: range.from || undefined, to: range.to ? `${range.to}T23:59:59` : undefined };
  const enabled = !finance || Boolean(unit);
  const { data: st, isLoading } = useStatement(query, enabled);
  const { download, busy } = useDownload();
  const applyCredit = useApplyCredit();
  const name = st ? `statement-${st.unit.label}` : 'statement';

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {finance && <div className="col-span-2"><UnitPicker value={unit} onChange={(id) => setUnit(id)} /></div>}
        <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </Card>

      {!enabled ? (
        <Card><EmptyState title="Pick a unit to see its statement" /></Card>
      ) : isLoading || !st ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
            <StatCard label="Outstanding dues" value={money(st.outstanding)} tone={st.outstanding ? 'red' : 'green'} />
            <StatCard label="Advance balance" value={money(st.creditBalance)} tone="green" sub={st.unbilledCharges ? t('{amount} charges on next bill', { amount: money(st.unbilledCharges) }) : undefined} />
            <StatCard label="Net balance" value={balanceText(st.closingBalance)} sub={st.closingBalance < 0 ? 'In advance' : 'Payable'} />
          </div>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
              <p className="font-medium text-slate-800">{t('Statement · {unit}', { unit: st.unit.label })}</p>
              <div className="flex flex-wrap gap-2">
                {finance && st.creditBalance > 0 && st.outstanding > 0 && (
                  <Button size="sm" variant="secondary" loading={applyCredit.isPending} onClick={() => applyCredit.mutate(st.unit._id)}>Apply advance to dues</Button>
                )}
                <Button size="sm" variant="secondary" icon={FileText} loading={busy === 'pdf'} onClick={() => download('pdf', '/bills/statement.pdf', query, `${name}.pdf`)}>PDF</Button>
                <Button size="sm" variant="secondary" icon={FileSpreadsheet} loading={busy === 'xlsx'} onClick={() => download('xlsx', '/bills/statement.xlsx', query, `${name}.xlsx`)}>Excel</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">{t('Date')}</th><th className="px-4 py-3">{t('Particulars')}</th><th className="px-4 py-3 text-right">{t('Debit')}</th><th className="px-4 py-3 text-right">{t('Credit')}</th><th className="px-4 py-3 text-right">{t('Balance')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr className="bg-slate-50/60 font-medium"><td className="px-4 py-2">{st.from ? date(st.from) : ''}</td><td className="px-4 py-2">{t('Opening balance')}</td><td /><td /><td className="px-4 py-2 text-right">{balanceText(st.openingBalance)}</td></tr>
                  {st.entries.map((e, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={`${e.ref}-${e.type}-${i}`}>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">{date(e.date)}</td>
                      <td className="min-w-56 px-4 py-2 text-slate-700">{e.description}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">{e.debit ? money(e.debit) : ''}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-emerald-700">{e.credit ? money(e.credit) : ''}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium">{balanceText(e.balance)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold"><td /><td className="px-4 py-2">{t('Closing balance')}</td><td className="px-4 py-2 text-right">{money(st.totals.debit)}</td><td className="px-4 py-2 text-right">{money(st.totals.credit)}</td><td className="px-4 py-2 text-right">{balanceText(st.closingBalance)}</td></tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
