import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeartPulse, PawPrint, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Attachments, Badge, Button, Card, CardHeader, Checkbox, EmptyState, FileUpload, Input, Modal, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { date as fmtDate, label } from '../../../lib/format';
import { KycPanel } from '../../kyc/components/KycPanel';
import { LeasePanel } from '../../tenancy/components/LeasePanel';
import { useAddHouseholdItem, useMyHousehold, useRemoveHouseholdItem, useSetMyMedical, useUpdateHousehold, useUpdateHouseholdItem } from '../api';
import { BLOOD_GROUPS, PET_TYPES, RELATIONS } from '../constants';
import { PersonalDetailsFields, personalBody, personalForm } from '../../people/components/PersonalDetailsFields';
import { occupationSummary } from '../../people/constants';
import { useT } from '../../../context/LanguageContext';

const nullable = (v) => (v === '' ? null : v);

function MedicalFields({ v, set }) {
  return (
    <>
      <Select label="Blood group" placeholder="Unknown" options={BLOOD_GROUPS} value={v.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)} />
      <Input label="Allergies" value={v.allergies || ''} onChange={(e) => set('allergies', e.target.value)} />
      <Input className="sm:col-span-2" label="Medical conditions" placeholder="e.g. diabetic, asthma, heart patient" value={v.conditions || ''} onChange={(e) => set('conditions', e.target.value)} />
      <div className="flex flex-wrap gap-4 sm:col-span-2">
        <Checkbox label="Senior citizen" checked={Boolean(v.elderly)} onChange={(e) => set('elderly', e.target.checked)} />
        <Checkbox label="Special needs / mobility support" checked={Boolean(v.specialNeeds)} onChange={(e) => set('specialNeeds', e.target.checked)} />
      </div>
    </>
  );
}

function MemberModal({ member, onClose }) {
  const editing = Boolean(member?._id);
  const { t } = useT();
  const [v, setV] = useState({ name: '', relation: 'spouse', dob: '', age: '', phone: '', ...member, age: member?.dob ? '' : String(member?.age ?? '') });
  const [photo, setPhoto] = useState([]);
  // Anniversary, gender, occupation (people feature); the DOB field above stays the source for dob.
  const [personal, setPersonal] = useState(() => personalForm(member));
  const [showBirthday, setShowBirthday] = useState(Boolean(member?.showBirthday));
  const [errors, setErrors] = useState({});
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const add = useAddHouseholdItem('members', { onSuccess: onClose });
  const update = useUpdateHouseholdItem('members', { onSuccess: onClose });
  const onError = (e) => setErrors(e.fieldErrors || {});
  const { dateOfBirth: _dob, ...personalFields } = personalBody(personal);
  const body = () => ({
    ...personalFields,
    showBirthday,
    name: v.name,
    relation: v.relation,
    dob: nullable(v.dob || ''),
    age: v.dob ? null : v.age === '' ? null : Number(v.age),
    phone: v.phone || '',
    bloodGroup: nullable(v.bloodGroup || ''),
    allergies: v.allergies || '',
    conditions: v.conditions || '',
    elderly: Boolean(v.elderly),
    specialNeeds: Boolean(v.specialNeeds),
    ...(photo.length ? { photo: photo[0]._id } : {}),
  });
  return (
    <Modal open onClose={onClose} title={editing ? t('Edit {name}', { name: member.name }) : 'Add family member'} description="For people without their own app login. Residents with a login manage their own medical details." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={add.isPending || update.isPending} onClick={() => (editing ? update.mutate({ id: member._id, ...body() }, { onError }) : add.mutate(body(), { onError }))}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required value={v.name} onChange={(e) => set('name', e.target.value)} error={errors['body.name']} />
        <Select label="Relation" options={RELATIONS} value={v.relation} onChange={(e) => set('relation', e.target.value)} />
        <Input label="Date of birth" type="date" value={v.dob || ''} onChange={(e) => set('dob', e.target.value)} />
        <Input label="Age (if DOB unknown)" type="number" min={0} max={120} disabled={Boolean(v.dob)} value={v.age} onChange={(e) => set('age', e.target.value)} />
        <Input label="Phone" type="tel" value={v.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t('Photo')}</p>
          <FileUpload folder="household" files={photo} onChange={setPhoto} max={1} label={member?.photo ? 'Replace photo' : 'Add photo'} />
        </div>
        <MedicalFields v={v} set={set} />
        <p className="pt-2 text-sm font-semibold text-slate-700 sm:col-span-2">{t('Personal details')}</p>
        <PersonalDetailsFields hideDob value={personal} onChange={setPersonal} errors={errors} />
        <Checkbox className="sm:col-span-2" label="Show on the society's “Today's birthdays” card" checked={showBirthday} onChange={(e) => setShowBirthday(e.target.checked)} />
      </div>
    </Modal>
  );
}

