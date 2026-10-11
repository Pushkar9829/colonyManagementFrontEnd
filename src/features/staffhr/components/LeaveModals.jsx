import { Button, Checkbox, Input, Modal, Select, Spinner, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { label, todayISO } from '../../../lib/format';
import { useApplyLeave, useEmployees, useLeaveBalances } from '../api';

export const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'earned', label: 'Earned' },
  { value: 'unpaid', label: 'Unpaid (loss of pay)' },
];
export const LEAVE_TONES = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'slate' };

export function BalanceCards({ balances }) {
  if (!balances) return <div className="flex justify-center py-4"><Spinner /></div>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {balances.map((b) => (
        <div key={b.type} className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label(b.type)}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{b.available === null ? b.used : b.available}</p>
          <p className="text-xs text-slate-500">{b.available === null ? 'days taken' : `left of ${b.allocated}`}{b.pending ? ` · ${b.pending} pending` : ''}</p>
        </div>
      ))}
    </div>
  );
}

// Apply for oneself, or (managers) record leave for an employee — that is approved at once.
export function ApplyLeaveModal({ open, onClose, forEmployee = false }) {
  const { values, bind, set, reset, applyServerErrors } = useForm({ employee: '', type: 'casual', from: todayISO(), to: todayISO(), halfDay: false, reason: '' });
  const { data: employees } = useEmployees({ status: 'active', limit: 100 }, open && forEmployee);
  const { data: bal } = useLeaveBalances({ year: Number(values.from.slice(0, 4)) || undefined, ...(forEmployee && values.employee && { employee: values.employee }) }, open && (!forEmployee || Boolean(values.employee)));
  const apply = useApplyLeave({ onSuccess: () => { reset(); onClose(); } });
  const submit = () => apply.mutate({ type: values.type, from: values.from, to: values.halfDay ? values.from : values.to, halfDay: values.halfDay, reason: values.reason || undefined, employee: forEmployee ? values.employee : undefined }, { onError: applyServerErrors });
  return (
    <Modal open={open} onClose={onClose} title={forEmployee ? 'Record leave for an employee' : 'Apply for leave'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={apply.isPending} onClick={submit}>{forEmployee ? 'Record' : 'Apply'}</Button></>}>
      <div className="space-y-4">
        {forEmployee && <Select label="Employee" required placeholder="Choose" options={(employees?.data || []).map((e) => ({ value: e._id, label: `${e.user?.name} · ${e.employeeCode}` }))} {...bind('employee')} />}
        {bal && <BalanceCards balances={bal.balances} />}
        <Select label="Type" options={LEAVE_TYPES} {...bind('type')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" type="date" {...bind('from')} />
          <Input label="To" type="date" disabled={values.halfDay} {...bind('to')} />
        </div>
        <Checkbox label="Half day" checked={values.halfDay} onChange={(e) => set('halfDay', e.target.checked)} />
        <Textarea label="Reason" rows={2} {...bind('reason')} />
      </div>
    </Modal>
  );
}
