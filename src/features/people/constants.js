// Mirrors backend/src/modules/people/occupation.js.
export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
export const OCCUPATION_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'working', label: 'Working' },
  { value: 'homemaker', label: 'Homemaker' },
  { value: 'retired', label: 'Retired' },
  { value: 'other', label: 'Other' },
];
export const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'coaching', label: 'Coaching institute' },
  { value: 'other', label: 'Other' },
];
export const WORK_MODES = [
  { value: 'job', label: 'Job' },
  { value: 'business', label: 'Business' },
  { value: 'self_employed', label: 'Self-employed / professional' },
];
export const WORK_CATEGORIES = [
  { value: 'it_software', label: 'IT / Software' },
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'education', label: 'Education' },
  { value: 'government', label: 'Government' },
  { value: 'banking_finance', label: 'Banking / Finance' },
  { value: 'retail_trade', label: 'Retail / Trade' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'real_estate', label: 'Real estate / Construction' },
  { value: 'legal', label: 'Legal' },
  { value: 'hospitality_food', label: 'Hospitality / Food' },
  { value: 'transport_logistics', label: 'Transport / Logistics' },
  { value: 'media_creative', label: 'Media / Creative' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'armed_forces_police', label: 'Armed forces / Police' },
  { value: 'other', label: 'Other' },
];

const find = (list, v) => list.find((o) => o.value === v)?.label || '';
export const categoryLabel = (v) => find(WORK_CATEGORIES, v);

// One line for lists and directory cards, e.g. "Engineer · Infosys (IT / Software)" or "Student · COEP Pune".
export function occupationSummary(o) {
  if (!o?.type) return '';
  if (o.type === 'student') return ['Student', o.student?.institutionName, o.student?.course].filter(Boolean).join(' · ');
  if (o.type === 'working') {
    const w = o.working || {};
    const who = [w.designation || find(WORK_MODES, w.mode), w.organisation].filter(Boolean).join(' · ');
    return `${who}${w.category ? ` (${categoryLabel(w.category)})` : ''}`;
  }
  return find(OCCUPATION_TYPES, o.type);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "MM-DD" -> "12 Mar" (the directory never receives the year).
export const dayMonth = (md) => (md ? `${Number(md.slice(3, 5))} ${MONTHS[Number(md.slice(0, 2)) - 1]}` : '');
