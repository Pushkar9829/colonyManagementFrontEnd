import { useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Modal, Spinner, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useT } from '../../../context/LanguageContext';
import { date, dateTime, money, toPaise, todayISO } from '../../../lib/format';
import { useCreateJournal, useJournal, useReverseJournal } from '../api';
import { sourceLabel } from '../lib';
import { AccountSelect, DrCr } from './common';
import { errorText } from '../../../lib/errorText';

const blankLine = () => ({ key: Math.random().toString(36).slice(2), code: '', debit: '', credit: '', memo: '' });

// Manual journal entry. Lines must balance before it can be posted.
export function JournalEntryModal({ open, onClose }) {
  const { t } = useT();
  const [head, setHead] = useState({ date: todayISO(), narration: '', reference: '' });
  const [lines, setLines] = useState([blankLine(), blankLine()]);
  const [error, setError] = useState('');
  const create = useCreateJournal({ onSuccess: () => { setLines([blankLine(), blankLine()]); setHead({ date: todayISO(), narration: '', reference: '' }); onClose(); } });

  const dr = lines.reduce((s, l) => s + toPaise(l.debit), 0);
  const cr = lines.reduce((s, l) => s + toPaise(l.credit), 0);
  const balanced = dr > 0 && dr === cr;
  const setLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () => {
    setError('');
    const payload = lines
      .filter((l) => l.code && (toPaise(l.debit) || toPaise(l.credit)))
      .map((l) => ({ code: l.code, debit: toPaise(l.debit), credit: toPaise(l.credit), memo: l.memo || undefined }));
    create.mutate({ ...head, reference: head.reference || undefined, lines: payload }, { onError: (e) => setError(errorText(e, t)) });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="New journal entry" description="Debits must equal credits. Posted entries cannot be edited, only reversed."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!balanced || head.narration.trim().length < 3} loading={create.isPending} onClick={submit}>Post entry</Button></>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Date" type="date" required value={head.date} onChange={(e) => setHead({ ...head, date: e.target.value })} />
        <Input className="sm:col-span-2" label="Reference" placeholder="Voucher / cheque / UTR (optional)" value={head.reference} onChange={(e) => setHead({ ...head, reference: e.target.value })} />
        <Textarea className="sm:col-span-3" rows={2} label="Narration" required placeholder="e.g. Paid plumber for terrace tank repair" value={head.narration} onChange={(e) => setHead({ ...head, narration: e.target.value })} />
      </div>
      <div className="mt-5 space-y-3">
        {lines.map((l, i) => (
          <div key={l.key} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:border-0 sm:p-0">
            <AccountSelect className="col-span-2 sm:col-span-1" value={l.code} onChange={(code) => setLine(l.key, { code })} placeholder={t('Account (line {n})', { n: i + 1 })} />
            <Input type="number" min={0} step="0.01" placeholder="Debit ₹" aria-label={t('Debit')} value={l.debit} onChange={(e) => setLine(l.key, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} />
            <Input type="number" min={0} step="0.01" placeholder="Credit ₹" aria-label={t('Credit')} value={l.credit} onChange={(e) => setLine(l.key, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} />
            <button type="button" aria-label={t('Remove line')} disabled={lines.length <= 2} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              className="col-span-2 flex h-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30 sm:col-span-1 sm:w-10">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setLines((ls) => [...ls, blankLine()])}>Add line</Button>
      </div>
      <div className={cn('mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm', balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
        <span>{t('Debits')} <b className="tabular-nums">{money(dr)}</b> · {t('Credits')} <b className="tabular-nums">{money(cr)}</b></span>
        <span>{balanced ? t('Balanced') : dr === cr ? t('Enter amounts') : t('Difference {amount}', { amount: money(Math.abs(dr - cr)) })}</span>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

const REVERSIBLE = (e) => !e.reversedBy && !e.reversalOf && ['manual', 'opening'].includes(e.kind);

export function JournalDetailModal({ id, onClose }) {
  const { t } = useT();
  const { data: e, isLoading } = useJournal(id);
  const [reason, setReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const reverse = useReverseJournal({ onSuccess: () => { setReversing(false); setReason(''); onClose(); } });
  return (
    <Modal open={Boolean(id)} onClose={onClose} size="lg" title={e ? t('Journal {number}', { number: e.number }) : 'Journal entry'} description={e ? `${date(e.date)} · ${t(sourceLabel(e))}` : undefined}
      footer={e && REVERSIBLE(e) && (reversing ? (
        <>
          <Button variant="secondary" onClick={() => setReversing(false)}>Back</Button>
          <Button variant="danger" disabled={reason.trim().length < 3} loading={reverse.isPending} onClick={() => reverse.mutate({ id: e._id, reason })}>Post reversal</Button>
        </>
      ) : <Button variant="secondary" icon={RotateCcw} onClick={() => setReversing(true)}>Reverse entry</Button>)}>
      {isLoading || !e ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="space-y-4">
          <div>
            <p className="font-medium text-slate-900">{e.narration}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
              {e.reference && <span>{t('Ref {ref}', { ref: e.reference })}</span>}
              <span>{e.createdBy ? t('Posted {when} by {name}', { when: dateTime(e.createdAt), name: e.createdBy.name }) : t('Posted {when} automatically', { when: dateTime(e.createdAt) })}</span>
              {e.reversedBy && <Badge tone="red">{t('Reversed by {number}', { number: e.reversedBy.number })}</Badge>}
              {e.reversalOf && <Badge tone="amber">{t('Reverses {number}', { number: e.reversalOf.number })}</Badge>}
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2 text-left">{t('Account')}</th><th className="px-3 py-2 text-left">{t('Detail')}</th><th className="px-3 py-2 text-right">{t('Debit')}</th><th className="px-3 py-2 text-right">{t('Credit')}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {e.lines.map((l) => (
                  <tr key={l._id}>
                    <td className="px-3 py-2"><span className="font-mono text-xs text-slate-500">{l.code}</span> {l.accountName}</td>
                    <td className="px-3 py-2 text-slate-500">{[l.memo, l.unit?.label, l.vendor?.name].filter(Boolean).join(' · ')}</td>
                    <td className="px-3 py-2 text-right"><DrCr value={l.debit} /></td>
                    <td className="px-3 py-2 text-right"><DrCr value={l.credit} /></td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold"><td className="px-3 py-2" colSpan={2}>{t('Total')}</td><td className="px-3 py-2 text-right tabular-nums">{money(e.total)}</td><td className="px-3 py-2 text-right tabular-nums">{money(e.total)}</td></tr>
              </tbody>
            </table>
          </div>
          {reversing && <Textarea label="Reason for reversal" required rows={2} value={reason} onChange={(ev) => setReason(ev.target.value)} />}
          {!REVERSIBLE(e) && !e.reversedBy && !e.reversalOf && e.kind === 'auto' && (
            <p className="text-xs text-slate-500">{t('Automatic entries follow their source document — cancel the bill, bounce the payment or cancel the vendor bill to reverse it.')}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
