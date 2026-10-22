import { useState } from 'react';
import { ChevronRight, Download, KeyRound, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, FilterBar, Input, Modal, Pagination, Select, Spinner, StatusBadge, Table, Tabs, Textarea } from '../../../components/ui';
import { date, label, money, toPaise } from '../../../lib/format';
import { PermissionGate } from '../../platform/components/PermissionGate';
import { CYCLE_OPTIONS } from '../../platform/lib';
import {
  downloadText, keysCsv, useAddResellerAdmin, useCreateReseller, useGenerateKeys, useMarkResellerInvoicePaid, usePlatformRevokeKey, useRemoveResellerAdmin,
  useReseller, useResellerInvoices, useResellerKeys, useResellers, useUpdateReseller, useUploadLogo,
} from '../api';
import { KeyStatusBadge, termText } from '../components/KeyBits';
import { useT } from '../../../context/LanguageContext';
import { ResellerTemplatesPanel } from '../../appearance/components/PlatformPanels';

const PLAN_OPTIONS = ['basic', 'standard', 'premium'].map((p) => ({ value: p, label: label(p) }));
const KEY_COUNT_LABELS = { unused: 'Unused keys', active: 'Active keys', revoked: 'Revoked keys' };

function BrandForm({ initial, onSave, saving, submitLabel = 'Save' }) {
  const { t } = useT();
  const [v, setV] = useState({
    name: initial?.name || '',
    appName: initial?.brand?.appName || '',
    primaryColor: initial?.brand?.primaryColor || '#0f766e',
    supportEmail: initial?.brand?.supportEmail || '',
    supportPhone: initial?.brand?.supportPhone || '',
    customDomain: initial?.brand?.customDomain || '',
    contactName: initial?.contact?.name || '',
    contactEmail: initial?.contact?.email || '',
    contactPhone: initial?.contact?.phone || '',
    notes: initial?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = () =>
    onSave(
      {
        name: v.name,
        brand: { appName: v.appName, primaryColor: v.primaryColor, supportEmail: v.supportEmail, supportPhone: v.supportPhone, customDomain: v.customDomain },
        contact: { name: v.contactName, email: v.contactEmail, phone: v.contactPhone },
        notes: v.notes || undefined,
      },
      { onError: (e) => setErrors(e.fieldErrors || {}) },
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Reseller name" required value={v.name} onChange={set('name')} error={errors.name} />
      <Input label="App name shown to societies" placeholder="e.g. SmartNest Living" value={v.appName} onChange={set('appName')} error={errors['brand.appName']} />
      <div className="flex items-end gap-2">
        <Input className="flex-1" label="Brand colour" value={v.primaryColor} onChange={set('primaryColor')} error={errors['brand.primaryColor']} />
        <input type="color" aria-label={t('Pick brand colour')} className="h-10 w-12 rounded border border-slate-200" value={/^#[0-9a-fA-F]{6}$/.test(v.primaryColor) ? v.primaryColor : '#4f46e5'} onChange={set('primaryColor')} />
      </div>
      <Input label="Custom domain" placeholder="app.partner.in" hint="Host name only; point it at the web app" value={v.customDomain} onChange={set('customDomain')} error={errors['brand.customDomain']} />
      <Input label="Support email" type="email" value={v.supportEmail} onChange={set('supportEmail')} error={errors['brand.supportEmail']} />
      <Input label="Support phone" value={v.supportPhone} onChange={set('supportPhone')} />
      <Input label="Contact person" value={v.contactName} onChange={set('contactName')} />
      <Input label="Contact email" type="email" value={v.contactEmail} onChange={set('contactEmail')} error={errors['contact.email']} />
      <Textarea className="sm:col-span-2" rows={2} label="Internal notes" value={v.notes} onChange={set('notes')} />
      <div className="sm:col-span-2"><Button loading={saving} disabled={v.name.trim().length < 2} onClick={submit}>{submitLabel}</Button></div>
    </div>
  );
}

// Full keys are only in this response: show them once, offer the CSV, then forget them.
function NewKeysModal({ result, reseller, onClose }) {
  const { t } = useT();
  const csv = keysCsv(result.keys, result);
  return (
    <Modal open onClose={onClose} title={t('{n} new licence keys', { n: result.keys.length })} description="Copy or download them now. They are stored hashed and cannot be shown again."
      footer={<><Button variant="secondary" onClick={onClose}>Done</Button><Button icon={Download} onClick={() => downloadText(`${reseller.slug}-${result.batch}.csv`, csv)}>Download CSV</Button></>}>
      <p className="mb-2 text-sm text-slate-600">{t(label(result.plan))} · {termText(result, t)}{result.invoice ? ` · ${t('invoice {number} for {total}', { number: result.invoice.number, total: money(result.invoice.total) })}` : ''}</p>
      <textarea readOnly className="h-56 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm" value={result.keys.join('\n')} onFocus={(e) => e.target.select()} />
    </Modal>
  );
}

function GenerateKeys({ reseller }) {
  const [v, setV] = useState({ count: 10, plan: 'standard', cycle: 'yearly', validityMonths: '', pricePerKey: '' });
  const [result, setResult] = useState(null);
  const gen = useGenerateKeys(reseller._id, { onSuccess: setResult });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      <Input label="How many" type="number" min={1} max={500} value={v.count} onChange={set('count')} />
      <Select label="Plan" options={PLAN_OPTIONS} value={v.plan} onChange={set('plan')} />
      <Select label="Term" options={CYCLE_OPTIONS} value={v.cycle} onChange={set('cycle')} />
      {v.cycle === 'one_time' ? <Input label="Validity (months)" type="number" min={1} max={120} hint="Blank = lifetime" value={v.validityMonths} onChange={set('validityMonths')} /> : <div className="hidden sm:block" />}
      <Input label="Price per key (₹)" type="number" min={0} step="0.01" hint="Raises a key-pack invoice" value={v.pricePerKey} onChange={set('pricePerKey')} />
      <div className="sm:col-span-5">
        <Button icon={KeyRound} loading={gen.isPending} onClick={() => gen.mutate({ count: Number(v.count), plan: v.plan, cycle: v.cycle, validityMonths: v.cycle === 'one_time' && v.validityMonths ? Number(v.validityMonths) : null, pricePerKey: v.pricePerKey ? toPaise(v.pricePerKey) : 0 })}>Generate keys</Button>
      </div>
      {result && <NewKeysModal result={result} reseller={reseller} onClose={() => setResult(null)} />}
    </div>
  );
}

function KeysTab({ reseller }) {
  const { t } = useT();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useResellerKeys(reseller._id, { status: status || undefined, page });
  const revoke = usePlatformRevokeKey(reseller._id);
  return (
    <div className="space-y-4">
      <GenerateKeys reseller={reseller} />
      <div className="flex justify-end"><Select className="w-36" aria-label="Key status" placeholder="All keys" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={['unused', 'active', 'revoked'].map((x) => ({ value: x, label: label(x) }))} /></div>
      <Table loading={isLoading} rows={data?.data} empty="No keys yet"
        columns={[
          { key: 'last4', header: 'Key', render: (k) => <span className="font-mono">CH-••••-••••-{k.last4}</span> },
          { key: 'plan', header: 'Plan', render: (k) => `${t(label(k.plan))} · ${termText(k, t)}` },
          { key: 'status', header: 'Status', render: (k) => <KeyStatusBadge status={k.status} /> },
          { key: 'society', header: 'Society', render: (k) => k.activatedSociety?.name || '—' },
          { key: 'expiresAt', header: 'Paid until', mobile: false, render: (k) => (k.expiresAt ? date(k.expiresAt) : '—') },
          { key: 'actions', header: '', render: (k) => k.status === 'unused' && <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === k._id} onClick={() => window.confirm(t('Revoke this unused key? It can no longer be activated.')) && revoke.mutate(k._id)}>Revoke</Button> },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </div>
  );
}

function AdminsTab({ reseller }) {
  const { t } = useT();
  const [v, setV] = useState({ name: '', email: '', password: '' });
  const add = useAddResellerAdmin(reseller._id, { onSuccess: () => setV({ name: '', email: '', password: '' }) });
  const remove = useRemoveResellerAdmin(reseller._id);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
        {!reseller.admins.length && <li className="px-3 py-2 text-slate-500">{t('No admin logins yet')}</li>}
        {reseller.admins.map((a) => (
          <li key={a._id} className="flex items-center justify-between gap-2 px-3 py-2">
            <span>{a.name} <span className="text-slate-500">· {a.email}</span></span>
            <Button size="sm" variant="ghost" onClick={() => window.confirm(t("Remove {name}'s reseller access?", { name: a.name })) && remove.mutate(a._id)}>Remove</Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Name" value={v.name} onChange={set('name')} />
        <Input label="Email" type="email" value={v.email} onChange={set('email')} />
        <Input label="Password" type="password" autoComplete="new-password" hint="Needed for a new login" value={v.password} onChange={set('password')} />
        <div className="sm:col-span-3"><Button size="sm" loading={add.isPending} disabled={!v.name || !v.email} onClick={() => add.mutate({ name: v.name, email: v.email, password: v.password || undefined })}>Add admin login</Button></div>
      </div>
      <p className="text-xs text-slate-500">{t('Reseller admins sign in at the normal login page and see only this reseller’s keys, societies and invoices.')}</p>
    </div>
  );
}

function InvoicesTab({ reseller }) {
  const { t } = useT();
  const { data, isLoading } = useResellerInvoices(reseller._id);
  const markPaid = useMarkResellerInvoicePaid();
  return (
    <Table loading={isLoading} rows={data?.data} empty="No key-pack invoices"
      columns={[
        { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium">{i.number}</span> },
        { key: 'keys', header: 'Keys', render: (i) => `${i.keys} × ${money(i.pricePerKey)}` },
        { key: 'total', header: 'Total incl. GST', render: (i) => money(i.total) },
        { key: 'createdAt', header: 'Date', render: (i) => date(i.createdAt) },
        { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
        { key: 'actions', header: '', render: (i) => i.status === 'unpaid' && <Button size="sm" variant="ghost" loading={markPaid.isPending} onClick={() => { const ref = window.prompt(t('Bank reference (UTR) for this payment')); if (ref !== null) markPaid.mutate({ id: i._id, method: 'bank', reference: ref || undefined }); }}>Mark paid</Button> },
      ]} />
  );
}

function ResellerModal({ id, onClose }) {
  const { t } = useT();
  const { data: r, isLoading } = useReseller(id);
  const [tab, setTab] = useState('keys');
  const update = useUpdateReseller(id);
  const logo = useUploadLogo(id);
  if (isLoading || !r) return <Modal open onClose={onClose} title="Reseller"><div className="flex justify-center py-10"><Spinner /></div></Modal>;
  return (
    <Modal open onClose={onClose} size="lg" title={r.name} description={`?brand=${r.slug}${r.brand?.customDomain ? ` · ${r.brand.customDomain}` : ''} · ${t('{n} keys bought', { n: r.keysPurchased })}`}
      footer={r.status === 'active'
        ? <Button variant="danger" loading={update.isPending} onClick={() => window.confirm(t('Suspend this reseller? Its societies fall back to ColonyHub branding and its keys stop working.')) && update.mutate({ status: 'suspended' })}>Suspend reseller</Button>
        : <Button variant="success" loading={update.isPending} onClick={() => update.mutate({ status: 'active' })}>Reactivate reseller</Button>}>
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-3 gap-3">
          {['unused', 'active', 'revoked'].map((k) => <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{t(KEY_COUNT_LABELS[k])}</p><p className="text-lg font-semibold">{r.keys[k]}</p></div>)}
        </div>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'keys', label: 'Keys' }, { value: 'brand', label: 'Brand' }, { value: 'societies', label: 'Societies', count: r.societies.length }, { value: 'admins', label: 'Admins' }, { value: 'invoices', label: 'Invoices' }]} />
        {tab === 'keys' && <KeysTab reseller={r} />}
        {tab === 'brand' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {r.brand?.logoUrl ? <img src={r.brand.logoUrl} alt="" className="size-12 rounded border border-slate-200 object-contain" /> : <div className="size-12 rounded border border-dashed border-slate-300" />}
              <label className="cursor-pointer text-sm font-medium text-brand-600 hover:underline">
                {logo.isPending ? t('Uploading…') : t('Upload logo (PNG/JPG/WEBP, 1 MB)')}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && logo.mutate(e.target.files[0])} />
              </label>
            </div>
            <BrandForm key={r.updatedAt} initial={r} saving={update.isPending} onSave={(b, o) => update.mutate(b, o)} />
            <ResellerTemplatesPanel key={`tpl-${r.updatedAt}`} resellerId={r._id} />
          </div>
        )}
        {tab === 'societies' && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {!r.societies.length && <li className="px-3 py-2 text-slate-500">{t('No society has used a key yet')}</li>}
            {r.societies.map((x) => <li key={x._id} className="flex justify-between gap-2 px-3 py-2"><span>{x.name} <span className="text-slate-500">· {x.city || x.code}</span></span><Badge tone="brand">{t(label(x.plan?.name || 'free'))}</Badge></li>)}
          </ul>
        )}
        {tab === 'admins' && <AdminsTab reseller={r} />}
        {tab === 'invoices' && <InvoicesTab reseller={r} />}
      </div>
    </Modal>
  );
}

function ResellersList() {
  const { t } = useT();
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useResellers({ search: filters.search || undefined, status: filters.status || undefined, page: filters.page });
  const create = useCreateReseller({ onSuccess: (r) => { setCreating(false); setOpenId(r._id); } });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  return (
    <div>
      <PageHeader title="White-label resellers" description="Partners who sell ColonyHub under their own brand with licence keys." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New reseller</Button>} />
      <Card>
        <FilterBar cols={2} active={filters.status ? 1 : 0} search={<Input aria-label="Search resellers" placeholder="Search name" value={filters.search} onChange={set('search')} />}>
          <Select aria-label="Status" placeholder="Any status" value={filters.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        </FilterBar>
        <Table loading={isLoading} rows={data?.data} empty="No resellers yet" onRowClick={(r) => setOpenId(r._id)}
          columns={[
            { key: 'name', header: 'Reseller', render: (r) => <div><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.brand?.appName || r.name} · ?brand={r.slug}</p></div> },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'green' : 'red'}>{t(label(r.status))}</Badge> },
            { key: 'keys', header: 'Keys used / bought', render: (r) => `${r.keys.active} / ${r.keysPurchased}` },
            { key: 'unused', header: 'Unused', mobile: false, render: (r) => r.keys.unused },
            { key: 'colour', header: 'Colour', mobile: false, render: (r) => (r.brand?.primaryColor ? <span className="inline-block size-4 rounded" style={{ background: r.brand.primaryColor }} /> : '—') },
            { key: 'open', header: '', className: 'w-8 text-right', mobile: false, render: () => <ChevronRight className="ml-auto size-4 text-slate-400" aria-hidden="true" /> },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {creating && (
        <Modal open onClose={() => setCreating(false)} size="lg" title="New reseller">
          <BrandForm saving={create.isPending} submitLabel="Create reseller" onSave={(b, o) => create.mutate(b, o)} />
        </Modal>
      )}
      {openId && <ResellerModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default function PlatformResellersPage() {
  return (
    <PermissionGate permission="whitelabel.manage">
      <ResellersList />
    </PermissionGate>
  );
}