function PetModal({ pet, onClose }) {
  const editing = Boolean(pet?._id);
  const { t } = useT();
  const [v, setV] = useState({ name: '', type: 'dog', breed: '', vaccinationDate: '', registrationNumber: '', ...pet });
  const [cert, setCert] = useState([]);
  const [photo, setPhoto] = useState([]);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const add = useAddHouseholdItem('pets', { onSuccess: onClose });
  const update = useUpdateHouseholdItem('pets', { onSuccess: onClose });
  const body = () => ({
    name: v.name,
    type: v.type,
    breed: v.breed || '',
    vaccinationDate: nullable(v.vaccinationDate || ''),
    registrationNumber: v.registrationNumber || '',
    ...(cert.length ? { vaccinationCertificate: cert[0]._id } : {}),
    ...(photo.length ? { photo: photo[0]._id } : {}),
  });
  return (
    <Modal open onClose={onClose} title={editing ? t('Edit {name}', { name: pet.name }) : 'Add pet'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={add.isPending || update.isPending} onClick={() => (editing ? update.mutate({ id: pet._id, ...body() }) : add.mutate(body()))}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required value={v.name} onChange={set('name')} />
        <Select label="Type" options={PET_TYPES} value={v.type} onChange={set('type')} />
        <Input label="Breed" value={v.breed || ''} onChange={set('breed')} />
        <Input label="Municipal registration no." value={v.registrationNumber || ''} onChange={set('registrationNumber')} />
        <Input label="Last vaccination" type="date" value={v.vaccinationDate || ''} onChange={set('vaccinationDate')} />
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t('Vaccination certificate')}</p>
          <FileUpload folder="documents" files={cert} onChange={setCert} max={1} label={pet?.vaccinationCertificate ? 'Replace' : 'Attach'} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t('Photo')}</p>
          <FileUpload folder="household" files={photo} onChange={setPhoto} max={1} label="Add photo" />
        </div>
      </div>
    </Modal>
  );
}

