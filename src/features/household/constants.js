import { label } from '../../lib/format';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const RELATIONS = ['spouse', 'child', 'parent', 'grandparent', 'sibling', 'relative', 'other'].map((v) => ({ value: v, label: label(v) }));
export const PET_TYPES = ['dog', 'cat', 'bird', 'fish', 'rabbit', 'other'].map((v) => ({ value: v, label: label(v) }));
