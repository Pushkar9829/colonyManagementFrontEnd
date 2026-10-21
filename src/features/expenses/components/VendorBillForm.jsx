import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, FileUpload, Input, Modal, Select, Textarea } from '../../../components/ui';
import { money, toPaise, todayISO } from '../../../lib/format';
import { AccountSelect } from '../../accounting/components/common';
import { useCreateVendorBill, useCreateRecurring, usePurchaseRequest, usePurchaseRequests } from '../api';
import { TDS_SECTIONS } from '../constants';
import { VendorPicker } from './VendorPicker';
import { useT } from '../../../context/LanguageContext';
import { errorText } from '../../../lib/errorText';

const blank = (account = '') => ({ key: Math.random().toString(36).slice(2), description: '', account, amount: '' });

// Shared lines + GST + TDS editor for vendor bills and recurring templates.
function useBillDraft(initialAccount) {
  const [lines, setLines] = useState([blank(initialAccount)]);
  const [gst, setGst] = useState('');
  const [claimGst, setClaimGst] = useState(false);
  const [tdsRate, setTdsRate] = useState('');
  const subtotal = lines.reduce((s, l) => s + toPaise(l.amount), 0);
  const gstAmount = toPaise(gst);
  const tdsAmount = Math.round((subtotal * Number(tdsRate || 0)) / 100);
  return { lines, setLines, gst, setGst, claimGst, setClaimGst, tdsRate, setTdsRate, subtotal, gstAmount, tdsAmount, total: subtotal + gstAmount, payable: subtotal + gstAmount - tdsAmount };
}

