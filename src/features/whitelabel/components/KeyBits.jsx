import { Badge } from '../../../components/ui';

const TONES = { unused: 'sky', active: 'green', revoked: 'slate' };
const TERMS = { monthly: '1 month', quarterly: '3 months', yearly: '1 year' };

export const KeyStatusBadge = ({ status }) => <Badge tone={TONES[status] || 'slate'}>{status === 'unused' ? 'Unused' : status === 'active' ? 'Used' : 'Revoked'}</Badge>;

// What a key prepays: "1 year", "36 months one-time", "lifetime".
export const termText = ({ cycle, validityMonths }) => (cycle === 'one_time' ? (validityMonths ? `${validityMonths} months one-time` : 'lifetime') : TERMS[cycle] || cycle);
