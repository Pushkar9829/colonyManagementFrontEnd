export const SLOT_TYPES = [
  { value: 'four_wheeler', label: '4W' },
  { value: 'two_wheeler', label: '2W' },
  { value: 'ev', label: 'EV' },
];
export const slotTypeLabel = (t) => SLOT_TYPES.find((s) => s.value === t)?.label || t;

export const POOLS = [
  { value: 'resident', label: 'Reserved (for flats)' },
  { value: 'visitor', label: 'Visitor' },
];

export const VIOLATION_TYPES = [
  { value: 'wrong_slot', label: 'Wrong slot' },
  { value: 'double_parking', label: 'Double parking' },
  { value: 'no_parking_zone', label: 'No-parking zone' },
  { value: 'blocking', label: 'Blocking' },
  { value: 'visitor_overstay', label: 'Visitor overstay' },
  { value: 'other', label: 'Other' },
];
export const violationTypeLabel = (t) => VIOLATION_TYPES.find((v) => v.value === t)?.label || t;

export const VIOLATION_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export const EV_STATUSES = [
  { value: 'booked', label: 'Booked' },
  { value: 'charging', label: 'Charging' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

// Parking statuses the shared StatusBadge map does not know about.
export const TONES = {
  open: 'amber',
  disputed: 'blue',
  resolved: 'green',
  dismissed: 'slate',
  booked: 'blue',
  charging: 'brand',
  completed: 'green',
  cancelled: 'slate',
  no_show: 'red',
  active: 'green',
};

export const VISITOR_HOURS = [1, 2, 3, 4, 6, 8, 12].map((h) => ({ value: String(h), label: `${h} hour${h === 1 ? '' : 's'}` }));

// ---- HH:MM helpers (charger slots are local wall-clock times) ----
export const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
};
export const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const isOverstay = (session) => Boolean(session?.expectedOutAt) && new Date(session.expectedOutAt) < new Date();
