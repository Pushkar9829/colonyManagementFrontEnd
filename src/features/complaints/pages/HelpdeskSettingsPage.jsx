import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Modal, Select, Spinner } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { label } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useCategories, useCreateCategory, useCreateRule, useDeleteRule, useEscalationRules, useEscalationUsers, useUpdateCategory, useUpdateRule } from '../api';
import { PRIORITIES } from '../constants';

const ROLE_OPTIONS = [
  { value: 'facility_manager', label: 'Facility managers' },
  { value: 'admin', label: 'Admins / committee' },
  { value: 'staff', label: 'All staff' },
  { value: 'accountant', label: 'Accountants' },
];
// "Straight away", "After 2 hours", "After 1 day" — escalation delays in words.
const afterWords = (h, t) => {
  const n = Number(h) || 0;
  if (n === 0) return t('Straight away');
  if (n % 24 === 0) return t(n === 24 ? 'After {n} day' : 'After {n} days', { n: n / 24 });
  return t(n === 1 ? 'After {n} hour' : 'After {n} hours', { n });
};
const ROLE_WORDS = { facility_manager: 'Facility manager', admin: 'Admin', staff: 'All staff', accountant: 'Accountant' };
const splitKeywords = (text) => text.split(',').map((k) => k.trim()).filter(Boolean);

