import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, FileText, MailCheck, Sheet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, ErrorState, Input, PageLoader, Select } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { currentPeriod, todayISO } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useReportCatalogue } from '../api';
import { useDownload } from '../download';

const STATUS_OPTIONS = {
  members: ['active', 'pending', 'inactive'],
  complaints: ['open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened'],
  bills: ['unpaid', 'partial', 'paid', 'cancelled'],
  bookings: ['pending', 'confirmed', 'rejected', 'cancelled'],
};
const FORMAT_BUTTONS = [
  { format: 'csv', label: 'CSV', icon: FileText },
  { format: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF', icon: Sheet },
];
const monthAgo = () => new Date(Date.now() - 29 * 86400000).toLocaleDateString('en-CA');

function ReportCard({ report, download, busyKey }) {
  const [p, setP] = useState({ from: monthAgo(), to: todayISO(), period: report.key === 'bills' ? currentPeriod() : '', status: '' });
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const query = {
    ...(report.params.includes('from') ? { from: p.from, to: p.to } : {}),
    ...(report.params.includes('period') && p.period ? { period: p.period } : {}),
    ...(report.params.includes('status') && p.status ? { status: p.status } : {}),
  };
  return (
    <Card className="flex flex-col p-5">
      <h3 className="font-semibold text-slate-900">{report.label}</h3>
      <p className="mt-1 text-sm text-slate-500">{report.description}</p>
      <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-2">
        {report.params.includes('from') && (
          <>
            <Input label="From" type="date" value={p.from} max={p.to} onChange={set('from')} />
            <Input label="To" type="date" value={p.to} min={p.from} onChange={set('to')} />
          </>
        )}
        {report.params.includes('period') && <Input label="Month" type="month" hint="Blank = all months" value={p.period} onChange={set('period')} />}
        {report.params.includes('status') && STATUS_OPTIONS[report.key] && (
          <Select label="Status" placeholder="Any" value={p.status} onChange={set('status')} options={STATUS_OPTIONS[report.key].map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {FORMAT_BUTTONS.map(({ format, label, icon }) => {
          const key = `${report.key}-${format}`;
          return <Button key={format} size="sm" variant="secondary" icon={icon} loading={busyKey === key} disabled={Boolean(busyKey) && busyKey !== key} onClick={() => download(`/reports/${report.key}/export`, { ...query, format }, `${report.key}.${format}`, key)}>{label}</Button>;
        })}
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
      <PageHeader title="Reports" description="Download society data as CSV, Excel or PDF. Large exports are capped at 50,000 rows (PDF: 2,000) — narrow the dates for more."
        actions={user.role === ROLES.ADMIN && <Link to="/reports/schedules"><Button variant="secondary" icon={MailCheck}>Scheduled emails</Button></Link>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((r) => <ReportCard key={r.key} report={r} download={download} busyKey={busyKey} />)}
      </div>
    </div>
  );
}
