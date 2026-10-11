import { useState } from 'react';
import { AtSign } from 'lucide-react';
import { Textarea } from '../../../components/ui';
import { useMentionable } from '../api';

// Textarea with an "@ Mention" picker. Picked people are inserted as "@Name" and tracked in
// `mentions` (ids); keepMentions() drops anyone whose @Name was deleted from the text before sending.
export function MentionTextarea({ value, onChange, mentions, onMentionsChange, topic, ...props }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: people = [], isFetching } = useMentionable(topic, search || undefined, open);

  const pick = (p) => {
    const sep = value && !/\s$/.test(value) ? ' ' : '';
    onChange(`${value}${sep}@${p.name} `);
    if (!mentions.some((m) => m._id === p._id)) onMentionsChange([...mentions, { _id: p._id, name: p.name }]);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} {...props} />
      <div className="mt-1 flex items-center justify-between">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
          <AtSign className="size-3.5" /> Mention
        </button>
        <span className="text-[11px] text-slate-400">Links become clickable</span>
      </div>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-72 max-w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or flat" className="mb-2 h-9 w-full rounded-md border border-slate-300 px-2 text-sm focus:border-brand-500 focus:outline-none" />
          <ul className="max-h-52 overflow-y-auto">
            {!people.length && <li className="px-2 py-3 text-center text-xs text-slate-400">{isFetching ? 'Searching…' : 'No one found. Only neighbours in the directory or this thread can be mentioned.'}</li>}
            {people.map((p) => (
              <li key={p._id}>
                <button type="button" onClick={() => pick(p)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                  <span className="truncate font-medium text-slate-800">{p.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{p.units?.join(', ') || p.designation || ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const keepMentions = (text, mentions) => mentions.filter((m) => text.includes(`@${m.name}`)).map((m) => m._id);
