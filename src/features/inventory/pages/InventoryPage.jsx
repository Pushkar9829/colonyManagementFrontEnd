import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Download, Package, Plus, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, FilterBar, Input, Modal, Pagination, Select, StatCard, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { date, dateTime, label, money, toPaise, todayISO } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { clean, downloadFile, opts, usePeople } from '../../assets/shared';
import { useAdjustStock, useCreateItem, useItems, useMovements, useStockIn, useStockOut, useUpdateItem, useValuation } from '../api';
import { useT } from '../../../context/LanguageContext';

const CATEGORIES = opts(['electrical', 'plumbing', 'cleaning', 'chemical', 'spare_part', 'consumable', 'stationery', 'safety', 'garden', 'other']);
// Units are stored lower-case; litres are written "L" so "60 l" never reads as "60 1".
const UNIT_TEXT = { l: 'L', ml: 'mL' };
const unitText = (u) => UNIT_TEXT[u] || u || '';
const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'box', 'pack', 'roll', 'set', 'pair', 'can', 'bottle'].map((u) => ({ value: u, label: unitText(u) }));
const TYPE_TONES = { in: 'green', out: 'amber', adjust: 'blue' };
const qty = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 });

function ItemModal({ open, onClose, item }) {
  const { t } = useT();
  const blank = { name: '', category: 'consumable', unit: 'pcs', location: '', description: '', reorderLevel: '0', reorderQty: '0', openingStock: '', openingCost: '' };
  const { values, bind, setValues, applyServerErrors } = useForm(blank);
  useEffect(() => {
    if (open) setValues(item ? { ...blank, ...item, reorderLevel: String(item.reorderLevel), reorderQty: String(item.reorderQty) } : blank);
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = useCreateItem({ onSuccess: onClose });
  const update = useUpdateItem({ onSuccess: onClose });
  const submit = () => {
    const body = { name: values.name, category: values.category, unit: values.unit, location: values.location || undefined, description: values.description || undefined, reorderLevel: Number(values.reorderLevel || 0), reorderQty: Number(values.reorderQty || 0) };
    if (item) update.mutate({ id: item._id, ...body }, { onError: applyServerErrors });
    else create.mutate({ ...body, ...(values.openingStock && { openingStock: Number(values.openingStock), openingCost: toPaise(values.openingCost || 0) }) }, { onError: applyServerErrors });
  };
  return (
    <Modal open={open} onClose={onClose} title={item ? t('Edit {name}', { name: item.name }) : 'New store item'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required {...bind('name')} />
        <Select label="Category" options={CATEGORIES} {...bind('category')} />
        <Select label="Unit" options={UNITS} {...bind('unit')} />
        <Input label="Reorder level" type="number" min="0" step="any" hint="Alert when stock falls to this" {...bind('reorderLevel')} />
        <Input label="Reorder quantity" type="number" min="0" step="any" {...bind('reorderQty')} />
        <Input className="sm:col-span-2" label="Store location" placeholder="Store room, shelf B" {...bind('location')} />
        {!item && <Input label="Opening stock" type="number" min="0" step="any" {...bind('openingStock')} />}
        {!item && <Input label="Opening cost per unit (₹)" type="number" min="0" step="0.01" {...bind('openingCost')} />}
        <Textarea className="sm:col-span-2" label="Description" rows={2} {...bind('description')} />
      </div>
    </Modal>
  );
}

function MoveModal({ item, mode, onClose }) {
  const { t } = useT();
  const { values, bind, applyServerErrors } = useForm({ qty: '', unitCost: item?.lastPurchaseCost ? String(item.lastPurchaseCost / 100) : '', vendorName: '', invoiceNumber: '', issuedTo: '', location: '', reason: '', countedQty: item ? String(item.stock) : '', date: todayISO() });
  const { data: people } = usePeople(['staff', 'facility_manager', 'guard'], mode === 'out');
  const done = { onSuccess: onClose };
  const stockIn = useStockIn(done);
  const stockOut = useStockOut(done);
  const adjust = useAdjustStock(done);
  if (!item) return null;
  const submit = () => {
    if (mode === 'in') stockIn.mutate({ id: item._id, ...clean({ qty: Number(values.qty), unitCost: toPaise(values.unitCost || 0), vendorName: values.vendorName, invoiceNumber: values.invoiceNumber, reason: values.reason, date: values.date }) }, { onError: applyServerErrors });
    if (mode === 'out') stockOut.mutate({ id: item._id, ...clean({ qty: Number(values.qty), issuedTo: values.issuedTo, location: values.location, reason: values.reason, date: values.date }) }, { onError: applyServerErrors });
    if (mode === 'adjust') adjust.mutate({ id: item._id, countedQty: Number(values.countedQty), reason: values.reason, date: values.date }, { onError: applyServerErrors });
  };
  const titles = { in: 'Receive stock', out: 'Issue stock', adjust: 'Stock count correction' };
  return (
    <Modal open onClose={onClose} title={`${t(titles[mode])} · ${item.name}`} description={t('In stock: {qty} {unit}', { qty: qty(item.stock), unit: unitText(item.unit) })}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={stockIn.isPending || stockOut.isPending || adjust.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {mode !== 'adjust' && <Input label={t('Quantity ({unit})', { unit: unitText(item.unit) })} type="number" min="0" step="any" required {...bind('qty')} />}
        {mode === 'adjust' && <Input label={t('Counted quantity ({unit})', { unit: unitText(item.unit) })} type="number" min="0" step="any" required {...bind('countedQty')} />}
        <Input label="Date" type="date" {...bind('date')} />
        {mode === 'in' && (
          <>
            <Input label="Cost per unit (₹)" type="number" min="0" step="0.01" required {...bind('unitCost')} />
            <Input label="Vendor" {...bind('vendorName')} />
            <Input label="Invoice / bill no." {...bind('invoiceNumber')} />
          </>
        )}
        {mode === 'out' && (
          <>
            <Select label="Issued to" placeholder="—" options={people || []} {...bind('issuedTo')} />
            <Input label="Used at (location)" {...bind('location')} />
          </>
        )}
        <Textarea className="sm:col-span-2" label={mode === 'adjust' ? 'Reason' : 'Purpose / notes'} rows={2} required={mode === 'adjust'} {...bind('reason')} />
      </div>
    </Modal>
  );
}

function ItemsTab({ manager, lowOnly }) {
  const { t } = useT();
  const [f, setF] = useState({ search: '', category: '', low: lowOnly ? 'true' : '', page: 1 });
  const { data, isLoading } = useItems(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const [edit, setEdit] = useState(null);
  const [move, setMove] = useState(null); // { item, mode }
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      <FilterBar cols={3} active={[f.category, f.low].filter(Boolean).length}
        search={<Input aria-label="Search items" placeholder="Search items…" value={f.search} onChange={set('search')} />}>
        <Select aria-label="Category" placeholder="All categories" options={CATEGORIES} value={f.category} onChange={set('category')} />
        <Select aria-label="Stock level" placeholder="All stock levels" options={[{ value: 'true', label: 'At / below reorder level' }]} value={f.low} onChange={set('low')} />
      </FilterBar>
      <Table loading={isLoading} rows={data?.data} empty="No items"
        columns={[
          { key: 'name', header: 'Item', render: (i) => <div><p className="font-medium text-slate-900">{i.name}</p><p className="text-xs text-slate-500">{i.code} · {t(label(i.category))}{i.location ? ` · ${i.location}` : ''}</p></div> },
          { key: 'stock', header: 'In stock', render: (i) => <span className="flex items-center gap-2 font-medium">{qty(i.stock)} {unitText(i.unit)}{i.low && <Badge tone="red">{t('Reorder')}</Badge>}</span> },
          { key: 'reorderLevel', header: 'Reorder at', render: (i) => (i.reorderLevel ? `${qty(i.reorderLevel)} ${unitText(i.unit)}` : '—') },
          { key: 'avgCost', header: 'Avg cost', mobile: false, render: (i) => money(i.avgCost) },
          { key: 'value', header: 'Value', render: (i) => money(i.value) },
          { key: 'act', header: '', render: (i) => manager && (
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" icon={ArrowDownToLine} onClick={() => setMove({ item: i, mode: 'in' })}>In</Button>
              <Button size="sm" variant="secondary" icon={ArrowUpFromLine} onClick={() => setMove({ item: i, mode: 'out' })}>Issue</Button>
              <Button size="sm" variant="ghost" onClick={() => setMove({ item: i, mode: 'adjust' })}>Count</Button>
              <Button size="sm" variant="ghost" onClick={() => setEdit(i)}>Edit</Button>
            </div>
          ) },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
      <ItemModal open={Boolean(edit)} item={edit} onClose={() => setEdit(null)} />
      {move && <MoveModal item={move.item} mode={move.mode} onClose={() => setMove(null)} />}
    </Card>
  );
}

function LedgerTab() {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({ type: '', from: '', to: '', page: 1 });
  const { data, isLoading } = useMovements(Object.fromEntries(Object.entries(f).filter(([, v]) => v)));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));
  return (
    <Card>
      <FilterBar cols={4} active={[f.type, f.from, f.to].filter(Boolean).length}>
        <Select label="Movement" placeholder="All movements" options={[{ value: 'in', label: 'Stock in' }, { value: 'out', label: 'Issued' }, { value: 'adjust', label: 'Adjustments' }]} value={f.type} onChange={set('type')} />
        <Input label="From" type="date" value={f.from} max={f.to || undefined} onChange={set('from')} />
        <Input label="To" type="date" value={f.to} min={f.from || undefined} onChange={set('to')} />
        <Button className="self-end" variant="secondary" icon={Download} onClick={() => downloadFile('/inventory/export', { report: 'ledger', from: f.from, to: f.to }, 'stock-ledger.xlsx').catch((e) => toast.error(e))}>Download Excel</Button>
      </FilterBar>
      <Table loading={isLoading} rows={data?.data} empty="No stock movements"
        columns={[
          { key: 'date', header: 'Date', render: (m) => <div><p>{date(m.date)}</p><p className="text-xs text-slate-400">{dateTime(m.createdAt)}</p></div> },
          { key: 'item', header: 'Item', render: (m) => m.item?.name },
          { key: 'type', header: 'Type', render: (m) => <Badge tone={TYPE_TONES[m.type]}>{m.type === 'out' ? t('Issued') : t(label(m.type))}</Badge> },
          { key: 'qty', header: 'Qty', render: (m) => <span className={m.qty < 0 ? 'text-amber-700' : 'text-emerald-700'}>{m.qty > 0 ? '+' : ''}{qty(m.qty)} {unitText(m.item?.unit)}</span> },
          { key: 'balanceAfter', header: 'Balance', render: (m) => qty(m.balanceAfter) },
          { key: 'value', header: 'Value', render: (m) => money(Math.abs(m.value)) },
          { key: 'party', header: 'Vendor / issued to', className: 'max-w-xs whitespace-normal', render: (m) => [m.vendorName, m.invoiceNumber, m.issuedTo?.name, m.location, m.reason].filter(Boolean).join(' · ') || '—' },
          { key: 'by', header: 'By', mobile: false, render: (m) => m.by?.name || '—' },
        ]} />
      <Pagination meta={data?.meta} onPage={(page) => setF((x) => ({ ...x, page }))} />
    </Card>
  );
}

function ValuationTab() {
  const { t } = useT();
  const toast = useToast();
  const { data, isLoading } = useValuation();
  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
          <StatCard icon={Wallet} label="Stock value" value={money(data.totalValue)} sub="At moving average cost" />
          <StatCard icon={Package} tone="sky" label="Items" value={data.items.length} />
          <StatCard icon={AlertTriangle} tone="red" label="At reorder level" value={data.lowStock} />
        </div>
      )}
      <Card>
        <div className="flex justify-end border-b border-slate-100 p-4">
          <Button variant="secondary" icon={Download} onClick={() => downloadFile('/inventory/export', { report: 'valuation' }, 'stock-valuation.xlsx').catch((e) => toast.error(e))}>Excel</Button>
        </div>
        <Table loading={isLoading} rows={data?.categories} rowKey="category" empty="No stock"
          columns={[
            { key: 'category', header: 'Category', render: (c) => t(label(c.category)) },
            { key: 'items', header: 'Items' },
            { key: 'low', header: 'Low stock', render: (c) => (c.low ? <Badge tone="red">{c.low}</Badge> : 0) },
            { key: 'value', header: 'Value', render: (c) => money(c.value) },
          ]} />
      </Card>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'items';
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <PageHeader title="Inventory" description="Store items, purchases and issues, with reorder alerts and a stock ledger." actions={manager && <Button icon={Plus} onClick={() => setCreating(true)}>New item</Button>} />
      {manager && <Tabs className="mb-4" value={tab} onChange={(v) => setParams({ tab: v })} tabs={[{ value: 'items', label: 'Items' }, { value: 'ledger', label: 'Stock ledger' }, { value: 'valuation', label: 'Valuation' }]} />}
      {tab === 'items' && <ItemsTab manager={manager} lowOnly={params.get('low') === 'true'} />}
      {manager && tab === 'ledger' && <LedgerTab />}
      {manager && tab === 'valuation' && <ValuationTab />}
      <ItemModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
