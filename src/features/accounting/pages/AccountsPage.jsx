import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Landmark, Plus, RefreshCw, Scale, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Pagination, Select, Spinner, StatCard, Table, Tabs } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { date, money, timeAgo, toPaise, todayISO } from '../../../lib/format';
import { useAccounts, useCreateAccount, useJournals, useOpeningBalances, usePostOpeningBalances, useReport, useSync, useSyncStatus, useUpdateAccount } from '../api';
import { ACCOUNT_TYPES, SOURCE_LABELS, TYPE_LABEL, defaultRange, fyOf, fyStartDate, sourceLabel } from '../lib';
import { AccountSelect, Amount, DateRange, DownloadButtons, DrCr } from '../components/common';
import { JournalDetailModal, JournalEntryModal } from '../components/JournalModals';

function AccountModal({ open, onClose, account }) {
  const editing = Boolean(account);
  const [v, setV] = useState(() => ({
    code: account?.code || '', name: account?.name || '', parent: account?.parent || '', description: account?.description || '',
    isBank: account?.isBank || false, bankName: account?.bankDetails?.bankName || '', accountNumber: account?.bankDetails?.accountNumber || '',
    ifsc: account?.bankDetails?.ifsc || '', branch: account?.bankDetails?.branch || '',
  }));
  const [errors, setErrors] = useState({});
  const { data: accounts = [] } = useAccounts();
  const create = useCreateAccount({ onSuccess: onClose });
  const update = useUpdateAccount({ onSuccess: onClose });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const digit = v.code[0];
  const parents = accounts.filter((a) => a.code[0] === digit && !a.parent && a.code !== v.code);
  const bankDetails = v.isBank ? Object.fromEntries(Object.entries({ bankName: v.bankName, accountNumber: v.accountNumber, ifsc: v.ifsc, branch: v.branch }).filter(([, x]) => x)) : undefined;
  const onError = (err) => setErrors(err.fieldErrors || {});

  const submit = () => {
    if (editing) {
      const body = account.system ? { bankDetails } : { name: v.name, description: v.description || undefined, ...(account.isBank && { bankDetails }) };
      update.mutate({ id: account._id, ...body }, { onError });
    } else {
      create.mutate({ code: v.code, name: v.name, parent: v.parent || undefined, description: v.description || undefined, isBank: v.isBank || undefined, bankDetails }, { onError });
    }
  };
  const locked = editing && account.system;
  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${account.code} ${account.name}` : 'Add account'}
      description={editing ? (locked ? 'Standard accounts are locked; only bank details can change.' : undefined) : 'Codes are 4 digits: 1xxx assets, 2xxx liabilities, 3xxx funds, 4xxx income, 5xxx expenses.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" required disabled={editing} inputMode="numeric" maxLength={4} placeholder="e.g. 1001" value={v.code} onChange={set('code')} error={errors.code} hint={digit && TYPE_LABEL[{ 1: 'asset', 2: 'liability', 3: 'equity', 4: 'income', 5: 'expense' }[digit]]} />
        <Input label="Name" required disabled={locked} value={v.name} onChange={set('name')} error={errors.name} />
        {!editing && (
          <Select className="sm:col-span-2" label="Sub-account of" placeholder="None (top level)" value={v.parent} onChange={set('parent')}
            options={parents.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))} error={errors.parent} />
        )}
        <Input className="sm:col-span-2" label="Description" disabled={locked} value={v.description} onChange={set('description')} />
        {!editing && digit === '1' && <Checkbox className="sm:col-span-2" label="This is a bank account (shows in bank book and reconciliation)" checked={v.isBank} onChange={set('isBank')} />}
        {v.isBank && (
          <>
            <Input label="Bank" value={v.bankName} onChange={set('bankName')} />
            <Input label="Branch" value={v.branch} onChange={set('branch')} />
            <Input label="Account number" value={v.accountNumber} onChange={set('accountNumber')} error={errors['bankDetails.accountNumber']} />
            <Input label="IFSC" value={v.ifsc} onChange={set('ifsc')} error={errors['bankDetails.ifsc']} />
          </>
        )}
      </div>
    </Modal>
  );
}

function ChartTab({ onLedger }) {
  const [type, setType] = useState('');
  const [modal, setModal] = useState(null);
  const { data: accounts, isLoading } = useAccounts({ withBalances: true });
  const update = useUpdateAccount();
  const rows = (accounts || []).filter((a) => !type || a.type === type);
  return (
    <Card>
      <CardHeader title="Chart of accounts" subtitle="Balances to date, in each account's normal direction"
        action={<Button size="sm" icon={Plus} className="shrink-0 whitespace-nowrap" onClick={() => setModal({})}>Add account</Button>} />
      <div className="border-b border-slate-100 p-4 sm:max-w-xs">
        <Select placeholder="All types" options={ACCOUNT_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
      </div>
      <Table loading={isLoading} rows={rows} empty="No accounts"
        columns={[
          { key: 'code', header: 'Code', render: (a) => <span className={cn('font-mono text-xs', a.parent && 'pl-4')}>{a.code}</span> },
          { key: 'name', header: 'Account', render: (a) => (
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className="font-medium text-slate-900 hover:text-brand-700 hover:underline" onClick={() => onLedger(a.code)}>{a.name}</button>
              {a.isBank && <Badge tone="blue">Bank</Badge>}
              {a.isCash && <Badge tone="blue">Cash</Badge>}
              {a.system && <Badge>Standard</Badge>}
              {!a.active && <Badge tone="red">Inactive</Badge>}
            </div>
          ) },
          { key: 'type', header: 'Type', render: (a) => TYPE_LABEL[a.type] },
          { key: 'balance', header: 'Balance', className: 'text-right', render: (a) => <Amount value={a.balance} /> },
          { key: 'actions', header: '', className: 'text-right', render: (a) => (
            <div className="flex justify-end gap-1">
              {(!a.system || a.isBank) && <Button size="sm" variant="ghost" onClick={() => setModal(a)}>Edit</Button>}
              {!a.system && <Button size="sm" variant="ghost" loading={update.isPending && update.variables?.id === a._id} onClick={() => update.mutate({ id: a._id, active: !a.active })}>{a.active ? 'Deactivate' : 'Activate'}</Button>}
            </div>
          ) },
        ]} />
      {modal && <AccountModal open onClose={() => setModal(null)} account={modal._id ? modal : null} />}
    </Card>
  );
}

function JournalTab({ onOpen }) {
  const [range, setRange] = useState(defaultRange());
  const [filters, setFilters] = useState({ sourceType: '', code: '', search: '', page: 1 });
  const params = { from: range.from, to: range.to, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) };
  const { data, isLoading } = useJournals(params);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e?.target ? e.target.value : e, page: 1 }));
  return (
    <Card>
      <div className="space-y-3 border-b border-slate-100 p-4">
        <DateRange value={range} onChange={(r) => { setRange(r); setFilters((f) => ({ ...f, page: 1 })); }} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select placeholder="All sources" value={filters.sourceType} onChange={set('sourceType')}
            options={[{ value: 'manual', label: 'Manual' }, ...Object.entries(SOURCE_LABELS).map(([value, l]) => ({ value, label: l }))]} />
          <AccountSelect value={filters.code} onChange={set('code')} placeholder="Any account" includeInactive />
          <Input placeholder="Search narration, number, reference" value={filters.search} onChange={set('search')} />
        </div>
      </div>
      <Table loading={isLoading} rows={data?.data} empty="No journal entries in this period" onRowClick={(e) => onOpen(e._id)}
        columns={[
          { key: 'date', header: 'Date', render: (e) => date(e.date) },
          { key: 'number', header: 'Voucher', render: (e) => <span className="font-mono text-xs font-semibold">{e.number}</span> },
          { key: 'narration', header: 'Narration', className: 'max-w-sm', render: (e) => (
            <div className="truncate">
              <p className="truncate text-slate-900">{e.narration}</p>
              <p className="truncate text-xs text-slate-500">{e.lines.map((l) => `${l.code} ${l.debit ? 'Dr' : 'Cr'}`).join(' · ')}</p>
            </div>
          ) },
          { key: 'source', header: 'Source', render: (e) => <span className="text-xs">{sourceLabel(e)}</span> },
          { key: 'total', header: 'Amount', className: 'text-right', render: (e) => <span className="tabular-nums">{money(e.total)}</span> },
          { key: 'status', header: '', render: (e) => (e.reversedBy ? <Badge tone="red">Reversed</Badge> : e.reversalOf ? <Badge tone="amber">Reversal</Badge> : null) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </Card>
  );
}

function LedgerTab({ code, setCode, onOpen }) {
  const [range, setRange] = useState(defaultRange());
  const { data, isLoading, isFetching } = useReport('ledger', { code, ...range }, { enabled: Boolean(code) });
  return (
    <Card>
      <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_2fr]">
        <AccountSelect value={code} onChange={setCode} includeInactive placeholder="Choose an account" />
        <DateRange value={range} onChange={setRange} />
      </div>
      {!code ? <EmptyState icon={BookOpen} title="Pick an account to see its ledger" /> : isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{data.account.code} {data.account.name}</span>
              {' · '}Opening <Amount value={data.opening} /> · Closing <Amount value={data.closing} strong />
              {isFetching && <Spinner className="ml-2 inline size-4" />}
            </div>
            <DownloadButtons path="/accounting/reports/ledger" query={{ code, ...range }} filename={`ledger-${code}-${range.to}`} />
          </div>
          <Table rows={[{ _id: 'opening', narration: 'Opening balance', balance: data.opening, opening: true }, ...data.rows.map((r) => ({ ...r, _id: r.lineId }))]} empty="No entries"
            onRowClick={(r) => r.entryId && onOpen(r.entryId)}
            columns={[
              { key: 'date', header: 'Date', render: (r) => (r.date ? date(r.date) : '') },
              { key: 'number', header: 'Voucher', render: (r) => <span className="font-mono text-xs">{r.number}</span> },
              { key: 'narration', header: 'Narration', className: 'max-w-xs', render: (r) => <div className="truncate"><p className={cn('truncate', r.opening ? 'italic text-slate-500' : 'text-slate-900')}>{r.narration}</p>{r.against && <p className="truncate text-xs text-slate-500">{r.against}</p>}</div> },
              { key: 'debit', header: 'Debit', className: 'text-right', render: (r) => <DrCr value={r.debit} /> },
              { key: 'credit', header: 'Credit', className: 'text-right', render: (r) => <DrCr value={r.credit} /> },
              { key: 'balance', header: 'Balance', className: 'text-right', render: (r) => <Amount value={r.balance} /> },
            ]} />
          {data.truncated && <p className="px-4 py-3 text-xs text-amber-700">Showing the first 5,000 lines. Narrow the date range to see the rest.</p>}
        </>
      )}
    </Card>
  );
}

function OpeningTab() {
  const { data: opening, isLoading } = useOpeningBalances();
  const { data: accounts = [] } = useAccounts();
  const [when, setWhen] = useState(fyStartDate(fyOf(todayISO())));
  const [amounts, setAmounts] = useState({});
  const post = usePostOpeningBalances({ onSuccess: () => setAmounts({}) });
  const balanceSheet = accounts.filter((a) => ['asset', 'liability', 'equity'].includes(a.type) && a.code !== '3900' && a.active);
  const dr = Object.values(amounts).reduce((s, x) => s + toPaise(x.debit), 0);
  const cr = Object.values(amounts).reduce((s, x) => s + toPaise(x.credit), 0);
  const set = (code, side, value) => setAmounts((m) => ({ ...m, [code]: { ...(m[code] || {}), [side]: value, [side === 'debit' ? 'credit' : 'debit']: value ? '' : m[code]?.[side === 'debit' ? 'credit' : 'debit'] } }));

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (opening) {
    return (
      <Card>
        <CardHeader title="Opening balances" subtitle={`Posted as ${opening.number} on ${date(opening.date)}. To change them, open the entry from the Journal tab and reverse it, then post again.`} />
        <Table rows={opening.lines} columns={[
          { key: 'code', header: 'Code', render: (l) => <span className="font-mono text-xs">{l.code}</span> },
          { key: 'accountName', header: 'Account' },
          { key: 'debit', header: 'Debit', className: 'text-right', render: (l) => <DrCr value={l.debit} /> },
          { key: 'credit', header: 'Credit', className: 'text-right', render: (l) => <DrCr value={l.credit} /> },
        ]} />
      </Card>
    );
  }
  const lines = Object.entries(amounts).map(([code, x]) => ({ code, debit: toPaise(x.debit), credit: toPaise(x.credit) })).filter((l) => l.debit || l.credit);
  return (
    <Card>
      <CardHeader title="Opening balances" subtitle="One-time entry when you move your books here. Any difference goes to 3900 Opening balance equity."
        action={<Button disabled={!lines.length} loading={post.isPending} onClick={() => post.mutate({ date: when, lines })}>Post opening balances</Button>} />
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <Input label="As of" type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
        <div className="text-sm text-slate-600 sm:col-span-2 sm:self-end">
          Debits <b>{money(dr)}</b> · Credits <b>{money(cr)}</b> · to 3900: <b>{money(Math.abs(dr - cr))} {dr > cr ? 'Cr' : dr < cr ? 'Dr' : ''}</b>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {balanceSheet.map((a) => (
          <div key={a.code} className="grid grid-cols-2 items-center gap-2 px-4 py-2 sm:grid-cols-[2fr_1fr_1fr]">
            <p className="col-span-2 text-sm sm:col-span-1"><span className="font-mono text-xs text-slate-500">{a.code}</span> {a.name}</p>
            <Input type="number" min={0} step="0.01" placeholder="Debit ₹" aria-label={`${a.name} debit`} value={amounts[a.code]?.debit || ''} onChange={(e) => set(a.code, 'debit', e.target.value)} />
            <Input type="number" min={0} step="0.01" placeholder="Credit ₹" aria-label={`${a.name} credit`} value={amounts[a.code]?.credit || ''} onChange={(e) => set(a.code, 'credit', e.target.value)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Summary() {
  const today = todayISO();
  const { data: bs } = useReport('balance-sheet', { asOf: today });
  const { data: pl } = useReport('income-expenditure', defaultRange());
  const { data: accounts } = useAccounts({ withBalances: true });
  if (!bs || !pl || !accounts) return null;
  const cashBank = accounts.filter((a) => a.isBank || a.isCash).reduce((s, a) => s + a.balance, 0);
  const receivable = accounts.find((a) => a.code === '1100')?.balance || 0;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Landmark} label="Cash & bank" value={money(cashBank)} />
      <StatCard icon={Wallet} tone="amber" label="Dues receivable" value={money(receivable)} />
      <StatCard icon={Scale} tone={pl.surplus >= 0 ? 'green' : 'red'} label={pl.surplus >= 0 ? 'Surplus this FY' : 'Deficit this FY'} value={money(Math.abs(pl.surplus))} />
      <StatCard icon={BookOpen} tone="slate" label="Funds & reserves" value={money(bs.totalFunds)} />
    </div>
  );
}

export default function AccountsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'chart';
  const [code, setCode] = useState(params.get('code') || '');
  const [entryId, setEntryId] = useState(null);
  const [creating, setCreating] = useState(false);
  const sync = useSync();
  const { data: syncState } = useSyncStatus();
  const lastSync = useMemo(() => (syncState || []).reduce((m, s) => (s.lastRunAt && (!m || s.lastRunAt > m) ? s.lastRunAt : m), null), [syncState]);
  const setTab = (t) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });

  return (
    <div>
      <PageHeader title="Accounts" description="The society's account books. Bills, receipts and vendor bills are added automatically."
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={sync.isPending} onClick={() => sync.mutate({})} title={lastSync ? `Last synced ${timeAgo(lastSync)}` : undefined}>
              Sync now
            </Button>
            <Button icon={Plus} onClick={() => setCreating(true)}>New entry</Button>
          </>
        )} />
      <Summary />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab}
        tabs={[{ value: 'chart', label: 'Chart of accounts' }, { value: 'journal', label: 'Journal' }, { value: 'ledger', label: 'Ledger' }, { value: 'opening', label: 'Opening balances' }]} />
      {tab === 'chart' && <ChartTab onLedger={(c) => { setCode(c); setTab('ledger'); }} />}
      {tab === 'journal' && <JournalTab onOpen={setEntryId} />}
      {tab === 'ledger' && <LedgerTab code={code} setCode={setCode} onOpen={setEntryId} />}
      {tab === 'opening' && <OpeningTab />}
      {lastSync && <p className="mt-3 text-xs text-slate-400">Automatic posting last ran {timeAgo(lastSync)}; it runs every 15 minutes.</p>}
      <JournalEntryModal open={creating} onClose={() => setCreating(false)} />
      <JournalDetailModal id={entryId} onClose={() => setEntryId(null)} />
    </div>
  );
}
