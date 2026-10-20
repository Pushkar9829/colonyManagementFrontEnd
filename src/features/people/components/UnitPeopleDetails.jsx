import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, Card, CardHeader, Checkbox, Modal, Spinner } from '../../../components/ui';
import { date, label } from '../../../lib/format';
import { useSaveFamilyPersonalDetails, useSaveUserPersonalDetails, useUnitPeople } from '../api';
import { occupationSummary } from '../constants';
import { PersonalDetailsFields, personalBody, personalForm } from './PersonalDetailsFields';

function EditModal({ unitId, person, onClose }) {
  const family = Boolean(person.memberId);
  const [form, setForm] = useState(() => ({ ...personalForm(person), showBirthday: Boolean(person.showBirthday) }));
  const [errors, setErrors] = useState({});
  const saveUser = useSaveUserPersonalDetails({ onSuccess: onClose });
  const saveFamily = useSaveFamilyPersonalDetails({ onSuccess: onClose });
  const onError = (e) => setErrors(e.fieldErrors || {});
  const submit = () => (family
    ? saveFamily.mutate({ unitId, memberId: person.memberId, ...personalBody(form), showBirthday: form.showBirthday }, { onError })
    : saveUser.mutate({ userId: person.user, ...personalBody(form) }, { onError }));
  return (
    <Modal open onClose={onClose} size="lg" title={`Personal details · ${person.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saveUser.isPending || saveFamily.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonalDetailsFields value={form} onChange={(v) => setForm((f) => ({ ...f, ...v }))} errors={errors} />
        {family && <Checkbox className="sm:col-span-2" label="Show on the society's “Today's birthdays” card" checked={form.showBirthday} onChange={(e) => setForm((f) => ({ ...f, showBirthday: e.target.checked }))} />}
      </div>
    </Modal>
  );
}

function Row({ p, onEdit }) {
  const lines = [p.dateOfBirth && `Born ${date(p.dateOfBirth)}`, p.anniversaryDate && `Anniversary ${date(p.anniversaryDate)}`, p.gender && label(p.gender)].filter(Boolean);
  return (
    <li className="flex items-start gap-3 px-5 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{p.name} <span className="text-xs font-normal text-slate-500">{p.memberId ? label(p.relation) : label(p.residentType)}</span></p>
        <p className="text-xs text-slate-500">{lines.join(' · ') || 'No dates added'}</p>
        {p.occupation && <p className="text-xs text-slate-600">{occupationSummary(p.occupation)}</p>}
      </div>
      <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label={`Edit details of ${p.name}`} onClick={() => onEdit(p)}><Pencil className="size-4" /></button>
    </li>
  );
}

// Society admin: everyone in a home with their birthday / anniversary / occupation, editable.
export function UnitPeopleDetails({ unitId }) {
  const { data, isLoading } = useUnitPeople(unitId);
  const [editing, setEditing] = useState(null);
  if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;
  const people = [...data.residents, ...data.members.map((m) => ({ ...m, memberId: m._id }))];
  return (
    <Card className="mt-4">
      <CardHeader title="Personal details" subtitle="Birthdays, anniversaries and occupations (admins only)" />
      <ul className="divide-y divide-slate-100 text-sm">
        {!people.length && <li className="px-5 py-3 text-slate-500">Nobody lives here yet</li>}
        {people.map((p) => <Row key={p.memberId || p.user} p={p} onEdit={setEditing} />)}
      </ul>
      {editing && <EditModal unitId={unitId} person={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
