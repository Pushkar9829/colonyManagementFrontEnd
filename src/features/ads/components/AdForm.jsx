import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { ROLE_LABELS } from '../../../lib/roles';
import { useT } from '../../../context/LanguageContext';
import { uploadAdMedia, usePlatformAdSocieties, useSaveAd } from '../api';
import { AD_ROLES, FREQUENCIES, PLACEMENTS, fromLocalInput, toLocalInput } from '../lib';
import { AdMedia } from './AdMedia';

const IMAGE_MB = 5;
const VIDEO_MB = 20;

function MediaPicker({ scope, label, accept, value, onChange, hint }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useT();
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const cap = file.type.startsWith('video/') ? VIDEO_MB : IMAGE_MB;
    if (file.size > cap * 1024 * 1024) {
      toast.error(t('{name} is larger than {cap} MB', { name: file.name, cap }));
      return;
    }
    setBusy(true);
    try {
      onChange(await uploadAdMedia(scope, file));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        {value && <AdMedia ad={{ mediaType: value.mimetype.startsWith('video/') ? 'video' : 'image', media: value, title: t('Preview') }} className="h-14 w-24 rounded-md" />}
        <Button variant="secondary" size="sm" icon={busy ? Loader2 : Upload} disabled={busy} onClick={() => input.current?.click()}>{value ? 'Replace' : 'Upload'}</Button>
        <input ref={input} type="file" hidden accept={accept} onChange={pick} />
      </div>
    </Field>
  );
}

function SocietyPicker({ selected, onChange }) {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const { data } = usePlatformAdSocieties({ search: search || undefined, limit: 20 });
  const ids = new Set(selected.map((s) => String(s._id)));
  const toggle = (s) => onChange(ids.has(String(s._id)) ? selected.filter((x) => String(x._id) !== String(s._id)) : [...selected, { _id: s._id, name: s.name }]);
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      {selected.length > 0 && <p className="text-xs text-slate-600">{t('Selected: {names}', { names: selected.map((s) => s.name).join(', ') })}</p>}
      <Input aria-label="Search societies" placeholder="Search societies" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {data?.data?.map((s) => <Checkbox key={s._id} label={`${s.name}${s.city ? ` · ${s.city}` : ''}`} checked={ids.has(String(s._id))} onChange={() => toggle(s)} />)}
      </div>
    </div>
  );
}

