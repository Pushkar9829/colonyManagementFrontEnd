import { Attachments, Badge, StatusBadge } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { dateTime, label } from '../../../lib/format';
import { useT } from '../../../context/LanguageContext';

// Priority in words a committee member would use.
export const PRIORITY_TEXT = { urgent: 'Urgent', high: 'High', medium: 'Normal', low: 'Low' };
const PRIORITY_TONE = { urgent: 'red', high: 'amber', medium: 'slate', low: 'slate' };
const PRIORITY_BADGE = { urgent: 'Urgent priority', high: 'High priority', medium: 'Normal priority', low: 'Low priority' };
export function PriorityText({ priority }) {
  const { t } = useT();
  return <Badge tone={PRIORITY_TONE[priority] || 'slate'}>{PRIORITY_BADGE[priority] ? t(PRIORITY_BADGE[priority]) : t('{priority} priority', { priority: label(priority) })}</Badge>;
}

export function SlaBadge({ ticket }) {
  const { t } = useT();
  if (ticket.slaBreached) return <Badge tone="red">{t('Reply overdue')}</Badge>;
  if (!ticket.firstResponseAt && ['open', 'in_progress', 'waiting_on_customer'].includes(ticket.status)) return <Badge tone="amber">{t('Reply due {when}', { when: dateTime(ticket.slaDueAt) })}</Badge>;
  return null;
}

// Conversation between the society (left) and the platform team (right).
export function TicketThread({ ticket, viewer }) {
  const { t } = useT();
  const first = { _id: 'first', side: 'society', by: ticket.raisedBy, text: ticket.description || ticket.subject, attachments: ticket.attachments, createdAt: ticket.createdAt };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={ticket.status} />
        <PriorityText priority={ticket.priority} />
        <Badge>{t(label(ticket.category))}</Badge>
        <SlaBadge ticket={ticket} />
      </div>
      <ul className="space-y-3">
        {[first, ...(ticket.messages || [])].map((m) => {
          const mine = m.side === viewer;
          return (
            <li key={m._id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-xl px-4 py-2.5 text-sm', mine ? 'bg-brand-50 text-slate-800' : 'bg-slate-100 text-slate-800')}>
                <p className="mb-1 text-xs text-slate-500">
                  {m.side === 'platform' ? t('{name} · ColonyHub support', { name: m.by?.name || 'ColonyHub' }) : m.by?.name || t('Society')} · {dateTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.attachments?.length > 0 && <div className="mt-2"><Attachments items={m.attachments} /></div>}
              </div>
            </li>
          );
        })}
      </ul>
      {ticket.history?.length > 1 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">{t('Status history')}</summary>
          <ul className="mt-2 space-y-1">
            {ticket.history.map((h) => <li key={`${h.createdAt}-${h.to}`}>{dateTime(h.createdAt)} · {h.by?.name || t('System')} · {h.from ? `${t(label(h.from))} → ` : ''}{t(label(h.to))}{h.note ? ` — ${h.note}` : ''}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
