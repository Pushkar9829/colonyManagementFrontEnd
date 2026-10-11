import { Badge } from '../../components/ui';

export const ELIGIBILITY = [
  { value: 'unit_owner', label: 'One vote per flat, cast by an owner (default)' },
  { value: 'unit_any', label: 'One vote per flat, any resident' },
  { value: 'member', label: 'One vote per owner (person)' },
];

const STATUS = {
  draft: ['slate', 'Draft'],
  nominations: ['blue', 'Nominations open'],
  scrutiny: ['amber', 'Scrutiny'],
  voting: ['brand', 'Voting open'],
  closed: ['amber', 'Counting done'],
  published: ['green', 'Results published'],
  cancelled: ['red', 'Cancelled'],
};

export function ElectionStatus({ status }) {
  const [tone, text] = STATUS[status] || ['slate', status];
  return <Badge tone={tone}>{text}</Badge>;
}

export const NOMINATION_LABEL = {
  pending_acceptance: 'Awaiting acceptance',
  accepted: 'Awaiting scrutiny',
  approved: 'Approved',
  rejected: 'Rejected',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};
