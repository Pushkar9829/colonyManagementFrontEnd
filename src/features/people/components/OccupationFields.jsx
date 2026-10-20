import { Input, Select, Textarea } from '../../../components/ui';
import { INSTITUTION_TYPES, OCCUPATION_TYPES, WORK_CATEGORIES, WORK_MODES } from '../constants';

const EMPTY_STUDENT = { institutionName: '', institutionType: 'school', course: '', address: '' };
const EMPTY_WORKING = { mode: 'job', organisation: '', designation: '', category: '', details: '', workAddress: '' };

// Form state keeps both branches, so flipping between Student and Working doesn't lose what was typed;
// occupationBody() sends only the branch that matches the type.
export const occupationForm = (o) => ({
  type: o?.type || '',
  student: { ...EMPTY_STUDENT, ...(o?.student || {}) },
  working: { ...EMPTY_WORKING, ...(o?.working || {}) },
  notes: o?.notes || '',
});

export function occupationBody(f) {
  if (!f?.type) return null;
  if (f.type === 'student') return { type: 'student', student: f.student };
  if (f.type === 'working') return { type: 'working', working: f.working };
  return { type: f.type, notes: f.notes || '' };
}

// errors: field errors from the API (keys like "body.occupation.student.institutionName").
export function OccupationFields({ value, onChange, errors = {} }) {
  const f = value || occupationForm(null);
  const err = (path) => errors[`body.occupation.${path}`] || errors[`occupation.${path}`];
  const setStudent = (k) => (e) => onChange({ ...f, student: { ...f.student, [k]: e.target.value } });
  const setWorking = (k) => (e) => onChange({ ...f, working: { ...f.working, [k]: e.target.value } });
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <Select label="Occupation" placeholder="Not specified" options={OCCUPATION_TYPES} value={f.type} onChange={(e) => onChange({ ...f, type: e.target.value })} />
      {f.type === 'student' && (
        <>
          <Input label="School / college name" required value={f.student.institutionName} onChange={setStudent('institutionName')} error={err('student.institutionName') || err('student')} />
          <Select label="Institution type" options={INSTITUTION_TYPES} value={f.student.institutionType} onChange={setStudent('institutionType')} />
          <Input label="Course / class" placeholder="e.g. Class 9, B.Com 2nd year" value={f.student.course} onChange={setStudent('course')} />
          <Input className="sm:col-span-2" label="Institution address" value={f.student.address} onChange={setStudent('address')} />
        </>
      )}
      {f.type === 'working' && (
        <>
          <Select label="Work type" options={WORK_MODES} value={f.working.mode} onChange={setWorking('mode')} />
          <Select label="Category" required placeholder="Choose a category" options={WORK_CATEGORIES} value={f.working.category} onChange={setWorking('category')} error={err('working.category') || err('working')} />
          <Input label={f.working.mode === 'job' ? 'Company / organisation' : 'Business / firm name'} value={f.working.organisation} onChange={setWorking('organisation')} />
          <Input label="Designation / role" value={f.working.designation} onChange={setWorking('designation')} />
          <Input className="sm:col-span-2" label="Work address (optional)" value={f.working.workAddress} onChange={setWorking('workAddress')} />
          <Textarea className="sm:col-span-2" label="Details" rows={2} placeholder="e.g. what you do, services you offer" value={f.working.details} onChange={setWorking('details')} />
        </>
      )}
      {['homemaker', 'retired', 'other'].includes(f.type) && (
        <Input label="Notes (optional)" placeholder={f.type === 'retired' ? 'e.g. Retired bank manager' : ''} value={f.notes} onChange={(e) => onChange({ ...f, notes: e.target.value })} />
      )}
    </div>
  );
}
