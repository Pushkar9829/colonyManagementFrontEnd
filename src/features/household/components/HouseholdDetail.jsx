import { Badge, Card, CardHeader } from '../../../components/ui';
import { label } from '../../../lib/format';
import { LoginAsButton } from '../../loginAs/components/LoginAsModal';

const flags = (p) => [p.bloodGroup && <Badge key="b" tone="red">{p.bloodGroup}</Badge>, p.elderly && <Badge key="e" tone="amber">Senior</Badge>, p.specialNeeds && <Badge key="s" tone="amber">Special needs</Badge>].filter(Boolean);
const notes = (p) => [p.conditions, p.allergies && `Allergic to ${p.allergies}`].filter(Boolean).join(' · ');

// Read-only household view used by managers and by responders (SOS context).
export function HouseholdDetail({ residents = [], members = [], pets = [], emergencyContacts = [], medicalNotes, unitLabel }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader title="People" />
        <ul className="divide-y divide-slate-100 text-sm">
          {!residents.length && !members.length && <li className="px-5 py-3 text-slate-500">Nobody listed</li>}
          {residents.map((r) => (
            <li key={`r-${r.membership || r.name}`} className="px-5 py-2">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-900">{r.name}</span><span className="text-xs text-slate-500">{label(r.residentType)}</span>{flags(r)}{r.membership && <LoginAsButton className="ml-auto" target={{ membershipId: r.membership, user: r.user, name: r.name, role: 'resident', unitLabel }} />}</div>
              <p className="text-xs text-slate-500">{[r.phone, notes(r)].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
          {members.map((m) => (
            <li key={`m-${m._id || m.name}`} className="px-5 py-2">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-900">{m.name}</span><span className="text-xs text-slate-500">{label(m.relation)}{m.age != null ? ` · ${m.age} yrs` : ''}</span>{flags(m)}</div>
              {(notes(m) || m.phone) && <p className="text-xs text-slate-500">{[m.phone, notes(m)].filter(Boolean).join(' · ')}</p>}
            </li>
          ))}
        </ul>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Emergency contacts" />
          <ul className="divide-y divide-slate-100 text-sm">
            {!emergencyContacts.length && <li className="px-5 py-3 text-slate-500">None added</li>}
            {emergencyContacts.map((c) => (
              <li key={c._id || c.phone} className="flex justify-between gap-2 px-5 py-2">
                <span>{c.name}{c.relation ? ` (${c.relation})` : ''}</span>
                <a className="font-medium text-brand-600" href={`tel:${c.phone}`}>{c.phone}</a>
              </li>
            ))}
          </ul>
        </Card>
        {(pets.length > 0 || medicalNotes) && (
          <Card className="space-y-2 p-5 text-sm">
            {pets.length > 0 && <p><span className="font-medium">Pets:</span> {pets.map((p) => `${p.name} (${label(p.type)}${p.breed ? `, ${p.breed}` : ''})`).join(', ')}</p>}
            {medicalNotes && <p><span className="font-medium">Notes:</span> {medicalNotes}</p>}
          </Card>
        )}
      </div>
    </div>
  );
}