function Family({ h }) {
  const [editing, setEditing] = useState(null);
  const remove = useRemoveHouseholdItem('members');
  const { t } = useT();
  return (
    <Card>
      <CardHeader title="Family members" subtitle="People living here without their own login" action={<Button size="sm" icon={Plus} onClick={() => setEditing({})}>Add</Button>} />
      {h.residents?.length > 0 && (
        <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
          {t('With app login:')} {h.residents.map((r) => `${r.name} (${t(label(r.residentType))})`).join(', ')}
        </div>
      )}
      {!h.members.length ? <EmptyState icon={Users} title="No family members added" /> : (
        <ul className="divide-y divide-slate-100">
          {h.members.map((m) => (
            <li key={m._id} className="flex items-center gap-3 px-5 py-3">
              {m.photo?.url ? <img src={m.photo.url} alt={m.name} className="size-10 rounded-full object-cover" /> : <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">{m.name.slice(0, 1)}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{m.name}</p>
                  <span className="text-xs text-slate-500">{t(label(m.relation))}{m.age != null ? ` · ${t('{age} yrs', { age: m.age })}` : ''}</span>
                  {m.bloodGroup && <Badge tone="red">{m.bloodGroup}</Badge>}
                  {m.elderly && <Badge tone="amber">{t('Senior')}</Badge>}
                  {m.specialNeeds && <Badge tone="amber">{t('Special needs')}</Badge>}
                </div>
                {(m.allergies || m.conditions) && <p className="text-xs text-slate-500">{[m.conditions, m.allergies && t('Allergic to {what}', { what: m.allergies })].filter(Boolean).join(' · ')}</p>}
                {m.occupation && <p className="text-xs text-slate-600">{occupationSummary(m.occupation)}</p>}
              </div>
              <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label={t('Edit {name}', { name: m.name })} onClick={() => setEditing(m)}><Pencil className="size-4" /></button>
              <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label={t('Remove {name}', { name: m.name })} onClick={() => window.confirm(t('Remove {name}?', { name: m.name })) && remove.mutate(m._id)}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
      {editing && <MemberModal member={editing._id ? editing : null} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function Pets({ h }) {
  const [editing, setEditing] = useState(null);
  const remove = useRemoveHouseholdItem('pets');
  const { t } = useT();
  return (
    <Card>
      <CardHeader title="Pets" action={<Button size="sm" icon={Plus} onClick={() => setEditing({})}>Add</Button>} />
      {!h.pets.length ? <EmptyState icon={PawPrint} title="No pets added" /> : (
        <ul className="divide-y divide-slate-100">
          {h.pets.map((p) => (
            <li key={p._id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{p.name} <span className="text-xs font-normal text-slate-500">{t(label(p.type))}{p.breed ? ` · ${p.breed}` : ''}</span></p>
                <p className="text-xs text-slate-500">{p.vaccinationDate ? t('Vaccinated {date}', { date: fmtDate(p.vaccinationDate) }) : t('Vaccination date not added')}{p.registrationNumber ? ` · ${t('Reg. {no}', { no: p.registrationNumber })}` : ''}</p>
                {p.vaccinationCertificate && <div className="mt-1"><Attachments items={[p.vaccinationCertificate]} /></div>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => window.confirm(t('Remove {name}?', { name: p.name })) && remove.mutate(p._id)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <PetModal pet={editing._id ? editing : null} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function Contacts({ h }) {
  const [rows, setRows] = useState(h.emergencyContacts.length ? h.emergencyContacts.map(({ name, relation, phone, altPhone }) => ({ name, relation: relation || '', phone, altPhone: altPhone || '' })) : [{ name: '', relation: '', phone: '', altPhone: '' }]);
  const save = useUpdateHousehold();
  const { t } = useT();
  const set = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <Card>
      <CardHeader title="Emergency contacts" subtitle="Shown to security responders during an SOS from your home" />
      <div className="space-y-3 p-5">
        {rows.map((c, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
            <Input label="Name" value={c.name} onChange={(e) => set(i, 'name', e.target.value)} />
            <Input label="Relation" value={c.relation} onChange={(e) => set(i, 'relation', e.target.value)} />
            <Input label="Phone" type="tel" value={c.phone} onChange={(e) => set(i, 'phone', e.target.value)} />
            <Input label="Alternate phone" type="tel" value={c.altPhone} onChange={(e) => set(i, 'altPhone', e.target.value)} />
            <button type="button" className="mb-2 justify-self-start rounded p-1 text-slate-400 hover:text-red-600" aria-label={t('Remove contact')} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {rows.length < 5 && <Button size="sm" variant="secondary" icon={Phone} onClick={() => setRows((r) => [...r, { name: '', relation: '', phone: '', altPhone: '' }])}>Add contact</Button>}
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ emergencyContacts: rows.filter((r) => r.name || r.phone) })}>Save contacts</Button>
        </div>
      </div>
    </Card>
  );
}

function Medical({ h }) {
  const [mine, setMine] = useState({ bloodGroup: '', allergies: '', conditions: '', elderly: false, specialNeeds: false, ...(h.myMedical || {}) });
  const [notes, setNotes] = useState(h.medicalNotes || '');
  const saveMine = useSetMyMedical();
  const saveNotes = useUpdateHousehold();
  const set = (k, v) => setMine((s) => ({ ...s, [k]: v }));
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="My medical details" subtitle="Security guards see these only while an SOS from your home is open." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <MedicalFields v={mine} set={set} />
          <Button className="justify-self-start" loading={saveMine.isPending}
            onClick={() => saveMine.mutate({ bloodGroup: nullable(mine.bloodGroup || ''), allergies: mine.allergies || '', conditions: mine.conditions || '', elderly: Boolean(mine.elderly), specialNeeds: Boolean(mine.specialNeeds) })}>Save</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Notes for responders" subtitle="e.g. oxygen cylinder in the bedroom, spare key with A-102" />
        <div className="space-y-3 p-5">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button size="sm" loading={saveNotes.isPending} onClick={() => saveNotes.mutate({ medicalNotes: notes })}>Save notes</Button>
        </div>
      </Card>
    </div>
  );
}

const TABS = [
  { value: 'family', label: 'Family' },
  { value: 'pets', label: 'Pets' },
  { value: 'contacts', label: 'Emergency contacts' },
  { value: 'medical', label: 'Medical' },
  { value: 'kyc', label: 'ID proof' },
  { value: 'lease', label: 'Rent agreement' },
];

export default function MyHouseholdPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'family';
  const { data: h, isLoading } = useMyHousehold();
  const { t } = useT();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My household" description={h?.unit ? t('{unit} — family, pets, emergency details, ID proof and rent agreement', { unit: h.unit.label }) : 'Family, pets, emergency details, ID proof and rent agreement'} />
      <Tabs className="mb-4 w-fit max-w-full" value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} tabs={TABS} />
      {isLoading || !h ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <>
          {tab === 'family' && <Family h={h} />}
          {tab === 'pets' && <Pets h={h} />}
          {tab === 'contacts' && <Contacts key={h.updatedAt || 'new'} h={h} />}
          {tab === 'medical' && <Medical key={h.updatedAt || 'new'} h={h} />}
          {tab === 'kyc' && <KycPanel />}
          {tab === 'lease' && <LeasePanel />}
        </>
      )}
      {tab === 'medical' && <p className="mt-4 flex items-center gap-1 text-xs text-slate-500"><HeartPulse className="size-3.5" /> {t('Managers can see household details; guards only during an open emergency.')}</p>}
    </div>
  );
}
