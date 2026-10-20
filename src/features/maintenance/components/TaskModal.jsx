import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Attachments, Badge, Button, Checkbox, FileUpload, Input, Modal, Select, Spinner, Textarea } from '../../../components/ui';
import { date, dateTime, label } from '../../../lib/format';
import { useCompleteTask, useTask } from '../api';
import { PRIORITIES, TASK_TONES } from '../constants';
import { useT } from '../../../context/LanguageContext';

function inRange(item, v) {
  if (v === '' || v === undefined) return true;
  const n = Number(v);
  return (item.min === undefined || item.min === null || n >= item.min) && (item.max === undefined || item.max === null || n <= item.max);
}

// Fill a PPM checklist (readings, yes/no, notes, photos) — or view a completed one.
export function TaskModal({ taskId, open, onClose }) {
  const { t } = useT();
  const { data: task, isLoading } = useTask(open ? taskId : null);
  const [answers, setAnswers] = useState({});
  const [photos, setPhotos] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [raise, setRaise] = useState(false);
  const [bd, setBd] = useState({ title: '', priority: 'high' });
  const complete = useCompleteTask({ onSuccess: onClose });

  useEffect(() => {
    if (!open) return;
    setAnswers({});
    setPhotos([]);
    setRemarks('');
    setRaise(false);
    setBd({ title: '', priority: 'high' });
  }, [open, taskId]);

  const editable = task && ['pending', 'overdue'].includes(task.status);
  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const failing = task?.checklist?.filter((i) => (i.type === 'yes_no' && answers[i._id] === false) || (i.type === 'reading' && !inRange(i, answers[i._id]))) || [];

  const submit = () =>
    complete.mutate({
      id: task._id,
      results: task.checklist
        .filter((i) => answers[i._id] !== undefined && answers[i._id] !== '')
        .map((i) => ({ itemId: i._id, value: i.type === 'reading' ? Number(answers[i._id]) : answers[i._id] })),
      photos: photos.map((p) => p._id),
      remarks: remarks || undefined,
      raiseBreakdown: raise && bd.title ? bd : undefined,
    });

  return (
    <Modal open={open} onClose={onClose} title={task?.title || 'PPM task'} description={task ? t('{asset} ({code}) · due {date}', { asset: task.asset?.name, code: task.asset?.code, date: date(task.dueDate) }) : undefined} size="lg"
      footer={editable ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={complete.isPending} onClick={submit}>Mark done</Button></> : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      {isLoading || !task ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TASK_TONES[task.status]}>{t(label(task.status))}</Badge>
            {task.late && <Badge tone="amber">{t('Done late')}</Badge>}
            {task.hasIssues && <Badge tone="red">{t('Issues found')}</Badge>}
            {task.assignee && <span className="text-xs text-slate-500">{t('Assigned to {name}', { name: task.assignee.name })}</span>}
          </div>
          {task.description && <p className="text-sm text-slate-600">{task.description}</p>}

          {editable ? (
            <div className="space-y-3">
              {task.checklist.map((item) => (
                <div key={item._id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">{item.label}{item.required && <span className="text-red-500"> *</span>}</p>
                  {item.type === 'yes_no' && (
                    <div className="mt-2 flex gap-2">
                      {[[true, 'Yes / OK'], [false, 'No / Issue']].map(([v, txt]) => (
                        <button key={txt} type="button" onClick={() => set(item._id, v)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${answers[item._id] === v ? (v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-slate-200 text-slate-600'}`}>
                          {t(txt)}
                        </button>
                      ))}
                    </div>
                  )}
                  {item.type === 'reading' && (
                    <Input className="mt-2" type="number" step="any" inputMode="decimal" placeholder={[item.min !== undefined && item.min !== null ? t('min {n}', { n: item.min }) : null, item.max !== undefined && item.max !== null ? t('max {n}', { n: item.max }) : null].filter(Boolean).join(' · ') || 'Reading'}
                      value={answers[item._id] ?? ''} onChange={(e) => set(item._id, e.target.value)} error={!inRange(item, answers[item._id]) ? (item.unit ? t('Outside the normal range ({unit})', { unit: item.unit }) : t('Outside the normal range')) : undefined}
                      hint={item.unit ? t('Unit: {unit}', { unit: item.unit }) : undefined} />
                  )}
                  {item.type === 'text' && <Input className="mt-2" value={answers[item._id] ?? ''} onChange={(e) => set(item._id, e.target.value)} />}
                </div>
              ))}
              <Textarea label="Remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              <FileUpload folder="facility" files={photos} onChange={setPhotos} camera label="Add photo" max={6} />
              {failing.length > 0 && (
                <div className="space-y-3 rounded-lg bg-amber-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-800"><AlertTriangle className="size-4" />{t('{n} check(s) failed — managers will be told.', { n: failing.length })}</p>
                  <Checkbox label="Also report a breakdown for this asset" checked={raise} onChange={(e) => setRaise(e.target.checked)} />
                  {raise && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input className="sm:col-span-2" label="Breakdown title" value={bd.title} onChange={(e) => setBd((b) => ({ ...b, title: e.target.value }))} placeholder="e.g. Battery not holding charge" />
                      <Select label="Priority" options={PRIORITIES} value={bd.priority} onChange={(e) => setBd((b) => ({ ...b, priority: e.target.value }))} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {task.results?.length ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {task.results.map((r) => (
                    <li key={r.itemId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="text-slate-700">{r.label}</span>
                      <span className={r.ok ? 'font-medium text-slate-900' : 'font-semibold text-red-600'}>
                        {r.type === 'yes_no' ? (r.value ? t('Yes') : t('No')) : `${r.value}${r.unit ? ` ${r.unit}` : ''}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">{task.status === 'skipped' ? t('Skipped: {reason}', { reason: task.skipReason }) : t('No checklist recorded.')}</p>}
              {task.remarks && <p className="text-sm text-slate-600">“{task.remarks}”</p>}
              <Attachments items={task.photos} />
              {task.completedAt && <p className="text-xs text-slate-500">{t('Done by {name} · {time}', { name: task.completedBy?.name || '', time: dateTime(task.completedAt) })}</p>}
              {task.breakdown && <p className="text-xs text-slate-500">{t('Breakdown {number} ({status})', { number: task.breakdown.number, status: t(label(task.breakdown.status)) })}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
