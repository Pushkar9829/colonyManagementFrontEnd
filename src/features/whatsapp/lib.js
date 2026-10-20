// wa.me "click to chat" links. Indian 10-digit numbers get the 91 country code; without a phone the link
// opens WhatsApp's contact picker with the text ready.
export function waLink(text, phone) {
  const digits = (phone || '').replace(/[^\d]/g, '');
  const to = !digits ? '' : digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, '');
  return `https://wa.me/${to}?text=${encodeURIComponent(text || '')}`;
}

export const MODE_LABELS = { off: 'Off', click_to_chat: 'Click-to-chat', api: 'Automatic (API)' };
export const MODE_HELP = {
  off: 'WhatsApp is switched off for this society.',
  click_to_chat: 'Nothing is sent automatically. “Send on WhatsApp” buttons open WhatsApp with the message ready.',
  api: 'Bills, receipts, reminders, SOS alerts and wishes go out automatically. Each message uses one credit.',
};
export const KIND_LABELS = { bill: 'Bills', receipt: 'Receipts', reminder: 'Reminders', sos: 'SOS', wishes: 'Wishes', notice: 'Notices', other: 'Other' };
