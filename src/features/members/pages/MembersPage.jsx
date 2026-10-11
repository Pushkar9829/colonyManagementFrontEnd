import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, KeyRound, Plus, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Modal, Pagination, Select, StatusBadge, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { date, label } from '../../../lib/format';
import { ROLE_LABELS } from '../../../lib/roles';
import { UnitPicker } from '../../units/components/UnitPicker';
import { useApproveMember, useCreateMember, useMembers, useRejectMember, useResetPassword, useUpdateMember } from '../api';

const ROLE_OPTIONS = ['resident', 'admin', 'accountant', 'facility_manager', 'guard', 'staff'].map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const RESIDENT_TYPES = ['owner', 'tenant', 'family'].map((r) => ({ value: r, label: label(r) }));

function MemberModal({ member, onClose }) {
  const editing = Boolean(member?._id);
  const { values, bind, set, applyServerErrors, errors } = useForm({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    password: '',
    role: member?.role || 'resident',
    residentType: member?.residentType || 'owner',
    unit: member?.unit?._id || '',
    designation: member?.designation || '',
  });
  const create = useCreateMember({ onSuccess: onClose });
  const update = useUpdateMember({ onSuccess: onClose });
  const isResident = values.role === 'resident';

  const submit = () => {
    const body = { name: values.name, email: values.email || undefined, phone: values.phone || undefined, role: values.role, designation: values.designation || undefined };
    if (isResident) Object.assign(body, { unit: values.unit || undefined, residentType: values.residentType });
    if (editing) update.mutate({ id: member._id, ...body }, { onError: applyServerErrors });
    else create.mutate({ ...body, password: values.password }, { onError: applyServerErrors });
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${member.name}` : 'Add member'} description={editing ? undefined : 'Share the login details with them; they can change the password later.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Full name" required {...bind('name')} />
        <Input label="Email" type="email" {...bind('email')} />
        <Input label="Phone" type="tel" {...bind('phone')} />
        {!editing && <Input className="sm:col-span-2" label="Temporary password" type="text" required hint="At least 8 characters" {...bind('password')} />}
        <Select label="Role" options={ROLE_OPTIONS} {...bind('role')} />
        {isResident ? <Select label="Resident type" options={RESIDENT_TYPES} {...bind('residentType')} /> : <Input label="Designation" placeholder="Plumber, Main gate…" {...bind('designation')} />}
        {isResident && <div className="sm:col-span-2"><UnitPicker value={values.unit} initialLabel={member?.unit?.label} onChange={(id) => set('unit', id)} error={errors.unit} required /></div>}
      </div>
    </Modal>
  );
}

export default function MembersPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ role: '', search: '', page: 1 });
  const status = params.get('status') || 'active';
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useMembers({ status, role: filters.role || undefined, search: filters.search || undefined, page: filters.page });
  const { data: pendingCount } = useMembers({ status: 'pending', limit: 1 });
  const approve = useApproveMember();
  const reject = useRejectMember();
  const update = useUpdateMember();
  const resetPw = useResetPassword();

  return (
    <div>
      <PageHeader title="Members" description="Residents, committee and staff accounts." actions={<Button icon={Plus} onClick={() => setEditing({})}>Add member</Button>} />
      <Tabs className="mb-4 w-fit" value={status} onChange={(v) => { setParams({ status: v }, { replace: true }); setFilters((f) => ({ ...f, page: 1 })); }}
        tabs={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Join requests', count: pendingCount?.meta?.total }, { value: 'inactive', label: 'Inactive' }, { value: 'rejected', label: 'Rejected' }]} />
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
          <Input placeholder="Search name, email, phone" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
          <Select placeholder="All roles" options={ROLE_OPTIONS} value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))} />
        </div>
        <Table loading={isLoading} rows={data?.data} empty={status === 'pending' ? 'No pending requests' : 'No members'}
          columns={[
            { key: 'name', header: 'Name', render: (m) => <div><p className="font-medium text-slate-900">{m.name}{String(m.user) === String(user._id) && <span className="ml-1 text-xs text-slate-400">(you)</span>}</p><p className="text-xs text-slate-500">{m.email || m.phone}</p></div> },
            { key: 'role', header: 'Role', render: (m) => <div className="flex flex-wrap gap-1"><Badge tone="brand">{ROLE_LABELS[m.role]}</Badge>{m.residentType && <Badge>{label(m.residentType)}</Badge>}</div> },
            { key: 'unit', header: 'Unit / designation', render: (m) => m.unit?.label || m.designation || '—' },
            { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
            { key: 'createdAt', header: 'Joined', render: (m) => date(m.createdAt) },
            {
              key: 'a', header: '', className: 'text-right', render: (m) => (
                <div className="flex justify-end gap-1">
                  {m.status === 'pending' ? (
                    <>
                      <Button size="sm" variant="success" icon={Check} loading={approve.isPending && approve.variables === m._id} onClick={() => approve.mutate(m._id)}>Approve</Button>
                      <Button size="sm" variant="ghost" icon={X} onClick={() => window.confirm(`Reject ${m.name}?`) && reject.mutate(m._id)}>Reject</Button>
                    </>
                  ) : String(m.user) !== String(user._id) && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Edit</Button>
                      <Button size="sm" variant="ghost" icon={KeyRound} title="Reset password" onClick={() => { const pw = window.prompt(`New password for ${m.name} (min 8 characters)`); if (pw) resetPw.mutate({ id: m._id, password: pw }); }} />
                      {['active', 'inactive'].includes(m.status) && (
                        <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: m._id, status: m.status === 'active' ? 'inactive' : 'active' })}>{m.status === 'active' ? 'Deactivate' : 'Activate'}</Button>
                      )}
                    </>
                  )}
                </div>
              ),
            },
          ]} />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      {editing && <MemberModal member={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
