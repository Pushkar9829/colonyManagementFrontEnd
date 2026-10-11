import { useRef, useState } from 'react';
import { Camera, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { upload } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/cn';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_MB = 5;

// Uploads files as soon as they are picked and reports their ids via onChange(files).
// `files` items: { _id, url, mimetype, name }. `camera` opens the phone camera directly.
export function FileUpload({ folder, files, onChange, max = 5, camera = false, label = 'Attach files', className }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const toast = useToast();

  const pick = async (e) => {
    const chosen = [...(e.target.files || [])].slice(0, max - files.length);
    e.target.value = '';
    const added = [];
    for (const file of chosen) {
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_MB} MB`);
        continue;
      }
      setBusy((b) => b + 1);
      try {
        const fd = new FormData();
        fd.append('folder', folder);
        fd.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        added.push(await upload('/uploads', fd));
      } catch (err) {
        toast.error(err);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (added.length) onChange([...files, ...added]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <div key={f._id} className="group relative size-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {f.mimetype?.startsWith('image/') ? <img src={f.url} alt={f.name || 'attachment'} className="size-full object-cover" /> : <FileText className="m-auto mt-4 size-7 text-slate-400" />}
            <button type="button" onClick={() => onChange(files.filter((x) => x._id !== f._id))} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-slate-600 shadow hover:text-red-600" aria-label="Remove attachment">
              <X className="size-3" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy > 0}
            className="flex h-16 min-w-16 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : camera ? <Camera className="size-4" /> : <Paperclip className="size-4" />}
            {busy ? 'Uploading…' : label}
          </button>
        )}
      </div>
      <input ref={input} type="file" hidden accept={camera ? 'image/*' : ACCEPT} multiple={!camera && max > 1} capture={camera ? 'environment' : undefined} onChange={pick} />
      <p className="text-[11px] text-slate-400">JPG, PNG, WEBP or PDF · up to {MAX_MB} MB each</p>
    </div>
  );
}

// Read-only list of attachments (images open full size in a new tab).
export function Attachments({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="block size-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-brand-300" title={a.name}>
          {a.mimetype?.startsWith('image/') ? <img src={a.url} alt={a.name || 'attachment'} className="size-full object-cover" /> : (
            <span className="flex size-full flex-col items-center justify-center gap-1 text-[10px] text-slate-500"><FileText className="size-6 text-slate-400" />PDF</span>
          )}
        </a>
      ))}
    </div>
  );
}
