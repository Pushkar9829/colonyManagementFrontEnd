import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, Input, Modal, Pagination, Select, Spinner, Table, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { date, label, money } from '../../../lib/format';
import { isFinance } from '../../../lib/roles';
import { AccountSelect, Amount } from '../../accounting/components/common';
import { useCreateVendor, useUpdateVendor, useVendor, useVendorStatement, useVendors } from '../api';
import { TDS_SECTIONS, VENDOR_CATEGORIES } from '../constants';

const EMPTY = {
  name: '', category: 'other', contactPerson: '', phone: '', email: '', gstin: '', pan: '', address: '',
  defaultAccount: '5900', tdsSection: '', tdsRate: '', notes: '', active: true,
  accountName: '', accountNumber: '', ifsc: '', bankName: '', upi: '',
};

function VendorForm({ vendor, onClose }) {
  const [v, setV] = useState(() => (vendor ? {
    ...EMPTY, ...Object.fromEntries(Object.entries(vendor).filter(([k]) => k in EMPTY).map(([k, x]) => [k, x ?? ''])),
    tdsRate: vendor.tdsRate ? String(vendor.tdsRate) : '', ...(vendor.bank || {}),
  } : EMPTY));
  const [errors, setErrors] = useState({});
  const create = useCreateVendor({ onSuccess: onClose });
  const update = useUpdateVendor({ onSuccess: onClose });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const opt = (x) => (x === '' ? undefined : x);
  const submit = () => {
    const bank = Object.fromEntries(['accountName', 'accountNumber', 'ifsc', 'bankName', 'upi'].map((k) => [k, opt(v[k])]).filter(([, x]) => x !== undefined));
    // masked numbers (XXXX1234) are display-only; leave the stored number alone
    if (bank.accountNumber?.startsWith('XXXX')) delete bank.accountNumber;
    const body = {
      name: v.name, category: v.category, contactPerson: opt(v.contactPerson), phone: opt(v.phone), email: opt(v.email), gstin: opt(v.gstin), pan: opt(v.pan),
      address: opt(v.address), defaultAccount: opt(v.defaultAccount), tdsSection: opt(v.tdsSection), tdsRate: v.tdsRate === '' ? 0 : Number(v.tdsRate), notes: opt(v.notes),
      bank: Object.keys(bank).length ? bank : undefined, ...(vendor && { active: v.active }),
    };
    const onError = (err) => setErrors(err.fieldErrors || {});
    if (vendor) update.mutate({ id: vendor._id, ...body }, { onError });
    else create.mutate(body, { onError });
  };
  return (
    <Modal open onClose={onClose} size="lg" title={vendor ? `Edit ${vendor.name}` : 'Add vendor'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Name" required value={v.name} onChange={set('name')} error={errors.name} />
        <Select label="Category" options={VENDOR_CATEGORIES} value={v.category} onChange={set('category')} />
        <AccountSelect label="Default expense account" types={['expense']} value={v.defaultAccount} onChange={set('defaultAccount')} error={errors.defaultAccount} />
        <Input label="Contact person" value={v.contactPerson} onChange={set('contactPerson')} />
        <Input label="Phone" value={v.phone} onChange={set('phone')} error={errors.phone} />
        <Input label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} />
        <Input label="GSTIN" value={v.gstin} onChange={set('gstin')} error={errors.gstin} placeholder="27ABCDE1234F1Z5" />
        <Input label="PAN" value={v.pan} onChange={set('pan')} error={errors.pan} placeholder="ABCDE1234F" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="TDS section" placeholder="No TDS" options={TDS_SECTIONS} value={v.tdsSection} onChange={set('tdsSection')} />
          <Input label="TDS %" type="number" min={0} max={30} step="0.01" value={v.tdsRate} onChange={set('tdsRate')} error={errors.tdsRate} />
        </div>
        <Textarea className="sm:col-span-2" rows={2} label="Address" value={v.address} onChange={set('address')} />
        <p className="text-sm font-medium text-slate-700 sm:col-span-2">Bank details for payments</p>
        <Input label="Account name" value={v.accountName} onChange={set('accountName')} />
        <Input label="Account number" value={v.accountNumber} onChange={set('accountNumber')} error={errors['bank.accountNumber']} />
        <Input label="IFSC" value={v.ifsc} onChange={set('ifsc')} error={errors['bank.ifsc']} />
        <Input label="Bank" value={v.bankName} onChange={set('bankName')} />
        <Input label="UPI id" value={v.upi} onChange={set('upi')} error={errors['bank.upi']} />
        <Textarea className="sm:col-span-2" rows={2} label="Internal notes" value={v.notes} onChange={set('notes')} />
        {vendor && <Checkbox className="sm:col-span-2" label="Active (inactive vendors cannot receive new bills)" checked={v.active} onChange={set('active')} />}
      </div>
    </Modal>
  );
}

