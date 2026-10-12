import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, FileText, IndianRupee, Plus, RefreshCcw, Trash2, Users, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Input, Modal, Pagination, Select, Spinner, StatCard, Table, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { currentPeriod, date, label, money, periodLabel, toPaise, todayISO } from '../../../lib/format';
import { hasRole, isManager } from '../../../lib/roles';
import { downloadFile, openPdf } from '../../assets/shared';
import { useAdjustPayslip, useAdvances, useApproveRun, useCreateAdvance, useCreateRun, useDiscardRun, useEmployees, usePayPayslip, usePayRun, useRecomputeRun, useRun, useRuns } from '../api';

const RUN_TONES = { draft: 'amber', approved: 'blue', paid: 'green' };
const METHODS = ['bank', 'upi', 'cash', 'cheque'].map((v) => ({ value: v, label: label(v) }));

function PayModal({ title, onClose, onPay, loading }) {
  const [v, setV] = useState({ method: 'bank', reference: '', paidAt: todayISO() });
  return (
    <Modal open onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" loading={loading} onClick={() => onPay({ method: v.method, reference: v.reference || undefined, paidAt: v.paidAt })}>Mark paid</Button></>}>
      <div className="space-y-4">
        <Select label="Paid by" options={METHODS} value={v.method} onChange={(e) => setV((x) => ({ ...x, method: e.target.value }))} />
        <Input label="Reference (UTR / cheque no.)" value={v.reference} onChange={(e) => setV((x) => ({ ...x, reference: e.target.value }))} />
        <Input label="Paid on" type="date" value={v.paidAt} onChange={(e) => setV((x) => ({ ...x, paidAt: e.target.value }))} />
      </div>
    </Modal>
  );
}