function LinesEditor({ d, defaultAccount }) {
  const { t } = useT();
  const setLine = (key, patch) => d.setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{t('Lines')}</p>
      {d.lines.map((l) => (
        <div key={l.key} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[2fr_2fr_1fr_auto] sm:border-0 sm:p-0">
          <Input className="col-span-2 sm:col-span-1" placeholder="Description" aria-label="Description" value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} />
          <AccountSelect className="col-span-2 sm:col-span-1" types={['expense', 'asset']} placeholder="Expense account" value={l.account} onChange={(account) => setLine(l.key, { account })} />
          <Input type="number" min={0} step="0.01" placeholder="Amount ₹" aria-label="Amount" value={l.amount} onChange={(e) => setLine(l.key, { amount: e.target.value })} />
          <button type="button" aria-label={t('Remove line')} disabled={d.lines.length === 1} onClick={() => d.setLines((ls) => ls.filter((x) => x.key !== l.key))} className="flex h-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30 sm:w-10"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={Plus} onClick={() => d.setLines((ls) => [...ls, blank(defaultAccount)])}>Add line</Button>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="GST amount (₹)" type="number" min={0} step="0.01" value={d.gst} onChange={(e) => d.setGst(e.target.value)} />
        <Input label="TDS %" type="number" min={0} max={30} step="0.01" value={d.tdsRate} onChange={(e) => d.setTdsRate(e.target.value)} hint="On the value before GST" />
        <Checkbox className="sm:self-end sm:pb-2" label="Claim GST as input credit" checked={d.claimGst} onChange={(e) => d.setClaimGst(e.target.checked)} />
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {t('Subtotal')} {money(d.subtotal)} + GST {money(d.gstAmount)} = <b>{money(d.total)}</b>
        {d.tdsAmount > 0 && <> · TDS {money(d.tdsAmount)} · {t('Payable to vendor')} <b>{money(d.payable)}</b></>}
      </div>
    </div>
  );
}

const linesPayload = (lines) => lines.filter((l) => l.description.trim() && l.account && toPaise(l.amount) > 0).map((l) => ({ description: l.description.trim(), account: l.account, amount: toPaise(l.amount) }));

export function VendorBillForm({ onClose, fromPr }) {
  const { t } = useT();
  const [vendor, setVendor] = useState(null);
  const [v, setV] = useState({ billNo: '', billDate: todayISO(), dueDate: '', tdsSection: '', purchaseRequest: fromPr || '', notes: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const d = useBillDraft('');
  const { data: pr } = usePurchaseRequest(fromPr);
  const { data: approved } = usePurchaseRequests({ status: 'approved', limit: 100 });
  const create = useCreateVendorBill({ onSuccess: onClose });

  // Prefill from the purchase request being billed.
  useEffect(() => {
    if (!pr) return;
    if (pr.vendor) setVendor({ _id: pr.vendor._id, name: pr.vendor.name });
    d.setLines(pr.items.length ? pr.items.map((i) => ({ ...blank(''), description: i.description, amount: String(i.amount / 100) })) : [{ ...blank(''), description: pr.title, amount: String(pr.amount / 100) }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr]);

  const pickVendor = (id, full) => {
    setVendor(full || null);
    if (full) {
      d.setTdsRate(full.tdsRate ? String(full.tdsRate) : '');
      setV((x) => ({ ...x, tdsSection: full.tdsSection || '' }));
      d.setLines((ls) => ls.map((l) => (l.account ? l : { ...l, account: full.defaultAccount || '' })));
    }
  };
  const lines = linesPayload(d.lines);
  const submit = () => {
    setError('');
    create.mutate({
      vendor: vendor._id, billNo: v.billNo, billDate: v.billDate, dueDate: v.dueDate || undefined, lines,
      gstAmount: d.gstAmount || undefined, claimGst: d.claimGst || undefined, tdsRate: Number(d.tdsRate || 0), tdsSection: v.tdsSection || undefined,
      purchaseRequest: v.purchaseRequest || undefined, notes: v.notes || undefined, attachments: files.length ? files.map((f) => f._id) : undefined,
    }, { onError: (e) => setError(errorText(e, t)) });
  };
  const prOptions = (approved?.data || []).filter((p) => !vendor || !p.vendor || p.vendor._id === vendor._id);
  return (
    <Modal open onClose={onClose} size="lg" title="Record vendor bill" description="Posts the expense and the amount owed to the vendor in the books."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!vendor || !v.billNo.trim() || !lines.length} loading={create.isPending} onClick={submit}>Save bill</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <VendorPicker className="sm:col-span-2" required value={vendor?._id} onChange={pickVendor} />
        <Input label="Vendor invoice no." required value={v.billNo} onChange={(e) => setV({ ...v, billNo: e.target.value })} />
        <Select label="Against purchase request" placeholder="None" value={v.purchaseRequest} onChange={(e) => setV({ ...v, purchaseRequest: e.target.value })}
          options={[...(pr && !prOptions.some((p) => p._id === pr._id) ? [pr] : []), ...prOptions].map((p) => ({ value: p._id, label: `${p.number} · ${p.title} · ${money(p.amount)}` }))} />
        <Input label="Invoice date" type="date" required value={v.billDate} onChange={(e) => setV({ ...v, billDate: e.target.value })} />
        <Input label="Due date" type="date" min={v.billDate} hint="Default: per expense settings" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />
      </div>
      <div className="mt-4"><LinesEditor d={d} defaultAccount={vendor?.defaultAccount} /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {d.tdsAmount > 0 && <Select label="TDS section" placeholder="Select" options={TDS_SECTIONS} value={v.tdsSection} onChange={(e) => setV({ ...v, tdsSection: e.target.value })} />}
        <Textarea className="sm:col-span-2" rows={2} label="Notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        <FileUpload className="sm:col-span-2" folder="expenses" files={files} onChange={setFiles} label="Attach invoice" />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

export function RecurringForm({ onClose }) {
  const { t } = useT();
  const [vendor, setVendor] = useState(null);
  const [v, setV] = useState({ name: '', dayOfMonth: '1', dueDays: '15', startDate: todayISO(), endDate: '' });
  const [error, setError] = useState('');
  const d = useBillDraft('');
  const create = useCreateRecurring({ onSuccess: onClose });
  const lines = linesPayload(d.lines);
  const pickVendor = (id, full) => {
    setVendor(full || null);
    if (full) {
      d.setTdsRate(full.tdsRate ? String(full.tdsRate) : '');
      d.setLines((ls) => ls.map((l) => (l.account ? l : { ...l, account: full.defaultAccount || '' })));
    }
  };
  return (
    <Modal open onClose={onClose} size="lg" title="Recurring expense" description="Raises the same vendor bill every month on the chosen day."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!vendor || v.name.trim().length < 3 || !lines.length} loading={create.isPending}
        onClick={() => create.mutate({
          name: v.name, vendor: vendor._id, lines, gstAmount: d.gstAmount || undefined, claimGst: d.claimGst || undefined, tdsRate: d.tdsRate === '' ? undefined : Number(d.tdsRate),
          dayOfMonth: Number(v.dayOfMonth), dueDays: Number(v.dueDays), startDate: v.startDate, endDate: v.endDate || undefined,
        }, { onError: (e) => setError(errorText(e, t)) })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required placeholder="e.g. Security agency monthly bill" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <VendorPicker className="sm:col-span-2" required value={vendor?._id} onChange={pickVendor} />
        <Input label="Bill on day of month" type="number" min={1} max={28} value={v.dayOfMonth} onChange={(e) => setV({ ...v, dayOfMonth: e.target.value })} />
        <Input label="Due after (days)" type="number" min={0} max={120} value={v.dueDays} onChange={(e) => setV({ ...v, dueDays: e.target.value })} />
        <Input label="Start" type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} />
        <Input label="End (optional)" type="date" min={v.startDate} value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} />
      </div>
      <div className="mt-4"><LinesEditor d={d} defaultAccount={vendor?.defaultAccount} /></div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
