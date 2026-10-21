import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, MailCheck } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, ErrorState, Input, PageLoader, Select } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { currentPeriod, label, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useT } from '../../../context/LanguageContext';
import { useReportCatalogue } from '../api';
import { useDownload } from '../download';

const STATUS_OPTIONS = {
  members: ['active', 'pending', 'inactive'],
  complaints: ['open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened'],
  bills: ['unpaid', 'partial', 'paid', 'cancelled'],
  bookings: ['pending', 'confirmed', 'rejected', 'cancelled'],
};
// Plain-English names where the server's catalogue uses jargon.
const LABELS = { complaints: 'Complaints & resolution time' };
const DESCRIPTIONS = { complaints: 'Helpdesk complaints raised in a date range, whether each was fixed on time, and how long it took.' };
// Excel is what most committees open; CSV and PDF stay one tap away as small links.
const OTHER_FORMATS = [
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' },
];
const monthAgo = () => new Date(Date.now() - 29 * 86400000).toLocaleDateString('en-CA');

function ReportCard({ report, download, busyKey }) {
  const { t } = useT();
  const [p, setP] = useState({ from: monthAgo(), to: todayISO(), period: report.key === 'bills' ? currentPeriod() : '', status: '' });
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const query = {
    ...(report.params.includes('from') ? { from: p.from, to: p.to } : {}),
    ...(report.params.includes('period') && p.period ? { period: p.period } : {}),
    ...(report.params.includes('status') && p.status ? { status: p.status } : {}),
  };
  const get = (format) => download(`/reports/${report.key}/export`, { ...query, format }, `${report.key}.${format}`, `${report.key}-${format}`);
  return (
    <Card className="flex flex-col p-5">
      <h3 className="font-semibold text-slate-900">{t(LABELS[report.key] || report.label)}</h3>
      <p className="mt-1 text-sm text-slate-500">{t(DESCRIPTIONS[report.key] || report.description)}</p>
      <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-2">
        {report.params.includes('from') && (
          <>
            <Input label="From" type="date" value={p.from} max={p.to} onChange={set('from')} />
            <Input label="To" type="date" value={p.to} min={p.from} onChange={set('to')} />
          </>
        )}
        {report.params.includes('period') && <Input label="Month" type="month" hint="Blank = all months" value={p.period} onChange={set('period')} />}
        {report.params.includes('status') && STATUS_OPTIONS[report.key] && (
          <Select label="Status" placeholder="Any" value={p.status} onChange={set('status')} options={STATUS_OPTIONS[report.key].map((s) => ({ value: s, label: label(s) }))} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button size="sm" icon={FileSpreadsheet} loading={busyKey === `${report.key}-xlsx`} disabled={Boolean(busyKey) && busyKey !== `${report.key}-xlsx`} onClick={() => get('xlsx')}>Download Excel</Button>
        <span className="text-xs text-slate-500">
          {t('or')}{' '}
          {OTHER_FORMATS.map(({ format, label }, i) => (
            <span key={format}>
              {i > 0 && ' · '}
              <button type="button" className="font-medium text-brand-700 hover:underline disabled:opacity-50" disabled={Boolean(busyKey)} onClick={() => get(format)}>
                {busyKey === `${report.key}-${format}` ? `${label}…` : label}
              </button>
            </span>
          ))}
        </span>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useReportCatalogue();
  const { download, busyKey } = useDownload();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div>
      <PageHeader title="Reports" description="Download society data. Very large reports may need a shorter date range."
        actions={user.role === ROLES.ADMIN && <Link to="/reports/schedules"><Button variant="secondary" icon={MailCheck}>Scheduled emails</Button></Link>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((r) => <ReportCard key={r.key} report={r} download={download} busyKey={busyKey} />)}
      </div>
    </div>
  );
}
