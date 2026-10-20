import { Input, Select } from '../../../components/ui';
import { todayISO } from '../../../lib/format';
import { GENDERS } from '../constants';
import { OccupationFields, occupationBody, occupationForm } from './OccupationFields';

export const personalForm = (d) => ({
  dateOfBirth: d?.dateOfBirth || '',
  anniversaryDate: d?.anniversaryDate || '',
  gender: d?.gender || '',
  occupation: occupationForm(d?.occupation),
});

// Empty fields are sent as null so clearing a field really clears it.
export const personalBody = (f) => ({
  dateOfBirth: f.dateOfBirth || null,
  anniversaryDate: f.anniversaryDate || null,
  gender: f.gender || null,
  occupation: occupationBody(f.occupation),
});

// Date of birth, anniversary, gender and occupation. `hideDob` when the form already has its own DOB field.
export function PersonalDetailsFields({ value, onChange, errors = {}, hideDob = false }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const err = (k) => errors[`body.${k}`] || errors[k];
  return (
    <>
      {!hideDob && <Input label="Date of birth" type="date" max={todayISO()} value={value.dateOfBirth} onChange={set('dateOfBirth')} error={err('dateOfBirth')} />}
      <Input label="Wedding anniversary" type="date" max={todayISO()} value={value.anniversaryDate} onChange={set('anniversaryDate')} error={err('anniversaryDate')} />
      <Select label="Gender" placeholder="Not specified" options={GENDERS} value={value.gender} onChange={set('gender')} />
      <OccupationFields value={value.occupation} onChange={(occupation) => onChange({ ...value, occupation })} errors={errors} />
    </>
  );
}
