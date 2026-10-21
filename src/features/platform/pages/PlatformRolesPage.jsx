import { useState } from 'react';
import { Copy, Lock, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Input, Modal, PageLoader, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { PermissionGate } from '../components/PermissionGate';
import { useCreateRole, useDeleteRole, usePermissionCatalogue, usePlatformRoles, useUpdateRole } from '../teamApi';

// Grouped checkboxes with a plain-English line under each permission. Read-only for built-in roles.
function PermissionPicker({ groups, value, onChange, readOnly, grantable }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  const { t } = useT();
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const keys = g.permissions.map((p) => p.key);
        const all = keys.every((k) => value.includes(k));
        return (
          <fieldset key={g.key} className="rounded-lg border border-slate-200">
            <legend className="sr-only">{t(g.label)}</legend>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">{t(g.label)}</p>
              {!readOnly && (
                <button type="button" className="text-xs font-medium text-brand-600 hover:underline"
                  onClick={() => onChange(all ? value.filter((k) => !keys.includes(k)) : [...new Set([...value, ...keys.filter(grantable)])])}>
                  {all ? t('Clear group') : t('Select all')}
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {g.permissions.map((p) => {
                const disabled = readOnly || (!grantable(p.key) && !value.includes(p.key));
                return (
                  <li key={p.key}>
                    <label className={`flex gap-3 px-3 py-2.5 ${disabled ? '' : 'cursor-pointer hover:bg-slate-50'}`}>
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60"
                        checked={value.includes(p.key)} disabled={disabled} onChange={() => toggle(p.key)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">{t(p.label)}</span>
                        <span className="block text-xs text-slate-500">{t(p.description || '')}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}

// role: an existing role to view/edit, or { draft } for a new (possibly duplicated) one.
function RoleEditor({ role, groups, onClose }) {
  const { user } = useAuth();
  const { t } = useT();
  const readOnly = Boolean(role.system);
  const [form, setForm] = useState({ name: role.name || '', description: role.description || '', permissions: role.permissions || [] });
  const create = useCreateRole({ onSuccess: onClose });
  const update = useUpdateRole({ onSuccess: onClose });
  const remove = useDeleteRole({ onSuccess: onClose });
  // Only owners may grant permissions they don't hold themselves (the server checks again).
  const grantable = (key) => user.platformRole === 'super_admin' || user.platformPermissions?.includes(key);
  const err = (create.error || update.error)?.fieldErrors || {};
  const save = () => (role._id ? update.mutate({ id: role._id, ...form }) : create.mutate(form));
  const duplicate = () => setForm({ name: t('{name} (copy)', { name: role.system ? t(role.name) : role.name }), description: role.description || '', permissions: role.permissions });
  const [copying, setCopying] = useState(false);
  const editable = !readOnly || copying;

  return (
    <Modal open onClose={onClose} size="lg"
      title={copying ? 'New custom role' : role._id ? role.name : 'New custom role'}
      description={readOnly && !copying ? 'Built-in roles are read-only. Duplicate one to make a custom role you can change.' : 'Pick what members with this role may see and do.'}
      footer={editable ? (
        <>
          {role._id && !readOnly && <Button variant="ghost" className="mr-auto text-red-600" icon={Trash2} loading={remove.isPending} disabled={role.memberCount > 0}
            onClick={() => window.confirm(t('Delete the role “{name}”?', { name: role.name })) && remove.mutate(role._id)}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending || update.isPending} disabled={form.name.trim().length < 2 || !form.permissions.length}
            onClick={copying ? () => create.mutate(form) : save}>{role._id && !copying ? 'Save role' : 'Create role'}</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button icon={Copy} onClick={() => { duplicate(); setCopying(true); }}>Duplicate as custom role</Button>
        </>
      )}>
      <div className="space-y-4">
        {editable && (
          <div className="grid gap-3">
            <Input label="Role name" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={err.name} />
            <Textarea label="Description" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        )}
        {role._id && !readOnly && role.memberCount > 0 && <p className="text-xs text-slate-500">{role.memberCount === 1 ? t('{n} member has this role, so it can’t be deleted. Changes apply to them straight away.', { n: role.memberCount }) : t('{n} members have this role, so it can’t be deleted. Changes apply to them straight away.', { n: role.memberCount })}</p>}
        <PermissionPicker groups={groups} value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} readOnly={!editable} grantable={grantable} />
        {err.permissions && <p className="text-sm text-red-600">{t(err.permissions)}</p>}
      </div>
    </Modal>
  );
}

function RolesList() {
  const { data: roles, isLoading } = usePlatformRoles();
  const { data: catalogue } = usePermissionCatalogue();
  const [open, setOpen] = useState(null);
  const { t } = useT();
  if (isLoading || !catalogue) return <PageLoader />;
  const total = catalogue.groups.reduce((n, g) => n + g.permissions.length, 0);
  const labels = Object.fromEntries(catalogue.groups.flatMap((g) => g.permissions.map((p) => [p.key, p.label])));

  return (
    <div>
      <PageHeader title="Roles & permissions" description="A role is a set of permissions. Built-in roles stay as they are; make a custom role for anything in between."
        actions={<Button icon={Plus} onClick={() => setOpen({ permissions: [] })}>New role</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => (
          <Card key={r._id} className="flex flex-col">
            <CardHeader title={r.name} subtitle={r.description}
              action={r.system ? <Badge><Lock className="mr-1 size-3" />{t('Built in')}</Badge> : <Badge tone="blue">{t('Custom')}</Badge>} />
            <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
              <p className="text-xs text-slate-500">{r.permissions.length === total ? t('Every permission') : r.permissions.length === 1 ? t('{n} permission', { n: 1 }) : t('{n} permissions', { n: r.permissions.length })} · {r.memberCount === 1 ? t('{n} member', { n: 1 }) : t('{n} members', { n: r.memberCount })}</p>
              <div className="flex flex-wrap gap-1">
                {r.permissions.length === total ? <Badge tone="brand">{t('All permissions')}</Badge> : r.permissions.slice(0, 6).map((p) => <Badge key={p}>{labels[p] ? t(labels[p]) : p}</Badge>)}
                {r.permissions.length !== total && r.permissions.length > 6 && <Badge>{t('+{n} more', { n: r.permissions.length - 6 })}</Badge>}
              </div>
              <div className="mt-auto pt-1">
                <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>{r.system ? 'View' : 'Edit'}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {open && <RoleEditor role={open} groups={catalogue.groups} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function PlatformRolesPage() {
  return (
    <PermissionGate permission="team.manage">
      <RolesList />
    </PermissionGate>
  );
}
