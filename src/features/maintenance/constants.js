import { opts } from '../assets/shared';

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'every_n_days', label: 'Every N days' },
];
export const CHECK_TYPES = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'reading', label: 'Reading' },
  { value: 'text', label: 'Text' },
];
export const TASK_STATUSES = opts(['pending', 'overdue', 'completed', 'missed', 'skipped']);
export const TASK_TONES = { pending: 'blue', overdue: 'red', completed: 'green', missed: 'slate', skipped: 'slate' };
export const PRIORITIES = opts(['low', 'medium', 'high', 'urgent']);
export const BD_STATUSES = opts(['open', 'in_progress', 'resolved', 'closed']);
export const WO_STATUSES = opts(['open', 'in_progress', 'completed', 'verified', 'cancelled']);
export const WO_TONES = { open: 'amber', in_progress: 'blue', completed: 'brand', verified: 'green', cancelled: 'slate' };
export const RUN_TONES = { pending: 'blue', completed: 'brand', verified: 'green', rejected: 'red', missed: 'slate' };
export const AREAS = opts(['lobby', 'lift', 'garbage_room', 'gym', 'corridor', 'staircase', 'parking', 'pool', 'garden', 'terrace', 'clubhouse', 'washroom', 'other']);
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
