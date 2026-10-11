export const MEETING_TYPES = [
  { value: 'agm', label: 'Annual General Meeting (AGM)' },
  { value: 'sgm', label: 'Special General Meeting (SGM)' },
  { value: 'committee', label: 'Managing Committee meeting' },
  { value: 'other', label: 'Other meeting' },
];
export const TYPE_SHORT = { agm: 'AGM', sgm: 'SGM', committee: 'Committee', other: 'Meeting' };

export const AUDIENCES = [
  { value: 'owners', label: 'All owners (members)' },
  { value: 'all_members', label: 'All residents' },
  { value: 'committee', label: 'Managing committee' },
  { value: 'custom', label: 'Selected members' },
];

export const MODES = [
  { value: 'in_person', label: 'In person' },
  { value: 'online', label: 'Online' },
  { value: 'proxy', label: 'By proxy' },
];

export const MAJORITY = [
  { value: 'simple', label: 'Simple majority' },
  { value: 'two_thirds', label: 'Two-thirds majority' },
  { value: 'three_fourths', label: 'Three-fourths majority' },
];

export const ACTION_STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

// <input type="datetime-local"> value for a Date, in the browser's local time.
export const toLocalInput = (d) => {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};