function CategoryModal({ category, onClose }) {
  const { t } = useT();
  const editing = Boolean(category?.key);
  const [name, setName] = useState(category?.name || '');
  const [keywords, setKeywords] = useState((category?.customKeywords || []).join(', '));
  const [photos, setPhotos] = useState(category?.requiresResolutionPhotos || false);
  const create = useCreateCategory({ onSuccess: onClose });
  const update = useUpdateCategory({ onSuccess: onClose });
  const save = () => {
    const body = { keywords: splitKeywords(keywords), requiresResolutionPhotos: photos };
    if (editing) update.mutate({ key: category.key, ...body, ...(category.isDefault ? {} : { name }) });
    else create.mutate({ name, ...body });
  };
  return (
    <Modal open onClose={onClose} title={editing ? t('Edit {name}', { name: category.name }) : 'New category'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Name" required disabled={category?.isDefault} value={name} onChange={(e) => setName(e.target.value)} hint={category?.isDefault ? 'Built-in categories keep their name' : undefined} />
        <Input label="Keywords for the suggestion" value={keywords} onChange={(e) => setKeywords(e.target.value)} hint="Comma separated, e.g. termite, rodent. When a title contains one, the form suggests this category." />
        {category?.isDefault && <p className="text-xs text-slate-500">{t('Built-in keywords: {list}', { list: (category.keywords || []).filter((k) => !(category.customKeywords || []).includes(k)).join(', ') || '—' })}</p>}
        <Checkbox label="Require before/after photos to resolve" checked={photos} onChange={(e) => setPhotos(e.target.checked)} />
      </div>
    </Modal>
  );
}

function Categories({ isAdmin }) {
  const { t } = useT();
  const { data = [], isLoading } = useCategories(true);
  const update = useUpdateCategory();
  const [editing, setEditing] = useState(null);
  return (
    <Card>
      <CardHeader title="Complaint categories" subtitle={isAdmin ? 'Built-in categories plus your own. Keywords drive the suggested category on the complaint form.' : 'Only admins can change categories.'}
        action={isAdmin && <Button size="sm" icon={Plus} onClick={() => setEditing({})}>Add</Button>} />
      {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <ul className="divide-y divide-slate-100">
          {data.map((c) => (
            <li key={c.key} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  {c.isDefault ? <Badge>{t('Built-in')}</Badge> : <Badge tone="brand">{t('Custom')}</Badge>}
                  {c.requiresResolutionPhotos && <Badge tone="amber">{t('Photos on resolve')}</Badge>}
                  {!c.active && <Badge tone="red">{t('Hidden')}</Badge>}
                </div>
                <p className="truncate text-xs text-slate-500">{c.keywords.join(', ') || t('No keywords')}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                  {c.key !== 'other' && <Button size="sm" variant="ghost" onClick={() => update.mutate({ key: c.key, active: !c.active })}>{c.active ? 'Hide' : 'Show'}</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <CategoryModal category={editing.key ? editing : null} onClose={() => setEditing(null)} />}
    </Card>
  );
}

const blankLevels = () => [
  { level: 1, afterHours: 0, roles: ['facility_manager'], users: [], notifyAssignee: true },
  { level: 2, afterHours: 24, roles: ['admin'], users: [], notifyAssignee: false },
  { level: 3, afterHours: 48, roles: ['admin'], users: [], notifyAssignee: false },
];

function RuleModal({ rule, categories, onClose }) {
  const { t } = useT();
  const editing = Boolean(rule?._id);
  const [category, setCategory] = useState(rule?.category || '');
  const [priority, setPriority] = useState(rule?.priority || '');
  const [levels, setLevels] = useState(rule?.levels?.map((l) => ({ ...l, users: (l.users || []).map((u) => u._id || u) })) || blankLevels());
  const { data: people = [] } = useEscalationUsers(true);
  const create = useCreateRule({ onSuccess: onClose });
  const update = useUpdateRule({ onSuccess: onClose });
  const setLevel = (i, patch) => setLevels((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const body = { levels: levels.map((l) => ({ ...l, afterHours: Number(l.afterHours) })) };
  return (
    <Modal open onClose={onClose} title={editing ? 'Edit alert rule' : 'New alert rule'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending}
        onClick={() => (editing ? update.mutate({ id: rule._id, ...body }) : create.mutate({ category: category || null, priority: priority || null, ...body }))}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Category" disabled={editing} placeholder="Any category" options={categories.map((c) => ({ value: c.key, label: c.name }))} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Select label="Priority" disabled={editing} placeholder="Any priority" options={PRIORITIES} value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
        {levels.map((l, i) => (
          <div key={l.level} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{t('Alert {n}', { n: l.level })}</p>
              {i === levels.length - 1 && levels.length > 1 && <button type="button" className="text-slate-400 hover:text-red-600" aria-label={t('Remove level')} onClick={() => setLevels((ls) => ls.slice(0, -1))}><Trash2 className="size-4" /></button>}
            </div>
            <Input className="mt-2 max-w-xs" label="Hours after the deadline is missed" hint="0 = straight away" type="number" min={0} value={l.afterHours} onChange={(e) => setLevel(i, { afterHours: e.target.value })} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {ROLE_OPTIONS.map((r) => <Checkbox key={r.value} label={r.label} checked={l.roles.includes(r.value)} onChange={() => setLevel(i, { roles: toggle(l.roles, r.value) })} />)}
              <Checkbox label="Assignee" checked={Boolean(l.notifyAssignee)} onChange={(e) => setLevel(i, { notifyAssignee: e.target.checked })} />
            </div>
            <Select className="mt-2" label="Also notify" placeholder="Add a person…" value=""
              options={people.filter((p) => !l.users.includes(p.user)).map((p) => ({ value: p.user, label: `${p.name}${p.designation ? ` · ${p.designation}` : ` · ${t(label(p.role))}`}` }))}
              onChange={(e) => e.target.value && setLevel(i, { users: [...l.users, e.target.value] })} />
            {l.users.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {l.users.map((u) => (
                  <button key={u} type="button" onClick={() => setLevel(i, { users: l.users.filter((x) => x !== u) })}>
                    <Badge tone="brand">{people.find((p) => p.user === u)?.name || t('Member')} ×</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {levels.length < 3 && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setLevels((ls) => [...ls, { level: ls.length + 1, afterHours: (Number(ls.at(-1)?.afterHours) || 0) + 24, roles: ['admin'], users: [], notifyAssignee: false }])}>Add level</Button>}
      </div>
    </Modal>
  );
}

function EscalationMatrix({ categories }) {
  const { t } = useT();
  const { data, isLoading } = useEscalationRules();
  const remove = useDeleteRule();
  const [editing, setEditing] = useState(null);
  const name = (key) => categories.find((c) => c.key === key)?.name || t(label(key));
  const describe = (levels) => levels.map((l) => {
    const who = [...l.roles.map((r) => t(ROLE_WORDS[r] || label(r))), ...(l.users || []).map((u) => u.name || t('member')), ...(l.notifyAssignee ? [t('assignee')] : [])];
    return `${afterWords(l.afterHours, t)}: ${who.join(', ') || t('nobody')}`;
  });
  return (
    <Card>
      <CardHeader title="Who gets alerted when a complaint is late" subtitle="When a complaint misses its target time, these people are told — first straight away, then again if it is still open later. A rule for a specific category or priority wins over a general one."
        action={<Button size="sm" icon={Plus} onClick={() => setEditing({})}>Add rule</Button>} />
      {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <ul className="divide-y divide-slate-100">
          {data.rules.map((r) => (
            <li key={r._id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{r.category ? name(r.category) : t('Any category')} · {r.priority ? t(label(r.priority)) : t('any priority')} {!r.active && <Badge tone="red">{t('Off')}</Badge>}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-500">{describe(r.levels).map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => window.confirm(t('Remove this rule?')) && remove.mutate(r._id)}>Remove</Button>
              </div>
            </li>
          ))}
          <li className="bg-slate-50 px-5 py-3">
            <p className="text-sm font-medium text-slate-700">{t('Standard alerts (when no rule above matches)')}</p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-500">{describe(data.defaults).map((d) => <li key={d}>{d}</li>)}</ul>
          </li>
        </ul>
      )}
      {!isLoading && !data?.rules.length && <EmptyState title="No custom rules yet — the standard alerts apply" />}
      {editing && <RuleModal rule={editing._id ? editing : null} categories={categories} onClose={() => setEditing(null)} />}
    </Card>
  );
}

export default function HelpdeskSettingsPage() {
  const { user } = useAuth();
  const { t } = useT();
  const { data: categories = [] } = useCategories(true);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/complaints" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> {t('Helpdesk')}</Link>
      <PageHeader title="Complaint settings" description="Who is alerted when a complaint is late, and the complaint categories." />
      <EscalationMatrix categories={categories} />
      <Categories isAdmin={user.role === ROLES.ADMIN} />
    </div>
  );
}
