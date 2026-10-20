// Shared wording for payment settings (society page and platform console).
export const MODE_LABELS = {
  own: 'Own Razorpay account',
  route: 'Razorpay Route (through ColonyHub)',
  platform_legacy: 'ColonyHub account (older setup)',
  disabled: 'Not set up',
};

export const STATUS_BADGES = {
  active: { tone: 'green', text: 'Live' },
  setup: { tone: 'amber', text: 'Setup incomplete' },
  off: { tone: 'slate', text: 'Off' },
  blocked: { tone: 'red', text: 'Blocked by ColonyHub' },
};

export const ROUTE_TONES = { active: 'green', pending: 'amber', suspended: 'red' };
