import { useState } from 'react';
import { ArrowDown, ArrowUp, Clock, Moon, Pencil, Plus, Route as RouteIcon, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, Checkbox, EmptyState, Input, Modal, Select, Spinner, StatusBadge } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { useCheckpoints, useCreateRoute, useDeleteRoute, usePatrolRoutes, useUpdateRoute } from '../api';
import { DAYS, daysLabel, isOvernight } from './shared';
import { useT } from '../../../context/LanguageContext';

// The PATCH schema fills `days`/`enforceOrder` defaults when they are absent, so edits always send the whole route.
export const routePayload = (r) => ({
  name: r.name,
  checkpoints: r.checkpoints.map((c) => c._id || c),
  frequencyMinutes: Number(r.frequencyMinutes),
  startTime: r.startTime,
  endTime: r.endTime,
  days: r.days || [],
  enforceOrder: Boolean(r.enforceOrder),
});

function RouteForm({ route, onClose }) {
  const { t } = useT();
  const editing = Boolean(route);
  const { data: checkpoints = [] } = useCheckpoints();
  const { values, bind, set, errors, applyServerErrors } = useForm({
    name: route?.name || '',
    frequencyMinutes: route?.frequencyMinutes ?? 60,
    startTime: route?.startTime || '22:00',
    endTime: route?.endTime || '06:00',
    days: route?.days || [],
    enforceOrder: route?.enforceOrder ?? false,
    active: route?.active ?? true,
  });
  const [stops, setStops] = useState(() => (route?.checkpoints || []).map((c) => ({ _id: c._id, name: c.name, location: c.location })));
  const [pick, setPick] = useState('');
  const create = useCreateRoute({ onSuccess: onClose });
  const update = useUpdateRoute({ onSuccess: onClose });

  const available = checkpoints.filter((c) => c.active && !stops.some((s) => s._id === c._id));
  const add = () => {
    const cp = checkpoints.find((c) => c._id === pick);
    if (cp) setStops((s) => [...s, { _id: cp._id, name: cp.name, location: cp.location }]);
    setPick('');
  };
  const move = (i, d) => setStops((s) => {
    const next = [...s];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });
  const toggleDay = (d) => set('days', values.days.includes(d) ? values.days.filter((x) => x !== d) : [...values.days, d].sort());

  const save = () => {
    const body = routePayload({ ...values, checkpoints: stops });
    if (editing) update.mutate({ id: route._id, ...body, active: values.active }, { onError: applyServerErrors });
    else create.mutate(body, { onError: applyServerErrors });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={editing ? 'Edit route' : 'New patrol route'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} disabled={!stops.length} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Route name" required placeholder="e.g. Night perimeter" {...bind('name')} />
        <Input label="Round every (minutes)" type="number" min={15} max={1440} step={15} required {...bind('frequencyMinutes')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start" type="time" required {...bind('startTime')} />
          <Input label="End" type="time" required {...bind('endTime')} />
        </div>
        {values.startTime && values.endTime && isOvernight(values) && values.startTime !== values.endTime && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500 sm:col-span-2"><Moon className="size-3.5" /> {t('Overnight: runs from {start} until {end} the next morning.', { start: values.startTime, end: values.endTime })}</p>
        )}
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t('Days')} <span className="font-normal text-slate-500">{t('(none selected = every day)')}</span></p>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => toggleDay(i)} aria-pressed={values.days.includes(i)}
                className={cn('h-10 min-w-12 rounded-lg border px-3 text-sm font-medium', values.days.includes(i) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>
                {t(d)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
          <Checkbox label="Checkpoints must be scanned in order" checked={values.enforceOrder} onChange={(e) => set('enforceOrder', e.target.checked)} />
          {editing && <Checkbox label="Active" checked={values.active} onChange={(e) => set('active', e.target.checked)} />}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">{t('Checkpoints')} <span className="text-red-500">*</span></p>
          {stops.length ? (
            <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {stops.map((s, i) => (
                <li key={s._id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-5 text-right text-xs text-slate-400">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{s.name}</p>
                    {s.location && <p className="truncate text-xs text-slate-500">{s.location}</p>}
                  </div>
                  <Button size="sm" variant="ghost" icon={ArrowUp} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('Move up')} />
                  <Button size="sm" variant="ghost" icon={ArrowDown} disabled={i === stops.length - 1} onClick={() => move(i, 1)} aria-label={t('Move down')} />
                  <Button size="sm" variant="ghost" icon={X} className="text-red-600" onClick={() => setStops((x) => x.filter((_, j) => j !== i))} aria-label={t('Remove')} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">{t('Add at least one checkpoint')}</p>
          )}
          {errors.checkpoints && <p className="text-xs text-red-600">{errors.checkpoints}</p>}
          <div className="flex gap-2">
            <Select className="flex-1" placeholder={available.length ? 'Choose a checkpoint…' : 'No more active checkpoints'} options={available.map((c) => ({ value: c._id, label: c.location ? `${c.name} — ${c.location}` : c.name }))} value={pick} onChange={(e) => setPick(e.target.value)} />
            <Button variant="secondary" icon={Plus} disabled={!pick} onClick={add}>Add</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function RoutesTab({ manager }) {
  const { t } = useT();
  const { data, isLoading } = usePatrolRoutes();
  const [editing, setEditing] = useState(null); // null | 'new' | route
  const [deleting, setDeleting] = useState(null);
  const del = useDeleteRoute({ onSuccess: () => setDeleting(null) });
  const update = useUpdateRoute();

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  return (
    <div className="space-y-4">
      {manager && (
        <div className="flex justify-end">
          <Button icon={Plus} onClick={() => setEditing('new')}>New route</Button>
        </div>
      )}
      {!data?.length ? (
        <Card><EmptyState icon={RouteIcon} title="No patrol routes" description={manager ? 'Create checkpoints first, then group them into a route with a schedule.' : 'Ask the facility manager to set up patrol routes.'} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((r) => (
            <Card key={r._id} className={cn(!r.active && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{r.name}</h3>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="size-3.5" />{r.startTime}–{r.endTime}{isOvernight(r) && ` ${t('(overnight)')}`}</span>
                    <span>· {t('every {n} min', { n: r.frequencyMinutes })}</span>
                  </p>
                  <p className="text-xs text-slate-500">{daysLabel(r.days, t)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={r.active ? 'active' : 'inactive'} />
                  {r.enforceOrder && <Badge tone="brand">{t('In order')}</Badge>}
                </div>
              </div>
              <ol className="space-y-1 px-5 py-3 text-sm">
                {r.checkpoints.map((c, i) => (
                  <li key={c._id} className="flex gap-2">
                    <span className="w-5 text-right text-xs leading-5 text-slate-400">{i + 1}.</span>
                    <span className={cn('text-slate-700', c.active === false && 'text-slate-400 line-through')}>{c.name}</span>
                    {c.location && <span className="truncate text-xs leading-5 text-slate-400">{c.location}</span>}
                  </li>
                ))}
              </ol>
              {manager && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">
                  <Button size="sm" variant="secondary" loading={update.isPending && update.variables?.id === r._id}
                    onClick={() => update.mutate({ id: r._id, ...routePayload(r), active: !r.active })}>
                    {r.active ? t('Deactivate') : t('Activate')}
                  </Button>
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(r)}>Edit</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600" onClick={() => setDeleting(r)}>Delete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && <RouteForm route={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} size="sm" title={t('Delete {name}?', { name: deleting?.name })}
        footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" loading={del.isPending} onClick={() => del.mutate(deleting._id)}>Delete</Button></>}>
        <p className="text-sm text-slate-600">{t('Past rounds stay in the history. To pause patrols temporarily, deactivate the route instead.')}</p>
      </Modal>
    </div>
  );
}
