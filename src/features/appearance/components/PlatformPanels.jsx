import { useState } from 'react';
import { Badge, Button, Checkbox, Select, Spinner } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { label } from '../../../lib/format';
import { useCan } from '../../platform/useCan';
import { useResellerTemplates, useSocietyAppearance, useUpdateResellerTemplates, useUpdateSocietyAppearance } from '../api';

function TemplateChecks({ templates, value, onChange, disabled }) {
  const { t } = useT();
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : templates.map((x) => x.key).filter((k) => k === key || value.includes(k)));
  return (
    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
      {templates.map((tpl) => (
        <Checkbox key={tpl.key} disabled={disabled} label={t(tpl.name)} checked={value.includes(tpl.key)} onChange={() => toggle(tpl.key)} />
      ))}
    </div>
  );
}

// Platform society detail: the colony's template, its allowed list, the admin switch and "force".
export function SocietyAppearancePanel({ societyId }) {
  const { t } = useT();
  const can = useCan();
  const { data, isLoading } = useSocietyAppearance(societyId);
  const update = useUpdateSocietyAppearance(societyId);
  const [allowed, setAllowed] = useState(null);
  const [force, setForce] = useState('');
  const manage = can('templates.manage');
  if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;
  const name = (key) => t(data.templates.find((x) => x.key === key)?.name || key);
  const list = allowed ?? data.allowedTemplates;
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-800">{t('App template')}</p>
        <span className="flex flex-wrap gap-1.5">
          <Badge tone="brand">{name(data.current)}</Badge>
          {data.forced && <Badge tone="amber">{t('Forced by the platform')}</Badge>}
        </span>
      </div>
      <Checkbox
        label={t('Colony admin may change the template')}
        checked={data.adminMayChange}
        disabled={!manage || update.isPending}
        onChange={(e) => update.mutate({ adminMayChange: e.target.checked })}
      />
      <div>
        <p className="mb-1 text-sm text-slate-600">
          {t('Allowed templates')} · <span className="text-slate-500">{data.allowedTemplates.length ? t('set for this colony') : t('from the {plan} plan: {n} templates', { plan: t(label(data.plan)), n: data.planTemplates.length })}</span>
        </p>
        <TemplateChecks templates={data.templates} value={list.length ? list : data.planTemplates} disabled={!manage} onChange={setAllowed} />
        {manage && (
          <div className="mt-2 flex flex-wrap gap-2">
            {allowed && <Button size="sm" disabled={!allowed.length} loading={update.isPending} onClick={() => update.mutate({ allowedTemplates: allowed }, { onSuccess: () => setAllowed(null) })}>Save allowed templates</Button>}
            {data.allowedTemplates.length > 0 && <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ allowedTemplates: [] }, { onSuccess: () => setAllowed(null) })}>Use the plan’s templates</Button>}
          </div>
        )}
        {data.reseller?.allowed?.length > 0 && <p className="mt-1 text-xs text-slate-500">{t('Its partner {name} limits colonies to: {list}', { name: data.reseller.name, list: data.reseller.allowed.map(name).join(', ') })}</p>}
      </div>
      {manage && (
        <div className="flex flex-wrap items-end gap-2">
          <Select className="min-w-48 flex-1" label="Force a template" value={force} onChange={(e) => setForce(e.target.value)}
            placeholder="Choose…" options={data.templates.map((x) => ({ value: x.key, label: x.name }))} />
          <Button size="sm" variant="secondary" disabled={!force} loading={update.isPending}
            onClick={() => window.confirm(t('Switch this colony to {name} now? Its members see it straight away.', { name: name(force) })) && update.mutate({ forceTemplate: force }, { onSuccess: () => setForce('') })}>
            Force now
          </Button>
          {data.forced && <Button size="sm" variant="ghost" loading={update.isPending} onClick={() => update.mutate({ forceTemplate: null })}>Stop forcing</Button>}
        </div>
      )}
    </div>
  );
}

// Platform reseller detail: which templates its colonies may use and whether its colour wins.
export function ResellerTemplatesPanel({ resellerId }) {
  const { t } = useT();
  const can = useCan();
  const { data, isLoading } = useResellerTemplates(resellerId);
  const update = useUpdateResellerTemplates(resellerId);
  const [allowed, setAllowed] = useState(null);
  const manage = can('templates.manage');
  if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;
  const list = allowed ?? data.allowedTemplates;
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <p className="font-medium text-slate-800">{t('App templates')}</p>
      <Checkbox
        label={t('Brand colour replaces each template’s colours')}
        checked={data.brandOverridesTemplate}
        disabled={!manage || update.isPending || !data.primaryColor}
        onChange={(e) => update.mutate({ brandOverridesTemplate: e.target.checked })}
      />
      {!data.primaryColor && <p className="text-xs text-slate-500">{t('Set a brand colour first.')}</p>}
      <p className="text-sm text-slate-600">{t('Templates its colonies may use')} · <span className="text-slate-500">{data.allowedTemplates.length ? t('{n} chosen', { n: data.allowedTemplates.length }) : t('no limit')}</span></p>
      <TemplateChecks templates={data.templates} value={list} disabled={!manage} onChange={setAllowed} />
      {manage && allowed && (
        <div className="flex gap-2">
          <Button size="sm" loading={update.isPending} onClick={() => update.mutate({ allowedTemplates: allowed }, { onSuccess: () => setAllowed(null) })}>Save</Button>
          <Button size="sm" variant="secondary" onClick={() => setAllowed(null)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
