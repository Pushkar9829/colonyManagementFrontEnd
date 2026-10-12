import { useT } from '../../context/LanguageContext';

const tr = (t, v) => (typeof v === 'string' ? t(v) : v);

export function PageHeader({ title, description, actions }) {
  const { t } = useT();
  title = tr(t, title);
  description = tr(t, description);
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
