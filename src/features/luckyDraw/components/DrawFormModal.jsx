import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, FileUpload, Input, Modal, Select, Textarea } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { useCreateDraw, useUpdateDraw } from '../api';
import { fromLocalInput, toLocalInput } from '../lib';

const DAY = 86400000;
const AUDIENCES = [
  { value: 'all_residents', label: 'All residents' },
  { value: 'owners', label: 'Flat owners only' },
  { value: 'tenants', label: 'Tenants only' },
];
const blankPrize = () => ({ key: Math.random().toString(36).slice(2), title: '', quantity: 1, value: '' });

// Create a draft draw, or edit one. After publishing only the wording and cover can change:
// prizes, dates and rules are what members signed up for.
export function DrawFormModal({ draw, onClose, onSaved }) {
  const { t } = useT();
  const editing = Boolean(draw);
  const live = editing && draw.status !== 'draft';
  const [now] = useState(() => Date.now());
  const [v, setV] = useState({
    title: draw?.title || '',
    description: draw?.description || '',
    terms: draw?.terms || 'Entry is free. One prize per person. Prizes cannot be exchanged for cash. The committee decides eligibility.',
    audience: draw?.eligibility?.audience || 'all_residents',
    perFlat: draw?.eligibility?.perFlat || false,
    excludeCommittee: draw?.eligibility?.excludeCommittee || false,
    entryOpensAt: toLocalInput(draw?.entryOpensAt || now),
    entryClosesAt: toLocalInput(draw?.entryClosesAt || now + 7 * DAY),
    drawAt: toLocalInput(draw?.drawAt || now + 7 * DAY + 3600000),
    reserves: draw?.reserves ?? 2,
  });
  const [prizes, setPrizes] = useState(draw?.prizes?.length ? draw.prizes.map((p) => ({ ...p, key: p._id, value: p.value || '' })) : [blankPrize()]);
  const [cover, setCover] = useState([]);
  const [removeCover, setRemoveCover] = useState(false);
  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV((x) => ({ ...x, [k]: val }));
  };
  const setPrize = (key, k, val) => setPrizes((ps) => ps.map((p) => (p.key === key ? { ...p, [k]: val } : p)));

  const done = { onSuccess: (d) => { onClose(); onSaved?.(d); } };
  const create = useCreateDraw(done);
  const update = useUpdateDraw(done);
  const m = editing ? update : create;
  const err = m.error?.fieldErrors || {};

  const submit = (e) => {
    e.preventDefault();
    const text = { title: v.title, description: v.description || undefined, terms: v.terms || undefined };
    if (cover[0]) text.coverImage = cover[0]._id;
    else if (removeCover) text.coverImage = null;
    if (live) return update.mutate({ id: draw._id, ...text });
    const body = {
      ...text,
      prizes: prizes.map((p) => ({ title: p.title, quantity: Number(p.quantity) || 1, value: p.value || undefined, description: p.description || undefined })),
      eligibility: { audience: v.audience, perFlat: v.perFlat, excludeCommittee: v.excludeCommittee },
      entryOpensAt: fromLocalInput(v.entryOpensAt),
      entryClosesAt: fromLocalInput(v.entryClosesAt),
      drawAt: fromLocalInput(v.drawAt),
      reserves: Number(v.reserves) || 0,
    };
    return editing ? update.mutate({ id: draw._id, ...body }) : create.mutate(body);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={editing ? t('Edit {name}', { name: draw.number }) : 'New lucky draw'}
      description={live ? 'This draw is live: prizes, dates and rules are locked.' : 'Saved as a draft. Members see it only after you publish.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="draw-form" loading={m.isPending}>{editing ? 'Save changes' : 'Save draft'}</Button>
        </>
      }
    >
      <form id="draw-form" onSubmit={submit} className="space-y-4">
        <Input label="Title" required value={v.title} onChange={set('title')} error={err.title} placeholder="Diwali Bumper Draw" />
        <Textarea label="Description" value={v.description} onChange={set('description')} error={err.description} />

        <fieldset disabled={live} className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">
            {t('Prizes')} <span className="font-normal text-slate-500">{t('(given in this order)')}</span>
          </legend>
          {prizes.map((p, i) => (
            <div key={p.key} className="grid grid-cols-[1fr_5.5rem] gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_5.5rem_10rem_auto] sm:items-end">
              <Input label={t('Prize {n}', { n: i + 1 })} required value={p.title} onChange={(e) => setPrize(p.key, 'title', e.target.value)} error={err[`prizes.${i}.title`]} placeholder="Smart TV" />
              <Input label="How many" type="number" min={1} max={100} required value={p.quantity} onChange={(e) => setPrize(p.key, 'quantity', e.target.value)} error={err[`prizes.${i}.quantity`]} />
              <Input label="Value (optional)" value={p.value} onChange={(e) => setPrize(p.key, 'value', e.target.value)} placeholder="Worth ₹28,000" className="col-span-2 sm:col-span-1" />
              {prizes.length > 1 && !live && (
                <Button variant="ghost" size="sm" icon={Trash2} aria-label={t('Remove prize {n}', { n: i + 1 })} className="col-span-2 justify-self-end sm:col-span-1 sm:mb-0.5" onClick={() => setPrizes((ps) => ps.filter((x) => x.key !== p.key))}>
                  <span className="sm:hidden">{t('Remove')}</span>
                </Button>
              )}
            </div>
          ))}
          {!live && prizes.length < 20 && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setPrizes((ps) => [...ps, blankPrize()])}>Add prize</Button>}
          {err.prizes && <p className="text-xs text-red-600">{err.prizes}</p>}
        </fieldset>

        <fieldset disabled={live} className="space-y-3">
          <legend className="mb-1 text-sm font-medium text-slate-700">{t('Who can join')}</legend>
          <Select label="Audience" value={v.audience} onChange={set('audience')} options={AUDIENCES} />
          <div className="flex flex-col gap-2">
            <Checkbox label="One entry per flat (instead of one per member)" checked={v.perFlat} onChange={set('perFlat')} />
            <Checkbox label="Committee office-bearers cannot take part" checked={v.excludeCommittee} onChange={set('excludeCommittee')} />
          </div>
        </fieldset>

        <fieldset disabled={live} className="grid gap-3 sm:grid-cols-2">
          <Input label="Entries open" type="datetime-local" required value={v.entryOpensAt} onChange={set('entryOpensAt')} error={err.entryOpensAt} />
          <Input label="Entries close" type="datetime-local" required value={v.entryClosesAt} onChange={set('entryClosesAt')} error={err.entryClosesAt} />
          <Input label="Draw time" type="datetime-local" required value={v.drawAt} onChange={set('drawAt')} error={err.drawAt} hint="The draw runs by itself at this time" />
          <Input label="Reserves" type="number" min={0} max={10} value={v.reserves} onChange={set('reserves')} error={err.reserves} hint="Back-ups if a winner can't collect" />
        </fieldset>

        <Textarea label="Terms" rows={4} value={v.terms} onChange={set('terms')} error={err.terms} hint="Shown to members. Entry must stay free: a paid draw would be a regulated lottery." />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-700">{t('Cover image (optional)')}</p>
          {draw?.coverImage?.url && !cover.length && !removeCover && (
            <div className="flex items-center gap-3">
              <img src={draw.coverImage.url} alt="" className="h-16 w-28 rounded-lg object-cover" />
              <Button variant="ghost" size="sm" onClick={() => setRemoveCover(true)}>Remove</Button>
            </div>
          )}
          <FileUpload folder="luckydraw" files={cover} onChange={setCover} max={1} label="Choose image" />
        </div>
      </form>
    </Modal>
  );
}
