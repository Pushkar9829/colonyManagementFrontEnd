import { cn } from '../../../lib/cn';

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;
const MENTION_RE = /(@[A-Z][\w.'-]*(?: [A-Z][\w.'-]*)?)/g;

// Plain text with line breaks, clickable links and highlighted @mentions. Never renders HTML from
// the text, so posts can't inject markup.
export function RichText({ text = '', className, mentions = true }) {
  const parts = text.split(URL_RE);
  return (
    <p className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              {part}
            </a>
          );
        }
        if (!mentions) return part;
        return part.split(MENTION_RE).map((piece, j) =>
          // eslint-disable-next-line react/no-array-index-key
          j % 2 === 1 ? <span key={`${i}-${j}`} className="font-medium text-brand-700">{piece}</span> : piece,
        );
      })}
    </p>
  );
}

export function Avatar({ name = '?', className }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700', className)}>{initials}</span>;
}

// "Ravi Iyer · A-101"
export const personLine = (p) => (p ? `${p.name}${p.units?.length ? ` · ${p.units.join(', ')}` : p.designation ? ` · ${p.designation}` : ''}` : '');
