import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EmptyState, Spinner } from './Feedback';
import { usePhone } from '../../hooks/useMediaQuery';
import { tr, useT } from '../../context/LanguageContext';

const blank = (v) => v === null || v === undefined || v === false || v === '' || v === '—' || v === '–' || v === '-';

// Phones: each row becomes a card. The first column is the card title, labelled columns become
// "label: value" lines and unlabelled columns (row actions) sit at the bottom. `mobile: false` hides a column.
function RowCards({ columns, rows, onRowClick, rowKey }) {
  const { t } = useT();
  const cols = columns.filter((c) => c.mobile !== false);
  const [first, ...rest] = cols;
  const cell = (c, row) => (c.render ? c.render(row) : row[c.key]);
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => {
        const lines = rest.filter((c) => c.header).map((c) => [c, cell(c, row)]).filter(([, v]) => !blank(v));
        const actions = rest.filter((c) => !c.header).map((c) => [c, cell(c, row)]).filter(([, v]) => !blank(v));
        return (
          <li key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('px-4 py-3 text-sm', onRowClick && 'cursor-pointer active:bg-slate-50')}>
            <div className="font-medium text-slate-900">{cell(first, row)}</div>
            {lines.length > 0 && (
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {lines.map(([c, v]) => (
                  <div key={c.key} className="contents">
                    <dt className="text-xs text-slate-500">{tr(t, c.mobileLabel || c.header)}</dt>
                    <dd className="min-w-0 break-words text-slate-700">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions.length > 0 && (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {actions.map(([c, v]) => <span key={c.key}>{v}</span>)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// columns: [{ key, header, render?(row), className?, wrap?: true (long text), mobile?: false, mobileLabel? }]
// emptyHint / emptyAction: what to do when the list is empty (a sentence and a button).
export function Table({ columns, rows, loading, empty = 'Nothing here yet', emptyHint, emptyAction, onRowClick, rowKey = '_id' }) {
  const phone = usePhone();
  const { t } = useT();
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (!rows?.length) return <EmptyState title={empty} description={emptyHint} action={emptyAction} />;
  if (phone) return <RowCards columns={columns} rows={rows} onRowClick={onRowClick} rowKey={rowKey} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', c.className)}>
                {tr(t, c.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn(onRowClick && 'cursor-pointer hover:bg-slate-50')}>
              {columns.map((c) => (
                <td key={c.key} className={cn(c.wrap ? 'min-w-48 px-4 py-3 text-slate-700' : 'whitespace-nowrap px-4 py-3 text-slate-700', c.className)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  const { t } = useT();
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        {t('Page {page} of {pages} · {total} total', { page: meta.page, pages: meta.pages, total: meta.total })}
      </span>
      <div className="flex gap-1">
        <button type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className="rounded-md border border-slate-200 p-2.5 hover:bg-slate-50 disabled:opacity-40 sm:p-1.5" aria-label={t('Previous page')}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)} className="rounded-md border border-slate-200 p-2.5 hover:bg-slate-50 disabled:opacity-40 sm:p-1.5" aria-label={t('Next page')}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
