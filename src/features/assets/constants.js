import { opts } from './shared';

export const CATEGORY_LABELS = {
  lift: 'Lift',
  dg_set: 'DG set',
  pump: 'Pump',
  stp: 'STP',
  wtp: 'WTP',
  transformer: 'Transformer',
  cctv: 'CCTV',
  fire_system: 'Fire system',
  gym_equipment: 'Gym equipment',
  other: 'Other',
};
export const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
export const STATUSES = opts(['working', 'under_repair', 'retired']);
export const STATUS_TONES = { working: 'green', under_repair: 'amber', retired: 'slate' };
export const COVERAGE = opts(['comprehensive', 'non_comprehensive', 'labour_only', 'parts_only']);
export const EXTINGUISHER_TYPES = [
  { value: 'abc_powder', label: 'ABC dry powder' },
  { value: 'co2', label: 'CO₂' },
  { value: 'water', label: 'Water' },
  { value: 'foam', label: 'Foam' },
  { value: 'clean_agent', label: 'Clean agent' },
  { value: 'k_class', label: 'K class (kitchen)' },
  { value: 'other', label: 'Other' },
];

// What a scanned QR may contain: our label URL (…/assets/code/AST-000001) or just the code / tag.
export function codeFromScan(text) {
  const raw = String(text || '').trim();
  const m = /\/assets\/code\/([^/?#]+)/.exec(raw);
  return m ? decodeURIComponent(m[1]) : raw;
}