// Create / edit an ad. Same form for society ads and platform ads; platform ads also choose societies.
export function AdForm({ scope, ad, onClose }) {
  const { t } = useT();
  const editing = Boolean(ad?._id);
  const now = new Date();
  const [v, setV] = useState({
    title: ad?.title || '',
    body: ad?.body || '',
    landingUrl: ad?.landingUrl || 'https://',
    ctaLabel: ad?.ctaLabel || 'Learn more',
    placement: ad?.placement || 'banner',
    frequency: ad?.frequency || 'daily',
    priority: String(ad?.priority ?? 0),
    startAt: toLocalInput(ad?.startAt || now),
    endAt: toLocalInput(ad?.endAt || new Date(now.getTime() + 14 * 86400000)),
    active: ad?.active ?? true,
    roles: ad?.audience?.roles || [],
    allSocieties: ad?.audience?.allSocieties ?? true,
    societies: ad?.audience?.societies || [],
    platform: ad?.audience?.platform ?? false,
  });
  const [media, setMedia] = useState(ad ? { ...ad.media, existing: true } : null);
  const [poster, setPoster] = useState(ad?.poster ? { ...ad.poster, existing: true } : null);
  const [errors, setErrors] = useState({});
  const save = useSaveAd(scope, { onSuccess: onClose });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggleRole = (r) => setV((x) => ({ ...x, roles: x.roles.includes(r) ? x.roles.filter((y) => y !== r) : [...x.roles, r] }));
  const isVideo = media?.mimetype?.startsWith('video/');
  const hasPopup = v.placement !== 'banner';

  const submit = () => {
    const body = {
      title: v.title,
      body: v.body || undefined,
      landingUrl: v.landingUrl,
      ctaLabel: v.ctaLabel,
      placement: v.placement,
      frequency: v.frequency,
      priority: Number(v.priority) || 0,
      startAt: fromLocalInput(v.startAt),
      endAt: fromLocalInput(v.endAt),
      active: v.active,
      audience: scope === 'platform'
        ? { roles: v.roles, allSocieties: v.allSocieties, societies: v.allSocieties ? [] : v.societies.map((s) => s._id), platform: v.platform }
        : { roles: v.roles },
    };
    if (media && !media.existing) body.mediaId = media._id;
    if (poster && !poster.existing) body.posterId = poster._id;
    if (!poster && ad?.poster) body.posterId = null;
    if (!editing && !body.mediaId) {
      setErrors({ mediaId: 'Upload an image or video' });
      return;
    }
    save.mutate({ id: ad?._id, ...body }, { onError: (err) => setErrors(err.fieldErrors || {}) });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={editing ? t('Edit “{title}”', { title: ad.title }) : 'New ad'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" required maxLength={80} value={v.title} onChange={set('title')} error={errors.title} />
        <Textarea className="sm:col-span-2" label="Short text" rows={2} maxLength={200} value={v.body} onChange={set('body')} error={errors.body} />
        <div className="sm:col-span-2">
          <MediaPicker scope={scope} label="Image or video" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" value={media} onChange={(m) => { setMedia(m); setErrors((e) => ({ ...e, mediaId: undefined })); }}
            hint={t('JPG, PNG or WEBP up to {imageMb} MB, or MP4 / WebM up to {videoMb} MB. Videos play muted.', { imageMb: IMAGE_MB, videoMb: VIDEO_MB })} />
          {errors.mediaId && <p className="mt-1 text-xs text-red-600">{t(errors.mediaId)}</p>}
        </div>
        {isVideo && (
          <div className="sm:col-span-2">
            <MediaPicker scope={scope} label="Poster image (optional)" accept="image/jpeg,image/png,image/webp" value={poster} onChange={setPoster} hint="Shown before the video loads, and to people who prefer less motion." />
            {poster && <button type="button" className="mt-1 text-xs text-slate-500 underline" onClick={() => setPoster(null)}>{t('Remove poster')}</button>}
          </div>
        )}
        <Input label="Link (https)" required type="url" value={v.landingUrl} onChange={set('landingUrl')} error={errors.landingUrl} />
        <Input label="Button text" required maxLength={24} value={v.ctaLabel} onChange={set('ctaLabel')} error={errors.ctaLabel} />
        <Select label="Where" options={PLACEMENTS} value={v.placement} onChange={set('placement')} />
        {hasPopup ? <Select label="Pop-up shows" options={FREQUENCIES} value={v.frequency} onChange={set('frequency')} /> : <div className="hidden sm:block" />}
        <Input label="Starts" type="datetime-local" required value={v.startAt} onChange={set('startAt')} error={errors.startAt} />
        <Input label="Ends" type="datetime-local" required value={v.endAt} onChange={set('endAt')} error={errors.endAt} />
        <Input label="Priority" type="number" min={0} max={100} hint="Higher shows first" value={v.priority} onChange={set('priority')} error={errors.priority} />
        <Checkbox className="sm:mt-7" label="Active" checked={v.active} onChange={set('active')} />
        <Field className="sm:col-span-2" label="Who sees it" hint="Nothing ticked = everyone">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {AD_ROLES.map((r) => <Checkbox key={r} label={ROLE_LABELS[r] || r} checked={v.roles.includes(r)} onChange={() => toggleRole(r)} />)}
          </div>
        </Field>
        {scope === 'platform' && (
          <div className="space-y-2 sm:col-span-2">
            <Checkbox label="All societies" checked={v.allSocieties} onChange={set('allSocieties')} />
            {!v.allSocieties && <SocietyPicker selected={v.societies} onChange={(societies) => setV((x) => ({ ...x, societies }))} />}
            <Checkbox label="Also show in the platform console" checked={v.platform} onChange={set('platform')} />
          </div>
        )}
      </div>
    </Modal>
  );
}
