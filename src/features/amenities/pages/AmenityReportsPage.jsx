import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Download, IndianRupee, UserX, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button, Card, Input, StatCard, Table } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { money, todayISO } from '../../../lib/format';
import { useUsageReport } from '../api';
import { downloadFile } from '../download';

const monthStart = () => `${todayISO().slice(0, 7)}-01`;

export default function AmenityReportsPage() {
  const [range, setRange] = useState({ from: monthStart(), to: todayISO() });
  const { data, isLoading } = useUsageReport(range);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const exportXlsx = async () => {
    setBusy(true);
    try {
      await downloadFile('/amenities/reports/usage.xlsx', range, `amenity-usage-${range.from}-to-${range.to}.xlsx`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const t = data?.totals;

  return (
    <div>
      <Link to="/amenities" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" /> Amenities</Link>
      <PageHeader title="Amenity usage & revenue" description="Bookings, utilisation, no-shows and money collected per amenity." actions={<Button variant="secondary" icon={Download} loading={busy} onClick={exportXlsx}>Export Excel</Button>} />
      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2">
        <Input label="From" type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </Card>
      {t && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CalendarDays} label="Bookings" value={t.bookings} sub={`${t.cancelled} cancelled`} />
          <StatCard icon={UserX} tone="red" label="No-shows" value={t.noShows} />
          <StatCard icon={IndianRupee} tone="green" label="Revenue" value={money(t.revenue)} sub="Fees + pass sales, net of refunds" />
          <StatCard icon={Wallet} tone="amber" label="Deposits held" value={money(t.depositsHeld)} />
        </div>
      )}
      <Card>
        <Table loading={isLoading} rows={data?.rows?.map((r) => ({ ...r, key: r.amenity._id }))} rowKey="key" empty="No amenities"
          columns={[
            { key: 'name', header: 'Amenity', render: (r) => <span className="font-medium text-slate-900">{r.amenity.name}</span> },
            { key: 'bookings', header: 'Bookings', render: (r) => `${r.bookings} / ${r.requests}` },
            { key: 'cancelled', header: 'Cancelled', render: (r) => r.cancelled },
            { key: 'noShows', header: 'No-shows', render: (r) => `${r.noShows}${r.bookings ? ` (${r.noShowPercent}%)` : ''}` },
            {
              key: 'util', header: 'Utilisation', render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-500" style={{ width: `${Math.min(100, r.utilisationPercent)}%` }} /></div>
                  <span className="text-xs">{r.utilisationPercent}%</span>
                </div>
              ),
            },
            { key: 'fees', header: 'Fees', render: (r) => money(r.feeRevenue) },
            { key: 'passes', header: 'Passes', render: (r) => `${money(r.passSales)} · ${r.activePasses} active` },
            { key: 'deposits', header: 'Deposits held', render: (r) => money(r.depositsHeld) },
          ]}
        />
      </Card>
    </div>
  );
}