function VendorDetail({ id, onClose, onEdit, finance }) {
  const { data: v } = useVendor(id);
  const { data: st, isLoading } = useVendorStatement(id, {}, finance);
  return (
    <Modal open onClose={onClose} size="lg" title={v?.name || 'Vendor'} description={v && `${label(v.category)}${v.gstin ? ` · GSTIN ${v.gstin}` : ''}`}
      footer={finance && v && <Button variant="secondary" icon={Pencil} onClick={() => onEdit(v)}>Edit</Button>}>
      {!v ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[['Contact', [v.contactPerson, v.phone, v.email].filter(Boolean).join(' · ')], ['PAN', v.pan], ['TDS', v.tdsRate ? `${v.tdsRate}% (${v.tdsSection || 'section not set'})` : 'None'],
              ['Default account', v.defaultAccount], ['Bank', v.bank ? [v.bank.bankName, v.bank.accountNumber, v.bank.ifsc].filter(Boolean).join(' · ') : ''], ['UPI', v.bank?.upi], ['Address', v.address]]
              .filter(([, x]) => x).map(([k, x]) => (
                <div key={k}><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="mt-0.5 text-slate-900">{x}</dd></div>
              ))}
          </dl>
          {finance && (isLoading ? <Spinner /> : st && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-900">Statement</h4>
                <span className="text-sm text-slate-600">Billed {money(st.billed)} · Paid {money(st.paid)} · Outstanding <b>{money(st.outstanding)}</b></span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Document</th><th className="px-3 py-2 text-right">Billed</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {st.rows.map((r) => (
                      <tr key={`${r.type}-${r.id}`}>
                        <td className="px-3 py-2 whitespace-nowrap">{date(r.date)}</td>
                        <td className="px-3 py-2"><span className="font-mono text-xs">{r.number}</span> <span className="text-slate-500">{r.description}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.billed ? money(r.billed) : ''}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.paid ? money(r.paid) : ''}</td>
                        <td className="px-3 py-2 text-right"><Amount value={r.balance} /></td>
                      </tr>
                    ))}
                    {!st.rows.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">No bills or payments yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function VendorsPage() {
  const { user } = useAuth();
  const finance = isFinance(user);
  const [filters, setFilters] = useState({ search: '', category: '', active: 'true', page: 1 });
  const { data, isLoading } = useVendors(Object.fromEntries(Object.entries(filters).filter(([, x]) => x !== '')));
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  return (
    <div>
      <PageHeader title="Vendors" description="Suppliers and contractors the society pays, with tax and bank details."
        actions={finance && <Button icon={Plus} onClick={() => setEditing({})}>Add vendor</Button>} />
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <Input placeholder="Search name, phone, GSTIN" value={filters.search} onChange={set('search')} />
          <Select placeholder="All categories" options={VENDOR_CATEGORIES} value={filters.category} onChange={set('category')} />
          <Select placeholder="Active and inactive" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} value={filters.active} onChange={set('active')} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty="No vendors yet" onRowClick={(v) => setViewing(v._id)}
          columns={[
            { key: 'name', header: 'Vendor', render: (v) => <div><p className="font-medium text-slate-900">{v.name}</p><p className="text-xs text-slate-500">{[v.contactPerson, v.phone].filter(Boolean).join(' · ')}</p></div> },
            { key: 'category', header: 'Category', render: (v) => label(v.category) },
            { key: 'gstin', header: 'GSTIN', render: (v) => <span className="font-mono text-xs">{v.gstin || '—'}</span> },
            { key: 'bank', header: 'Bank a/c', render: (v) => <span className="font-mono text-xs">{v.bank?.accountNumber || '—'}</span> },
            { key: 'tds', header: 'TDS', render: (v) => (v.tdsRate ? `${v.tdsRate}%` : '—') },
            ...(finance ? [{ key: 'outstanding', header: 'Outstanding', className: 'text-right', render: (v) => (v.outstanding ? <span className="font-medium text-slate-900">{money(v.outstanding)}</span> : <span className="text-slate-400">—</span>) }] : []),
            { key: 'active', header: '', render: (v) => (v.active ? null : <Badge>Inactive</Badge>) },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {editing && <VendorForm vendor={editing._id ? editing : null} onClose={() => setEditing(null)} />}
      {viewing && <VendorDetail id={viewing} finance={finance} onClose={() => setViewing(null)} onEdit={(v) => { setViewing(null); setEditing(v); }} />}
    </div>
  );
}
