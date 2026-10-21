import { useState } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, FilterBar, Input, Modal, Pagination, Select, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { timeAgo } from '../../../lib/format';
import { PermissionGate } from '../components/PermissionGate';
import { useChangeMemberRole, useInviteMember, usePlatformRoles, usePlatformTeam, useRemoveMember, useSetMemberActive } from '../teamApi';

// Built-in role names are translated; custom ones are what the team typed.
const roleOptions = (roles = [], t) => roles.map((r) => ({ value: r._id, label: r.system ? t(r.name) : t('{name} (custom)', { name: r.name }) }));

function InviteModal({ roles, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', roleId: '' });
  const [link, setLink] = useState(null);
  const toast = useToast();
  const { t } = useT();
  const invite = useInviteMember({
    onSuccess: (r) => (r.inviteLink ? setLink(r.inviteLink) : onClose()),
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const err = invite.error?.fieldErrors || {};

  if (link) {
    return (
      <Modal open onClose={onClose} title="Invitation sent" footer={<Button onClick={onClose}>Done</Button>}>
        <div className="space-y-3 text-sm text-slate-600">
          <p>{t('{name} gets an email to choose a password. Email is not set up on this server, so share this link with them yourself (valid for 7 days):', { name: form.name })}</p>
          <div className="flex gap-2">
            <Input aria-label="Set-password link" readOnly value={link} className="flex-1" onFocus={(e) => e.target.select()} />
            <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success(t('Link copied')))}>Copy</Button>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} title="Invite a team member" description="They get an email with a link to set their password. Their role decides what they can see and do."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={UserPlus} loading={invite.isPending} disabled={!form.name.trim() || !form.email.trim() || !form.roleId} onClick={() => invite.mutate(form)}>Send invite</Button></>}>
      <div className="grid gap-3">
        <Input label="Name" required value={form.name} onChange={set('name')} error={err.name} />
        <Input label="Email" type="email" required value={form.email} onChange={set('email')} error={err.email} />
        <Select label="Role" required placeholder="Choose a role" options={roleOptions(roles, t)} value={form.roleId} onChange={set('roleId')} error={err.roleId}
          hint={roles.find((r) => r._id === form.roleId)?.description} />
      </div>
    </Modal>
  );
}

function RoleModal({ member, roles, onClose }) {
  const [roleId, setRoleId] = useState(member.role?._id || '');
  const change = useChangeMemberRole({ onSuccess: onClose });
  const { t } = useT();
  return (
    <Modal open onClose={onClose} size="sm" title={t('Change {name}’s role', { name: member.name })}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={change.isPending} disabled={!roleId || roleId === member.role?._id} onClick={() => change.mutate({ id: member._id, roleId })}>Save</Button></>}>
      <Select label="Role" options={roleOptions(roles, t)} value={roleId} onChange={(e) => setRoleId(e.target.value)} hint={roles.find((r) => r._id === roleId)?.description} />
    </Modal>
  );
}

function TeamTable() {
  const { user } = useAuth();
  const { t } = useT();
  const [f, setF] = useState({ search: '', status: '', page: 1 });
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = usePlatformTeam({ search: f.search || undefined, status: f.status || undefined, page: f.page });
  const { data: roles = [] } = usePlatformRoles();
  const setActive = useSetMemberActive();
  const remove = useRemoveMember();
  const isMe = (m) => String(m._id) === String(user._id);
  const isOwner = user.platformRole === 'super_admin';
  // Only owners may change owners (the server checks again).
  const canTouch = (m) => !isMe(m) && (!m.owner || isOwner);

  return (
    <div>
      <PageHeader title="Platform team" description="People who can sign in to this console. Each person’s role decides which pages and actions they get."
        actions={<Button icon={UserPlus} onClick={() => setInviting(true)}>Invite member</Button>} />
      <Card>
        <FilterBar cols={3} active={f.status ? 1 : 0} search={<Input aria-label="Search team" placeholder="Search name or email" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} />}>
          <Select aria-label="Status" placeholder="Anyone" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Switched off' }]} />
        </FilterBar>
        <Table loading={isLoading} rows={data?.data} empty="No team members match"
          columns={[
            { key: 'name', header: 'Name', render: (m) => <div><p className="font-medium text-slate-900">{m.name}{isMe(m) && <span className="ml-1 text-xs font-normal text-slate-500">{t('(you)')}</span>}</p><p className="text-xs text-slate-500 sm:hidden">{m.email}</p></div> },
            { key: 'email', header: 'Email', mobile: false },
            { key: 'role', header: 'Role', render: (m) => <Badge tone={m.owner ? 'brand' : m.role?.system ? 'blue' : 'slate'}>{m.role?.name ? (m.role.system ? t(m.role.name) : m.role.name) : '—'}</Badge> },
            { key: 'status', header: 'Status', render: (m) => (m.status === 'active' ? <Badge tone="green">{t('Active')}</Badge> : <Badge tone="red">{t('Switched off')}</Badge>) },
            { key: 'lastLoginAt', header: 'Last login', render: (m) => (m.lastLoginAt ? timeAgo(m.lastLoginAt) : t('Never')) },
            { key: 'actions', header: '', className: 'text-right', render: (m) => canTouch(m) && (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Change role</Button>
                {m.status === 'active'
                  ? <Button size="sm" variant="ghost" loading={setActive.isPending && setActive.variables?.id === m._id} onClick={() => window.confirm(t('Switch off {name}’s platform access? They are signed out of the console straight away.', { name: m.name })) && setActive.mutate({ id: m._id, active: false })}>Deactivate</Button>
                  : <Button size="sm" variant="ghost" loading={setActive.isPending && setActive.variables?.id === m._id} onClick={() => setActive.mutate({ id: m._id, active: true })}>Reactivate</Button>}
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('Remove {name} from the platform team? Their ColonyHub account stays; only console access goes.', { name: m.name })) && remove.mutate(m._id)}>Remove</Button>
              </div>
            ) },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setF({ ...f, page })} />
      </Card>
      {inviting && <InviteModal roles={roles} onClose={() => setInviting(false)} />}
      {editing && <RoleModal member={editing} roles={roles} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function PlatformTeamPage() {
  return (
    <PermissionGate permission="team.manage">
      <TeamTable />
    </PermissionGate>
  );
}
