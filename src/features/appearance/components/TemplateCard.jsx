import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useT } from '../../../context/LanguageContext';

// Desktop + phone preview pictures (frontend/public/templates, made by scripts/gen-template-previews.mjs).
// Until they exist, the template's colours stand in.
export function TemplatePreview({ template, className }) {
  const [desktopOk, setDesktopOk] = useState(true);
  const [phoneOk, setPhoneOk] = useState(true);
  return (
    <div className={cn('relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-200', className)} style={{ background: `linear-gradient(135deg, ${template.swatch}, ${template.accent})` }}>
      {desktopOk && <img src={template.preview} alt="" loading="lazy" className="absolute inset-0 size-full object-cover object-top" onError={() => setDesktopOk(false)} />}
      {phoneOk && (
        <img src={template.previewPhone} alt="" loading="lazy" onError={() => setPhoneOk(false)}
          className="absolute bottom-2 right-2 h-[72%] rounded-md border-2 border-white object-cover object-top shadow-md" />
      )}
    </div>
  );
}

// One template in a grid: preview, name, tags, and the state badges.
export function TemplateCard({ template, current, locked, lockText, children }) {
  const { t } = useT();
  return (
    <div className={cn('flex flex-col rounded-xl border bg-white p-3 shadow-sm', current ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200')}>
      <TemplatePreview template={template} />
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{t(template.name)}</h3>
        {current && <Badge tone="brand">{t('Current')}</Badge>}
        {locked && (
          <Badge tone="amber" className="gap-1">
            <Lock className="size-3" aria-hidden />
            {lockText}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">{t(template.description)}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {template.tags.map((tag) => <Badge key={tag}>{t(tag)}</Badge>)}
      </div>
      {children && <div className="mt-auto flex flex-wrap gap-2 pt-3">{children}</div>}
    </div>
  );
}
