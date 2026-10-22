import { useRef, useState } from 'react';
import { ImagePlus, Lock, Trash2 } from 'lucide-react';
import { upload } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, CardHeader, ErrorState, PageLoader } from '../../../components/ui';
import { useTemplate } from '../../../context/TemplateContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { label } from '../../../lib/format';
import { useSocietyBranding } from '../../whitelabel/api';
import { appNameOf } from '../../whitelabel/brand';
import { useAppearanceOptions, useApplyTemplate, useSetMedia } from '../api';
import { TemplateCard, TemplatePreview } from '../components/TemplateCard';
import { ApplyTemplateDialog } from '../components/PreviewBanner';

// Logo / cover photo: upload to the uploads service, then save the upload id on the colony.
function MediaPicker({ title, hint, url, field, wide }) {
  const { t } = useT();
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const save = useSetMedia();
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('folder', 'appearance');
      form.append('file', file);
      const up = await upload('/uploads', form);
      await save.mutateAsync({ [field]: up._id });
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className={wide ? 'tpl-cover aspect-[8/3] w-full overflow-hidden rounded-lg sm:w-64' : 'flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50'}>
        {url ? <img src={url} alt="" className={wide ? 'size-full object-cover' : 'size-full object-contain p-1'} /> : !wide && <ImagePlus className="size-7 text-slate-400" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">{t(title)}</p>
        <p className="mt-0.5 text-sm text-slate-500">{t(hint)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
          <Button size="sm" variant="secondary" icon={ImagePlus} loading={busy} onClick={() => input.current?.click()}>{url ? 'Change' : 'Upload'}</Button>
          {url && <Button size="sm" variant="ghost" icon={Trash2} loading={save.isPending && !busy} onClick={() => save.mutate({ [field]: null })}>Remove</Button>}
        </div>
      </div>
    </div>
  );
}

// Settings → Appearance (society admin): pick the colony's app template, try it first, upload logo and cover.
export default function AppearancePage() {
  const { t } = useT();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useAppearanceOptions();
  const { preview, startPreview } = useTemplate();
  const branding = useSocietyBranding(true);
  const apply = useApplyTemplate({ onSuccess: () => setAsking(null) });
  const [asking, setAsking] = useState(null);
  const [trying, setTrying] = useState(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const current = data.templates.find((x) => x.key === data.current);
  const lockText = (tpl) => (tpl.availableOn ? t('Available on {plan}', { plan: t(label(tpl.availableOn)) }) : t('Not in your plan'));
  const tryIt = async (key) => {
    setTrying(key);
    try {
      await startPreview(key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err);
    } finally {
      setTrying(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Appearance" description="Choose how the app looks for everyone in your colony: colours, fonts, the login page and the home screen." />

      {!data.adminMayChange ? (
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          {current && <TemplatePreview template={current} className="w-full sm:w-56" />}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Lock className="size-4" aria-hidden />{t('Set by {app}', { app: appNameOf(branding.data) })}</p>
            <p className="mt-1 text-sm text-slate-600">{t('Your colony uses {name}. Contact {app} support to change it.', { name: t(current?.name || data.current), app: appNameOf(branding.data) })}</p>
          </div>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-600">{t('“Try it” shows a template only to you, on every page, until you apply or cancel it. “Apply” changes it for the whole colony.')}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.templates.map((tpl) => {
              const isCurrent = tpl.key === data.current;
              const locked = !tpl.allowed;
              return (
                <TemplateCard key={tpl.key} template={tpl} current={isCurrent} locked={locked} lockText={lockText(tpl)}>
                  <Button size="sm" variant="secondary" loading={trying === tpl.key} disabled={preview?.key === tpl.key} onClick={() => tryIt(tpl.key)}>
                    {preview?.key === tpl.key ? 'Previewing' : 'Try it'}
                  </Button>
                  {!isCurrent && !locked && <Button size="sm" onClick={() => setAsking(tpl)}>Apply</Button>}
                </TemplateCard>
              );
            })}
          </div>
        </>
      )}

      <Card>
        <CardHeader title="Logo and cover photo" subtitle="Shown on the login page and the home screen. No cropping: pick pictures with the right shape." />
        <div className="space-y-6 p-5">
          <MediaPicker field="logo" url={data.logoUrl} title="Logo" hint="Square, at least 256 × 256 pixels. A PNG with a transparent background looks best. Up to 5 MB." />
          <MediaPicker field="cover" url={data.coverUrl} wide title="Cover photo" hint="Wide landscape picture, about 1600 × 600 pixels (8:3). Keep the main subject in the middle: phones show the centre. Up to 5 MB." />
        </div>
      </Card>

      <ApplyTemplateDialog open={Boolean(asking)} name={asking ? t(asking.name) : ''} busy={apply.isPending} onClose={() => setAsking(null)} onConfirm={() => apply.mutate(asking.key)} />
    </div>
  );
}
