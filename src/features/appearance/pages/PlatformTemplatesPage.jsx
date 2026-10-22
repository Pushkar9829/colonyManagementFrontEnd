import { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, ErrorState, PageLoader } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { label } from '../../../lib/format';
import { PermissionGate } from '../../platform/components/PermissionGate';
import { usePlatformTemplates, useSetDefaultTemplate, useSetPlanTemplates, useSetTemplateEnabled } from '../api';
import { TemplateCard } from '../components/TemplateCard';

// 'split-photo' -> 'Split photo' (also the translation key)
export const look = (v) => {
  const s = String(v || '').replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const LOOK = { header: 'Header', sidebar: 'Menu', login: 'Login page', home: 'Home screen', buttons: 'Buttons', radius: 'Corners', font: 'Font' };

// Which templates each plan may use: one row of checkboxes per plan.
function PlanRules({ data }) {
  const { t } = useT();
  const save = useSetPlanTemplates();
  const [draft, setDraft] = useState({});
  const rows = data.plans.map((plan) => ({ plan, keys: draft[plan] ?? data.planRules[plan] }));
  const toggle = (plan, key) =>
    setDraft((d) => {
      const keys = new Set(d[plan] ?? data.planRules[plan]);
      if (keys.has(key)) keys.delete(key);
      else keys.add(key);
      return { ...d, [plan]: data.templates.map((x) => x.key).filter((k) => keys.has(k)) };
    });
  return (
    <Card>
      <CardHeader title="Templates per plan" subtitle="Colonies on a plan can choose from its templates; the others show “Available on …” with a lock." />
      <div className="divide-y divide-slate-100">
        {rows.map(({ plan, keys }) => (
          <div key={plan} className="px-5 py-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{t(label(plan))} <span className="text-sm font-normal text-slate-500">· {t('{n} of {total}', { n: keys.length, total: data.templates.length })}</span></p>
              {draft[plan] && (
                <span className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDraft(({ [plan]: _drop, ...rest }) => rest)}>Cancel</Button>
                  <Button size="sm" disabled={!keys.length} loading={save.isPending} onClick={() => save.mutate({ plan, templates: keys }, { onSuccess: () => setDraft(({ [plan]: _drop, ...rest }) => rest) })}>Save</Button>
                </span>
              )}
            </div>
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-5">
              {data.templates.map((tpl) => <Checkbox key={tpl.key} label={t(tpl.name)} checked={keys.includes(tpl.key)} onChange={() => toggle(plan, tpl.key)} />)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Catalogue({ data }) {
  const { t } = useT();
  const enable = useSetTemplateEnabled();
  const setDefault = useSetDefaultTemplate();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.templates.map((tpl) => (
        <TemplateCard key={tpl.key} template={tpl} current={tpl.isDefault}>
          <div className="w-full space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {tpl.isDefault && <Badge tone="brand">{t('Platform default')}</Badge>}
              <Badge tone={tpl.enabled ? 'green' : 'slate'}>{tpl.enabled ? t('On') : t('Off')}</Badge>
              <Badge tone="blue">{t('{n} colonies', { n: tpl.usage })}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {Object.entries(LOOK).map(([k, name]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{t(name)}</dt>
                  <dd className="truncate font-medium text-slate-700">{t(look(tpl[k]))}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-slate-500">{t('Plans: {plans}', { plans: tpl.plans.map((p) => t(label(p))).join(', ') || '—' })}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="secondary" disabled={tpl.isDefault} loading={enable.isPending && enable.variables?.key === tpl.key} onClick={() => enable.mutate({ key: tpl.key, enabled: !tpl.enabled })}>
                {tpl.enabled ? 'Switch off' : 'Switch on'}
              </Button>
              {!tpl.isDefault && tpl.enabled && <Button size="sm" variant="ghost" loading={setDefault.isPending && setDefault.variables === tpl.key} onClick={() => setDefault.mutate(tpl.key)}>Make default</Button>}
            </div>
          </div>
        </TemplateCard>
      ))}
    </div>
  );
}

// Platform → App templates (templates.manage).
export default function PlatformTemplatesPage() {
  const { data, isLoading, error, refetch } = usePlatformTemplates();
  return (
    <div className="space-y-6">
      <PageHeader title="App templates" description="The looks colonies can give their app. Switch templates on or off, pick the default for new colonies and decide which plans get which." />
      <PermissionGate permission="templates.manage">
        {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <Catalogue data={data} />
            <PlanRules data={data} />
          </>
        )}
      </PermissionGate>
    </div>
  );
}
