import { label } from '../../lib/format';

export const CATEGORIES = ['plumbing', 'electrical', 'lift', 'cleaning', 'security', 'parking', 'noise', 'water', 'other'].map((v) => ({ value: v, label: label(v) }));
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'].map((v) => ({ value: v, label: label(v) }));
export const STATUSES = ['open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened'].map((v) => ({ value: v, label: label(v) }));