function SlipModal({ slip, onClose, canEdit }) {
  const toast = useToast();
  const [adj, setAdj] = useState(slip.adjustments?.map((a) => ({ ...a, amount: String(a.amount / 100) })) || []);
  const save = useAdjustPayslip({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`${slip.name} · ${slip.employeeCode}`} description={`${periodLabel(slip.period)} · ${slip.paidDays} paid of ${slip.daysInPeriod} days`} size="lg"
      footer={<><Button variant="secondary" icon={FileText} onClick={() => openPdf(`/staffhr/payslips/${slip._id}/pdf`).catch((e) => toast.error(e))}>PDF</Button>{canEdit && <Button loading={save.isPending} onClick={() => save.mutate({ id: slip._id, adjustments: adj.filter((a) => a.head && Number(a.amount) > 0).map((a) => ({ head: a.head, kind: a.kind, amount: toPaise(a.amount) })) })}>Save adjustments</Button>}</>}>
      <div className="space-y-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-slate-800">Earnings</p>
            {slip.earnings.map((e) => <p key={e.head} className="flex justify-between"><span>{e.head}</span><span>{money(e.amount)}</span></p>)}
            <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-semibold"><span>Gross</span><span>{money(slip.gross)}</span></p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-slate-800">Deductions</p>
            {slip.deductionLines.map((e, i) => <p key={`${e.head}${i}`} className="flex justify-between"><span>{e.head}</span><span>{money(e.amount)}</span></p>)}
            <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-semibold"><span>Total</span><span>{money(slip.deductions)}</span></p>
          </div>
        </div>
        <p className="rounded-lg bg-sky-50 p-3 text-base font-semibold text-sky-900">Net pay {money(slip.net)}</p>
        <p className="text-xs text-slate-500">
          Attendance: {slip.attendance?.present ?? 0} present · {slip.attendance?.late ?? 0} late · {slip.attendance?.halfDay ?? 0} half day · {slip.attendance?.absent ?? 0} absent · {slip.attendance?.paidLeave ?? 0} paid leave · {slip.attendance?.unpaidLeave ?? 0} unpaid · LOP {slip.lopDays} day(s)
        </p>
        {canEdit && (
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">One-off adjustments</p>
            {adj.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" placeholder="Head (Bonus, Fine…)" value={a.head} onChange={(e) => setAdj((x) => x.map((y, j) => (j === i ? { ...y, head: e.target.value } : y)))} />
                <Select className="w-36" options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]} value={a.kind} onChange={(e) => setAdj((x) => x.map((y, j) => (j === i ? { ...y, kind: e.target.value } : y)))} />
                <Input className="w-28" type="number" min="0" step="0.01" placeholder="₹" value={a.amount} onChange={(e) => setAdj((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
                <button type="button" aria-label="Remove" className="p-2 text-slate-400 hover:text-red-600" onClick={() => setAdj((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAdj((x) => [...x, { head: '', kind: 'earning', amount: '' }])}>Add</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RunDetail({ id, onBack }) {
  const { user } = useAuth();
  const toast = useToast();
  const manager = isManager(user);
  const canPay = hasRole(user, 'accountant', 'facility_manager');
  const { data: run, isLoading } = useRun(id);
  const [slip, setSlip] = useState(null);
  const [paying, setPaying] = useState(null); // 'run' | payslip
  const recompute = useRecomputeRun();
  const approve = useApproveRun();
  const discard = useDiscardRun({ onSuccess: onBack });
  const payRun = usePayRun({ onSuccess: () => setPaying(null) });
  const paySlip = usePayPayslip({ onSuccess: () => setPaying(null) });
  if (isLoading || !run) return <div className="flex justify-center py-10"><Spinner /></div>;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="size-4" />All payroll runs</button>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={periodLabel(run.period)} value={run.employees} sub={<Badge tone={RUN_TONES[run.status]}>{label(run.status)}</Badge>} />
        <StatCard icon={IndianRupee} tone="sky" label="Gross" value={money(run.gross)} />
        <StatCard icon={Wallet} tone="amber" label="Deductions" value={money(run.deductions)} />
        <StatCard icon={CheckCircle2} tone="green" label="Net payable" value={money(run.net)} sub={`${run.paidCount} of ${run.employees} paid`} />
      </div>
      <Card>
        <CardHeader title="Payslips" action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadFile(`/staffhr/payroll-runs/${run._id}/export`, null, `payroll-${run.period}.xlsx`).catch((e) => toast.error(e))}>Excel</Button>
            {manager && run.status === 'draft' && <Button size="sm" variant="secondary" icon={RefreshCcw} loading={recompute.isPending} onClick={() => recompute.mutate(run._id)}>Recalculate</Button>}
            {manager && run.status === 'draft' && <Button size="sm" variant="ghost" icon={Trash2} loading={discard.isPending} onClick={() => window.confirm('Discard this draft payroll?') && discard.mutate(run._id)}>Discard</Button>}
            {manager && run.status === 'draft' && <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(run._id)}>Approve</Button>}
            {canPay && run.status === 'approved' && <Button size="sm" variant="success" onClick={() => setPaying('run')}>Mark all paid</Button>}
          </div>
        } />
        <Table rows={run.payslips} empty="No employees in this payroll" onRowClick={setSlip}
          columns={[
            { key: 'name', header: 'Employee', render: (p) => <div><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.employeeCode}{p.designation ? ` · ${p.designation}` : ''}</p></div> },
            { key: 'days', header: 'Paid / LOP', render: (p) => `${p.paidDays} / ${p.lopDays}` },
            { key: 'gross', header: 'Gross', render: (p) => money(p.gross) },
            { key: 'deductions', header: 'Deductions', render: (p) => money(p.deductions) },
            { key: 'net', header: 'Net', render: (p) => <span className="font-semibold">{money(p.net)}</span> },
            { key: 'bank', header: 'Bank', render: (p) => (p.bankLast4 ? `•••• ${p.bankLast4}` : '—') },
            { key: 'status', header: 'Status', render: (p) => <Badge tone={RUN_TONES[p.status]}>{label(p.status)}</Badge> },
            { key: 'act', header: '', render: (p) => canPay && p.status === 'approved' && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setPaying(p); }}>Pay</Button> },
          ]} />
      </Card>
      {slip && <SlipModal slip={slip} canEdit={manager && run.status === 'draft'} onClose={() => setSlip(null)} />}
      {paying === 'run' && <PayModal title={`Pay all approved payslips · ${periodLabel(run.period)}`} loading={payRun.isPending} onClose={() => setPaying(null)} onPay={(b) => payRun.mutate({ id: run._id, ...b })} />}
      {paying && paying !== 'run' && <PayModal title={`Pay ${paying.name} · ${money(paying.net)}`} loading={paySlip.isPending} onClose={() => setPaying(null)} onPay={(b) => paySlip.mutate({ id: paying._id, ...b })} />}
    </div>
  );
}

function RunsTab() {
  const { user } = useAuth();
  const manager = isManager(user);
  const [params, setParams] = useSearchParams();
  const runId = params.get('run');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = useRuns({ page });
  const create = useCreateRun({ onSuccess: (r) => setParams({ run: r._id }) });
  if (runId) return <RunDetail id={runId} onBack={() => setParams({})} />;
  return (
    <Card>
      {manager && (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <Input label="Month" type="month" value={period} max={currentPeriod()} onChange={(e) => setPeriod(e.target.value)} />
          <Button icon={Plus} loading={create.isPending} onClick={() => create.mutate({ period })}>Run payroll</Button>
          <p className="text-xs text-slate-500">Builds a draft from attendance and approved leave; recalculate any time before approving.</p>
        </div>
      )}
      <Table loading={isLoading} rows={data?.data} empty="No payroll runs yet" onRowClick={(r) => setParams({ run: r._id })}
        columns={[
          { key: 'period', header: 'Month', render: (r) => <span className="font-medium">{periodLabel(r.period)}</span> },
          { key: 'employees', header: 'Employees' },
          { key: 'gross', header: 'Gross', render: (r) => money(r.gross) },
          { key: 'net', header: 'Net', render: (r) => money(r.net) },
          { key: 'paid', header: 'Paid', render: (r) => `${r.paidCount} / ${r.employees}` },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={RUN_TONES[r.status]}>{label(r.status)}</Badge> },
          { key: 'approvedBy', header: 'Approved', render: (r) => (r.approvedAt ? `${date(r.approvedAt)} · ${r.approvedBy?.name || ''}` : '—') },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

function AdvancesTab() {
  const { user } = useAuth();
  const manager = isManager(user);
  const { data, isLoading } = useAdvances({});
  const { data: employees } = useEmployees({ status: 'active', limit: 100 }, manager);
  const [v, setV] = useState({ employee: '', amount: '', installment: '', reason: '' });
  const create = useCreateAdvance({ onSuccess: () => setV({ employee: '', amount: '', installment: '', reason: '' }) });
  return (
    <Card>
      {manager && (
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-5">
          <Select label="Employee" placeholder="Choose" options={(employees?.data || []).map((e) => ({ value: e._id, label: `${e.user?.name} · ${e.employeeCode}` }))} value={v.employee} onChange={(e) => setV((x) => ({ ...x, employee: e.target.value }))} />
          <Input label="Amount (₹)" type="number" min="0" value={v.amount} onChange={(e) => setV((x) => ({ ...x, amount: e.target.value }))} />
          <Input label="Recover per month (₹)" type="number" min="0" value={v.installment} onChange={(e) => setV((x) => ({ ...x, installment: e.target.value }))} />
          <Input label="Reason" value={v.reason} onChange={(e) => setV((x) => ({ ...x, reason: e.target.value }))} />
          <Button className="self-end" icon={Plus} loading={create.isPending} onClick={() => create.mutate({ employee: v.employee, amount: toPaise(v.amount), installment: toPaise(v.installment), reason: v.reason || undefined })}>Give advance</Button>
        </div>
      )}
      <Table loading={isLoading} rows={data} empty="No salary advances"
        columns={[
          { key: 'who', header: 'Employee', render: (a) => `${a.employee?.user?.name || ''} · ${a.employee?.employeeCode || ''}` },
          { key: 'date', header: 'Given', render: (a) => date(a.date) },
          { key: 'amount', header: 'Amount', render: (a) => money(a.amount) },
          { key: 'installment', header: 'Per month', render: (a) => money(a.installment) },
          { key: 'recovered', header: 'Recovered', render: (a) => `${money(a.recovered)} (${Math.round((a.recovered / a.amount) * 100)}%)` },
          { key: 'status', header: 'Status', render: (a) => <Badge tone={a.status === 'active' ? 'amber' : 'green'}>{a.status === 'active' ? 'Recovering' : 'Closed'}</Badge> },
        ]} />
    </Card>
  );
}

export default function PayrollPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'runs';
  return (
    <div>
      <PageHeader title="Payroll" description="Monthly payroll from attendance and leave — PF, ESI, professional tax and advance recovery, then payslips." />
      <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ value: 'runs', label: 'Payroll runs' }, { value: 'advances', label: 'Salary advances' }]} />
      {tab === 'runs' && <RunsTab />}
      {tab === 'advances' && <AdvancesTab />}
    </div>
  );
}
