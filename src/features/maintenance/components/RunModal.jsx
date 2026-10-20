import { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Attachments, Badge, Button, FileUpload, Modal, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { dateTime, label } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useCompleteRun, useVerifyRun } from '../api';
import { RUN_TONES } from '../constants';
import { useT } from '../../../context/LanguageContext';

// Fill a housekeeping checklist with photo proof, or verify one as a supervisor.
export function RunModal({ run, onClose }) {
  const { user } = useAuth();
  const { t } = useT();
  const manager = isManager(user);
  const [done, setDone] = useState({});
  const [photos, setPhotos] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [note, setNote] = useState('');
  const complete = useCompleteRun({ onSuccess: onClose });
  const verify = useVerifyRun({ onSuccess: onClose });
  useEffect(() => {
    if (!run) return;
    setDone(Object.fromEntries(run.items.map((i) => [i.itemId, Boolean(i.done)])));
    setPhotos([]);
    setRemarks('');
    setNote('');
  }, [run]);
  if (!run) return null;
  const editable = ['pending', 'rejected'].includes(run.status);
  const toggle = (id) => editable && setDone((d) => ({ ...d, [id]: !d[id] }));

  return (
    <Modal open onClose={onClose} title={`${run.name} · ${run.slot}`} description={t('{date} · due {time}', { date: run.date, time: dateTime(run.dueAt) })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {editable && <Button loading={complete.isPending} onClick={() => complete.mutate({ id: run._id, items: run.items.map((i) => ({ itemId: i.itemId, done: Boolean(done[i.itemId]) })), photos: photos.map((p) => p._id), remarks: remarks || undefined })}>Submit</Button>}
          {manager && run.status === 'completed' && (
            <>
              <Button variant="danger" loading={verify.isPending} onClick={() => verify.mutate({ id: run._id, approved: false, note: note || undefined })}>Send back</Button>
              <Button variant="success" loading={verify.isPending} onClick={() => verify.mutate({ id: run._id, approved: true, note: note || undefined })}>Verify</Button>
            </>
          )}
        </>
      }>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={RUN_TONES[run.status]}>{t(label(run.status))}</Badge>
          {run.completedBy && <span className="text-xs text-slate-500">{t('by {name} · {time}', { name: run.completedBy.name, time: dateTime(run.completedAt) })}</span>}
        </div>
        {run.status === 'rejected' && run.verifyNote && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t('Supervisor: {note}', { note: run.verifyNote })}</p>}
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {run.items.map((i) => (
            <li key={i.itemId}>
              <button type="button" onClick={() => toggle(i.itemId)} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm" disabled={!editable}>
                {done[i.itemId] ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-slate-300" />}
                <span className={done[i.itemId] ? 'text-slate-800' : 'text-slate-600'}>{i.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {editable ? (
          <>
            <FileUpload folder="facility" files={photos} onChange={setPhotos} camera label="Photo proof" max={6} />
            <Textarea label="Remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </>
        ) : (
          <>
            <Attachments items={run.photos} />
            {run.remarks && <p className="text-sm text-slate-600">“{run.remarks}”</p>}
            {manager && run.status === 'completed' && <Textarea label="Note to staff (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
            {run.verifiedBy && <p className="text-xs text-slate-500">{t(run.status === 'verified' ? 'Verified by {name}' : 'Reviewed by {name}', { name: run.verifiedBy.name })}{run.verifyNote ? ` — ${run.verifyNote}` : ''}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
