import { useEffect, useMemo, useState } from 'react';
import { Landmark, Link2, Sparkles, Trash2, Unlink, Upload } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Select, Spinner, StatCard, StatusBadge, Table, Tabs } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, dateTime, money, todayISO } from '../../../lib/format';
import {
  useAutoMatch, useBankAccounts, useBookLine, useCandidates, useDeleteImport, useIgnoreLine, useImportStatement, useMatchLine,
  usePreviewStatement, useReconciliation, useStatementImports, useStatementLines, useUnmatchLine,
} from '../api';
import { AccountSelect, Amount, DrCr } from '../components/common';

const FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description' },
  { key: 'reference', label: 'Reference / UTR' },
  { key: 'debit', label: 'Withdrawal (debit)' },
  { key: 'credit', label: 'Deposit (credit)' },
  { key: 'amount', label: 'Single amount column' },
  { key: 'balance', label: 'Balance' },
];

function ImportModal({ code, open, onClose }) {
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState({});
  const [dateFormat, setDateFormat] = useState('DMY');
  const preview = usePreviewStatement(code);
  const doImport = useImportStatement(code, { onSuccess: () => { setFile(null); setMapping({}); preview.reset(); onClose(); } });
  const p = preview.data;
  const effective = { ...mapping, dateFormat };

  const pick = (f) => {
    setFile(f);
    setMapping({});
    if (f) preview.mutate({ file: f, mapping: { dateFormat } });
  };

  const remap = (key, header) => {
    const next = { ...mapping, [key]: header || false };
    setMapping(next);
    preview.mutate({ file, mapping: { ...next, dateFormat } });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Import bank statement" description="CSV or Excel (.xlsx) downloaded from net banking. Columns are detected automatically; correct them if needed."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Upload} disabled={!file || !p?.totalLines} loading={doImport.isPending} onClick={() => doImport.mutate({ file, mapping: effective })}>Import {p?.totalLines ? `${p.totalLines} lines` : ''}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-700">
            <Upload className="size-4" />
            {file ? file.name : 'Choose statement file'}
            <input type="file" hidden accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => pick(e.target.files?.[0] || null)} />
          </label>
          <Select label="Date format" value={dateFormat} onChange={(e) => { setDateFormat(e.target.value); if (file) preview.mutate({ file, mapping: { ...mapping, dateFormat: e.target.value } }); }}
            options={[{ value: 'DMY', label: 'DD/MM/YYYY' }, { value: 'MDY', label: 'MM/DD/YYYY' }, { value: 'YMD', label: 'YYYY-MM-DD' }]} />
        </div>
        {preview.isPending && <div className="flex justify-center py-6"><Spinner /></div>}
        {preview.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{preview.error.message}</p>}
        {p && !preview.isPending && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <Select key={f.key} label={f.label} placeholder="— not in file —" value={mapping[f.key] === false ? '' : mapping[f.key] || p.columns[f.key] || ''}
                  onChange={(e) => remap(f.key, e.target.value)} options={p.headers.filter(Boolean).map((h) => ({ value: h, label: h }))} />
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Ref</th><th className="px-3 py-2 text-right">Deposit</th><th className="px-3 py-2 text-right">Withdrawal</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {p.lines.slice(0, 8).map((l) => (
                    <tr key={l.row}><td className="px-3 py-1.5">{l.date}</td><td className="max-w-[14rem] truncate px-3 py-1.5">{l.description}</td><td className="px-3 py-1.5">{l.reference}</td><td className="px-3 py-1.5 text-right"><DrCr value={l.deposit} /></td><td className="px-3 py-1.5 text-right"><DrCr value={l.withdrawal} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">{p.totalLines} transactions found{p.errors.length ? ` · ${p.errors.length} rows skipped (e.g. row ${p.errors[0].row}: ${p.errors[0].message})` : ''}. Lines already imported are skipped automatically.</p>
          </>
        )}
      </div>
    </Modal>
  );
}

function MatchModal({ line, onClose }) {
  const { data: candidates, isLoading } = useCandidates(line?._id);
  const [picked, setPicked] = useState([]);
  const match = useMatchLine({ onSuccess: onClose });
  const target = line ? line.deposit - line.withdrawal : 0;
  const sum = (candidates || []).filter((c) => picked.includes(c.lineId)).reduce((s, c) => s + c.debit - c.credit, 0);
  return (
    <Modal open={Boolean(line)} onClose={onClose} size="lg" title="Match statement line"
      description={line && `${date(line.date)} · ${line.description || line.reference || ''} · ${line.deposit ? `deposit ${money(line.deposit)}` : `withdrawal ${money(line.withdrawal)}`}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!picked.length || sum !== target} loading={match.isPending} onClick={() => match.mutate({ id: line._id, entryLines: picked })}>Match</Button></>}>
      {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : !candidates?.length ? (
        <EmptyState title="No unmatched book entries nearby" description="Book it from the line menu (bank charge, interest or another account) if it is not in the books yet." />
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <label key={c.lineId} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm', picked.includes(c.lineId) ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
              <Checkbox checked={picked.includes(c.lineId)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.lineId] : p.filter((x) => x !== c.lineId)))} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-900">{c.narration}</p>
                <p className="text-xs text-slate-500">{c.number} · {date(c.date)}{c.reference ? ` · ${c.reference}` : ''}{c.dateGap ? ` · ${c.dateGap} days apart` : ''}</p>
              </div>
              <span className={cn('tabular-nums font-medium', c.amount === Math.abs(target) && 'text-emerald-700')}>{money(c.amount)}</span>
            </label>
          ))}
          <p className={cn('pt-1 text-sm', sum === target ? 'text-emerald-700' : 'text-slate-500')}>Selected {money(Math.abs(sum))} of {money(Math.abs(target))}</p>
        </div>
      )}
    </Modal>
  );
}

function BookModal({ line, onClose }) {
  const deposit = line?.deposit > 0;
  const [kind, setKind] = useState(deposit ? 'interest' : 'bank_charge');
  const [accountCode, setAccountCode] = useState('');
  const [narration, setNarration] = useState('');
  const book = useBookLine({ onSuccess: onClose });
  const kinds = deposit ? [{ value: 'interest', label: 'Bank interest (4300)' }, { value: 'other', label: 'Other receipt' }] : [{ value: 'bank_charge', label: 'Bank charges (5700)' }, { value: 'other', label: 'Other payment' }];
  return (
    <Modal open={Boolean(line)} onClose={onClose} title="Book this line" description="Creates a journal entry for a transaction that is only on the bank statement, and matches it."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={kind === 'other' && !accountCode} loading={book.isPending} onClick={() => book.mutate({ id: line._id, kind, accountCode: accountCode || undefined, narration: narration || undefined })}>Book & match</Button></>}>
      {line && (
        <div className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{date(line.date)} · {line.description} · <b>{money(line.deposit || line.withdrawal)}</b> {deposit ? 'in' : 'out'}</p>
          <Select label="What is it?" value={kind} onChange={(e) => setKind(e.target.value)} options={kinds} />
          <AccountSelect label={kind === 'other' ? 'Other account' : 'Account (optional override)'} value={accountCode} onChange={setAccountCode} types={deposit ? ['income', 'liability', 'equity', 'asset'] : ['expense', 'liability', 'asset']} />
          <Input label="Narration" placeholder="Optional" value={narration} onChange={(e) => setNarration(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

function Summary({ code }) {
  const [asOf, setAsOf] = useState(todayISO());
  const { data: s } = useReconciliation(code, asOf);
  if (!s) return null;
  const reconciled = s.difference === 0;
  return (
    <Card className="mb-6">
      <CardHeader title="Reconciliation" subtitle={`${s.account.code} ${s.account.name}`} action={<Input type="date" aria-label="As of" value={asOf} onChange={(e) => setAsOf(e.target.value)} />} />
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Balance as per books" value={<Amount value={s.bookBalance} />} />
        <StatCard label="Balance as per statement" value={s.statementBalance === null ? '—' : <Amount value={s.statementBalance} />} sub={s.statementBalanceDate ? `on ${date(s.statementBalanceDate)}` : 'Import a statement with a balance column'} />
        <StatCard label="Expected statement balance" value={<Amount value={s.expectedBankBalance} />} sub="books adjusted for open items" />
        <StatCard tone={reconciled ? 'green' : 'amber'} label="Difference" value={s.difference === null ? '—' : <Amount value={s.difference} />} sub={reconciled ? 'Reconciled' : `${s.counts.unmatchedStatement} statement / ${s.counts.unmatchedBook} book items open`} />
      </div>
      <div className="grid gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <span>Receipts not yet in bank: <b>{money(s.bookReceiptsPending)}</b></span>
        <span>Payments not yet cleared: <b>{money(s.bookPaymentsPending)}</b></span>
        <span>Bank credits not in books: <b>{money(s.bankCreditsUnrecorded)}</b></span>
        <span>Bank debits not in books: <b>{money(s.bankDebitsUnrecorded)}</b></span>
      </div>
      {s.unmatchedBook.length > 0 && (
        <details className="border-t border-slate-100 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">Book entries not on the statement ({s.unmatchedBook.length})</summary>
          <ul className="mt-2 divide-y divide-slate-100">
            {s.unmatchedBook.map((b) => (
              <li key={b.lineId} className="flex justify-between gap-3 py-1.5"><span className="truncate">{date(b.date)} · {b.number} · {b.narration}</span><span className="shrink-0 tabular-nums">{b.debit ? `+${money(b.debit)}` : `−${money(b.credit)}`}</span></li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function Lines({ code }) {
  const [status, setStatus] = useState('unmatched');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useStatementLines(code, { status: status || undefined, page, limit: 25 });
  const [matching, setMatching] = useState(null);
  const [booking, setBooking] = useState(null);
  const unmatch = useUnmatchLine();
  const ignore = useIgnoreLine();
  const auto = useAutoMatch(code);
  useEffect(() => setPage(1), [status, code]);
  return (
    <Card className="mb-6">
      <CardHeader title="Statement lines" action={<Button size="sm" variant="secondary" icon={Sparkles} loading={auto.isPending} onClick={() => auto.mutate()}>Auto-match</Button>} />
      <div className="border-b border-slate-100 p-4">
        <Tabs value={status} onChange={setStatus} className="w-fit" tabs={[{ value: 'unmatched', label: 'Unmatched' }, { value: 'matched', label: 'Matched' }, { value: 'ignored', label: 'Ignored' }, { value: '', label: 'All' }]} />
      </div>
      <Table loading={isLoading} rows={data?.data} empty={status === 'unmatched' ? 'Nothing left to match' : 'No lines'}
        columns={[
          { key: 'date', header: 'Date', render: (l) => date(l.date) },
          { key: 'description', header: 'Description', className: 'max-w-xs', render: (l) => <div className="truncate"><p className="truncate text-slate-900">{l.description || '—'}</p>{l.reference && <p className="text-xs text-slate-500">{l.reference}</p>}</div> },
          { key: 'deposit', header: 'Deposit', className: 'text-right', render: (l) => <DrCr value={l.deposit} /> },
          { key: 'withdrawal', header: 'Withdrawal', className: 'text-right', render: (l) => <DrCr value={l.withdrawal} /> },
          { key: 'status', header: 'Status', render: (l) => (
            <div className="flex flex-wrap items-center gap-1">
              <StatusBadge status={l.status === 'matched' ? 'approved' : l.status === 'ignored' ? 'cancelled' : 'pending'} />
              {l.matchType && <Badge>{l.matchType}</Badge>}
              {l.entries?.map((e) => <span key={e._id} className="font-mono text-[11px] text-slate-500">{e.number}</span>)}
            </div>
          ) },
          { key: 'actions', header: '', className: 'text-right', render: (l) => (
            <div className="flex justify-end gap-1">
              {l.status === 'unmatched' && (
                <>
                  <Button size="sm" variant="ghost" icon={Link2} onClick={() => setMatching(l)}>Match</Button>
                  <Button size="sm" variant="ghost" onClick={() => setBooking(l)}>Book</Button>
                  <Button size="sm" variant="ghost" loading={ignore.isPending && ignore.variables === l._id} onClick={() => ignore.mutate(l._id)}>Ignore</Button>
                </>
              )}
              {l.status !== 'unmatched' && (
                <Button size="sm" variant="ghost" icon={Unlink} loading={unmatch.isPending && unmatch.variables === l._id}
                  onClick={() => (l.matchType !== 'created' || window.confirm('This line was booked from the statement. Unmatching reverses that entry. Continue?')) && unmatch.mutate(l._id)}>
                  {l.status === 'ignored' ? 'Restore' : 'Unmatch'}
                </Button>
              )}
            </div>
          ) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {matching && <MatchModal line={matching} onClose={() => setMatching(null)} />}
      {booking && <BookModal line={booking} onClose={() => setBooking(null)} />}
    </Card>
  );
}

function Imports({ code }) {
  const { data } = useStatementImports(code);
  const remove = useDeleteImport();
  if (!data?.length) return null;
  return (
    <Card>
      <CardHeader title="Imported statements" />
      <Table rows={data} columns={[
        { key: 'fileName', header: 'File', render: (i) => <span className="font-medium text-slate-900">{i.fileName}</span> },
        { key: 'period', header: 'Period', render: (i) => `${date(i.from)} – ${date(i.to)}` },
        { key: 'imported', header: 'Lines', render: (i) => `${i.imported} new${i.duplicates ? ` · ${i.duplicates} dup` : ''}` },
        { key: 'autoMatched', header: 'Auto-matched' },
        { key: 'createdAt', header: 'Imported', render: (i) => `${dateTime(i.createdAt)}${i.uploadedBy ? ` · ${i.uploadedBy.name}` : ''}` },
        { key: 'actions', header: '', render: (i) => <Button size="sm" variant="ghost" icon={Trash2} loading={remove.isPending && remove.variables === i._id} onClick={() => window.confirm('Remove this statement and its unmatched lines?') && remove.mutate(i._id)}>Remove</Button> },
      ]} />
    </Card>
  );
}

export default function BankReconciliationPage() {
  const { data: accounts, isLoading } = useBankAccounts();
  const [code, setCode] = useState('');
  const [importing, setImporting] = useState(false);
  const current = useMemo(() => accounts?.find((a) => a.code === code) || accounts?.[0], [accounts, code]);
  const active = current?.code;

  return (
    <div>
      <PageHeader title="Bank reconciliation" description="Import bank statements and tick them off against the books."
        actions={active && <Button icon={Upload} onClick={() => setImporting(true)}>Import statement</Button>} />
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : !accounts?.length ? (
        <Card><EmptyState icon={Landmark} title="No bank accounts" description="Add a bank account in Accounts → Chart of accounts." /></Card>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <button type="button" key={a.code} onClick={() => setCode(a.code)}
                className={cn('rounded-xl border bg-white p-4 text-left shadow-sm transition', a.code === active ? 'border-brand-400 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-brand-200')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{a.code} · {a.name}</span>
                  {a.unmatched > 0 && <Badge tone="amber">{a.unmatched} open</Badge>}
                </div>
                <p className="mt-1 text-lg font-semibold"><Amount value={a.bookBalance} /></p>
                <p className="text-xs text-slate-500">{a.bankDetails?.bankName ? `${a.bankDetails.bankName} · ` : ''}{a.lastStatementDate ? `statement to ${date(a.lastStatementDate)}` : 'no statement yet'}</p>
              </button>
            ))}
          </div>
          <Summary key={`s-${active}`} code={active} />
          <Lines code={active} />
          <Imports code={active} />
          {importing && <ImportModal code={active} open onClose={() => setImporting(false)} />}
        </>
      )}
    </div>
  );
}
