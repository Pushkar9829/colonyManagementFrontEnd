import { MessageCircle } from 'lucide-react';
import { useT } from '../../../context/LanguageContext';
import { useWhatsApp } from '../api';
import { waLink } from '../lib';

// "Send on WhatsApp" for click-to-chat societies: opens wa.me with the prepared text. Renders nothing in
// other modes (off, or api where the system already sends it). `always` shows it whatever the mode.
export function SendOnWhatsApp({ text, phone, label = 'Send on WhatsApp', always = false, className = '' }) {
  const { t } = useT();
  const { data } = useWhatsApp();
  if (!always && data?.mode !== 'click_to_chat') return null;
  return (
    <a href={waLink(text, phone)} target="_blank" rel="noreferrer"
      className={`inline-flex min-h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 ${className}`}>
      <MessageCircle className="size-3.5" aria-hidden="true" />{t(label)}
    </a>
  );
}
