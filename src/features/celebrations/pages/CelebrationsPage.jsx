import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cake, Copy, Heart, PartyPopper } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, Input, Select, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { date, label } from '../../../lib/format';
import { SendOnWhatsApp } from '../../whatsapp/components/SendOnWhatsApp';
import { MODE_LABELS } from '../../whatsapp/lib';
import { useCelebrationSettings, usePreviewWish, useSaveCelebrationSettings, useUpcomingCelebrations } from '../api';

const when = (d) => (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`);

function Upcoming() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useUpcomingCelebrations(days);
  const toast = useToast();
  const copy = (text) => { navigator.clipboard?.writeText(text); toast.success('Message copied'); };
  return (
    <Card>
      <CardHeader title="Upcoming celebrations" subtitle={data ? `WhatsApp: ${MODE_LABELS[data.whatsappMode]}${data.whatsappMode === 'api' ? ' — wishes are sent automatically on the day' : ''}` : undefined}
        action={<Select aria-label="Period" className="w-36" value={String(days)} onChange={(e) => setDays(Number(e.target.value))} options={[{ value: '7', label: 'Next 7 days' }, { value: '30', label: 'Next 30 days' }, { value: '60', label: 'Next 60 days' }]} />} />
      {isLoading || !data ? <div className="flex justify-center py-8"><Spinner /></div> : !data.items.length ? (
        <EmptyState icon={PartyPopper} title="No birthdays or anniversaries coming up" description="Members add their dates in My profile and My household." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.items.map((i) => (
            <li key={`${i.kind}-${i.name}-${i.date}-${i.unit}`} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {i.kind === 'birthday' ? <Cake className="mt-0.5 size-5 shrink-0 text-pink-500" aria-label="Birthday" /> : <Heart className="mt-0.5 size-5 shrink-0 text-rose-500" aria-label="Anniversary" />}
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{i.name} <span className="text-xs font-normal text-slate-500">{[i.unit, i.subject === 'family' && label(i.relation)].filter(Boolean).join(' · ')}</span></p>
                  <p className="text-xs text-slate-500">
                    {i.kind === 'birthday' ? `Turns ${i.years}` : `${i.years} years married`} · {date(i.date)} · <span className={i.daysAway === 0 ? 'font-semibold text-pink-700' : ''}>{when(i.daysAway)}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
                {i.wished && <Badge tone="green">Wished</Badge>}
                {i.phone && <SendOnWhatsApp text={i.message} phone={i.phone} />}
                <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(i.message)}>Copy wish</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Settings() {
  const { data, isLoading } = useCelebrationSettings();
  const save = useSaveCelebrationSettings();
  const preview = usePreviewWish();
  const [form, setForm] = useState(null);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, sendTime: data.sendTime, channels: data.channels, language: data.language, templates: data.templates, dashboardCard: data.dashboardCard });
  }, [data]);
  if (isLoading || !form) return <div className="flex justify-center py-8"><Spinner /></div>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setChannel = (k) => (e) => set('channels', { ...form.channels, [k]: e.target.checked });
  const setTemplate = (k) => (e) => set('templates', { ...form.templates, [k]: e.target.value });
  const show = (kind) => preview.mutate({ kind, template: form.templates[kind] || undefined, language: form.language }, { onSuccess: (r) => setShown({ kind, ...r }) });
  return (
    <Card>
      <CardHeader title="Celebrations" subtitle="Automatic birthday and anniversary wishes, sent once a year per person on the day (IST)." />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Checkbox className="sm:col-span-2" label="Send birthday and anniversary wishes" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        <Input label="Send time (IST)" type="time" value={form.sendTime} onChange={(e) => set('sendTime', e.target.value)} />
        <Select label="Default message language" value={form.language} onChange={(e) => set('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी (Hindi)' }]} />
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Channels</p>
          <div className="flex flex-wrap gap-4">
            <Checkbox label="In-app" checked={form.channels.inapp} onChange={setChannel('inapp')} />
            <Checkbox label="Push" checked={form.channels.push} onChange={setChannel('push')} />
            <Checkbox label={`WhatsApp (${MODE_LABELS[data.whatsappMode]})`} checked={form.channels.whatsapp} onChange={setChannel('whatsapp')} />
          </div>
          {data.whatsappMode !== 'api' && <p className="text-xs text-slate-500">WhatsApp wishes go out automatically only in Automatic (API) mode. {data.whatsappMode === 'click_to_chat' ? 'In click-to-chat mode, send them from the Upcoming list.' : ''}</p>}
        </div>
        {['birthday', 'anniversary'].map((kind) => (
          <div key={kind} className="space-y-2">
            <Textarea label={`${label(kind)} message`} rows={4} maxLength={600} placeholder={data.defaults[form.language][kind]} value={form.templates[kind]} onChange={setTemplate(kind)}
              hint={`Placeholders: ${data.placeholders.join(' ')}. Leave blank for the default.`} />
            <Button size="sm" variant="secondary" loading={preview.isPending && preview.variables?.kind === kind} onClick={() => show(kind)}>Preview</Button>
          </div>
        ))}
        {shown && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm sm:col-span-2">
            <p className="font-semibold text-emerald-900">{shown.title}</p>
            <p className="whitespace-pre-wrap text-emerald-900">{shown.message}</p>
          </div>
        )}
        <Checkbox className="sm:col-span-2" label="Show a “Today's birthdays” card on everyone's dashboard (only members who opted in)" checked={form.dashboardCard} onChange={(e) => set('dashboardCard', e.target.checked)} />
        <div className="sm:col-span-2"><Button loading={save.isPending} onClick={() => save.mutate(form)}>Save settings</Button></div>
      </div>
    </Card>
  );
}

export default function CelebrationsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'upcoming';
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Celebrations" description="Birthdays and anniversaries of residents and their families." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={(t) => setParams(t === 'upcoming' ? {} : { tab: t }, { replace: true })} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'settings', label: 'Settings' }]} />
      {tab === 'upcoming' ? <Upcoming /> : <Settings />}
    </div>
  );
}
