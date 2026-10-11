import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Attachments, Button, FileUpload, Input, Modal, Select, Textarea } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { label, toPaise, toRupees } from '../../../lib/format';
import { clean, opts } from '../../assets/shared';
import { useCandidates, useCreateEmployee, useShifts, useUpdateEmployee } from '../api';

export const DEPARTMENTS = opts(['security', 'housekeeping', 'maintenance', 'gardening', 'administration', 'accounts', 'other']);
const TYPES = opts(['permanent', 'contract', 'probation', 'part_time']);
const VERIFICATION = opts(['not_started', 'submitted', 'verified', 'failed']);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => ({ value: String(i), label: d }));

const r = (paise) => (paise ? String(toRupees(paise)) : '');

export function EmployeeModal({ open, onClose, employee }) {
  const blank = {
    membership: '', employeeCode: '', designation: '', department: 'other', employmentType: 'permanent', dateOfJoining: '', status: 'active', dateOfExit: '',
    basic: '', hra: '', pfPercent: '12', esiPercent: '0.75', professionalTax: '200',
    accountName: '', accountNumber: '', ifsc: '', bankName: '', pan: '', uan: '', esiNumber: '',
    ecName: '', ecPhone: '', ecRelation: '', address: '',
    pvStatus: 'not_started', pvDate: '', pvReference: '', pvStation: '',
    defaultShift: '', weeklyOff: '0',
  };
  const { values, bind, setValues, applyServerErrors } = useForm(blank);
  const [allowances, setAllowances] = useState([]);
  const [docs, setDocs] = useState([]);
  const { data: candidates } = useCandidates(open && !employee);
  const { data: shifts } = useShifts(open);

  useEffect(() => {
    if (!open) return;
    setDocs([]);
    if (!employee) {
      setValues(blank);
      setAllowances([]);
      return;
    }
    const s = employee.salary || {};
    setValues({
      ...blank,
      employeeCode: employee.employeeCode,
      designation: employee.designation || '',
      department: employee.department,
      employmentType: employee.employmentType,
      dateOfJoining: employee.dateOfJoining || '',
      status: employee.status,
      dateOfExit: employee.dateOfExit || '',
      basic: r(s.basic), hra: r(s.hra), pfPercent: String(s.pfPercent ?? 0), esiPercent: String(s.esiPercent ?? 0), professionalTax: r(s.professionalTax) || '0',
      accountName: employee.bank?.accountName || '', ifsc: employee.bank?.ifsc || '', bankName: employee.bank?.bankName || '',
      uan: employee.uan || '', esiNumber: employee.esiNumber || '',
      ecName: employee.emergencyContact?.name || '', ecPhone: employee.emergencyContact?.phone || '', ecRelation: employee.emergencyContact?.relation || '', address: employee.address || '',
      pvStatus: employee.policeVerification?.status || 'not_started', pvDate: employee.policeVerification?.date || '', pvReference: employee.policeVerification?.reference || '', pvStation: employee.policeVerification?.station || '',
      defaultShift: employee.defaultShift?._id || '', weeklyOff: String(employee.weeklyOff ?? 0),
    });
    setAllowances((s.allowances || []).map((a) => ({ name: a.name, amount: r(a.amount) })));
  }, [open, employee]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = { onSuccess: onClose };
  const create = useCreateEmployee(done);
  const update = useUpdateEmployee(done);

  const submit = () => {
    const v = values;
    const body = {
      employeeCode: v.employeeCode || undefined,
      designation: v.designation || undefined,
      department: v.department,
      employmentType: v.employmentType,
      dateOfJoining: v.dateOfJoining || undefined,
      weeklyOff: Number(v.weeklyOff),
      salary: {
        basic: toPaise(v.basic || 0), hra: toPaise(v.hra || 0),
        allowances: allowances.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), amount: toPaise(a.amount || 0) })),
        pfPercent: Number(v.pfPercent || 0), esiPercent: Number(v.esiPercent || 0), professionalTax: toPaise(v.professionalTax || 0),
      },
      bank: clean({ accountName: v.accountName, accountNumber: v.accountNumber, ifsc: v.ifsc, bankName: v.bankName }),
      ...clean({ pan: v.pan, uan: v.uan, esiNumber: v.esiNumber, address: v.address }),
      emergencyContact: clean({ name: v.ecName, phone: v.ecPhone, relation: v.ecRelation }),
      policeVerification: clean({ status: v.pvStatus, date: v.pvDate, reference: v.pvReference, station: v.pvStation }),
      documents: docs.length ? docs.map((d) => d._id) : undefined,
    };
    if (!Object.keys(body.bank).length) delete body.bank;
    if (employee) update.mutate({ id: employee._id, ...body, status: v.status, dateOfExit: v.dateOfExit || null, defaultShift: v.defaultShift || null }, { onError: applyServerErrors });
    else create.mutate({ ...body, membership: v.membership, defaultShift: v.defaultShift || undefined }, { onError: applyServerErrors });
  };

  const section = (title) => <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">{title}</p>;

  return (
    <Modal open={open} onClose={onClose} title={employee ? `${employee.user?.name} · ${employee.employeeCode}` : 'Add employee'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!employee && (
          <Select className="sm:col-span-2" label="Staff member" required placeholder="Choose (add them under Members first)" hint="Guards, housekeeping, technicians and managers without an HR profile"
            options={(candidates || []).map((c) => ({ value: c.membership, label: `${c.user.name} · ${label(c.role)}${c.designation ? ` · ${c.designation}` : ''}` }))} {...bind('membership')} />
        )}
        {section('Employment')}
        <Input label="Employee code" placeholder="Auto (EMP-0001)" {...bind('employeeCode')} />
        <Input label="Designation" {...bind('designation')} />
        <Select label="Department" options={DEPARTMENTS} {...bind('department')} />
        <Select label="Type" options={TYPES} {...bind('employmentType')} />
        <Input label="Date of joining" type="date" {...bind('dateOfJoining')} />
        {employee && <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Left / inactive' }]} {...bind('status')} />}
        {employee && values.status === 'inactive' && <Input label="Last working day" type="date" {...bind('dateOfExit')} />}
        <Select label="Default shift" placeholder="No fixed shift" options={(shifts || []).filter((s) => s.active).map((s) => ({ value: s._id, label: `${s.name} (${s.start}–${s.end})` }))} {...bind('defaultShift')} />
        <Select label="Weekly off" options={WEEKDAYS} {...bind('weeklyOff')} />

        {section('Monthly salary (₹)')}
        <Input label="Basic" type="number" min="0" step="0.01" {...bind('basic')} />
        <Input label="HRA" type="number" min="0" step="0.01" {...bind('hra')} />
        <div className="space-y-2 sm:col-span-2">
          {allowances.map((a, i) => (
            <div key={i} className="flex gap-2">
              <Input className="flex-1" placeholder="Allowance (e.g. Conveyance)" value={a.name} onChange={(e) => setAllowances((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
              <Input className="w-36" type="number" min="0" step="0.01" placeholder="₹" value={a.amount} onChange={(e) => setAllowances((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
              <button type="button" aria-label="Remove allowance" className="p-2 text-slate-400 hover:text-red-600" onClick={() => setAllowances((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAllowances((x) => [...x, { name: '', amount: '' }])}>Add allowance</Button>
        </div>
        <Input label="PF (% of basic)" type="number" min="0" max="100" step="0.01" {...bind('pfPercent')} />
        <Input label="ESI (% of gross)" type="number" min="0" max="100" step="0.01" {...bind('esiPercent')} />
        <Input label="Professional tax / month (₹)" type="number" min="0" step="0.01" {...bind('professionalTax')} />

        {section('Bank & statutory')}
        <Input label="Account holder" {...bind('accountName')} />
        <Input label="Account number" inputMode="numeric" placeholder={employee?.bank?.accountLast4 ? `•••• ${employee.bank.accountLast4} (enter to change)` : ''} {...bind('accountNumber')} />
        <Input label="IFSC" {...bind('ifsc')} />
        <Input label="Bank" {...bind('bankName')} />
        <Input label="PAN" placeholder={employee?.panLast4 ? `•••••••${employee.panLast4}` : ''} {...bind('pan')} />
        <Input label="UAN (PF)" {...bind('uan')} />
        <Input label="ESI number" {...bind('esiNumber')} />

        {section('Police verification')}
        <Select label="Status" options={VERIFICATION} {...bind('pvStatus')} />
        <Input label="Date" type="date" {...bind('pvDate')} />
        <Input label="Reference no." {...bind('pvReference')} />
        <Input label="Police station" {...bind('pvStation')} />

        {section('Contact')}
        <Input label="Emergency contact" {...bind('ecName')} />
        <Input label="Their phone" {...bind('ecPhone')} />
        <Input label="Relation" {...bind('ecRelation')} />
        <Textarea className="sm:col-span-2" label="Address" rows={2} {...bind('address')} />

        {section('Documents')}
        {employee?.documents?.length > 0 && <div className="sm:col-span-2"><Attachments items={employee.documents} /></div>}
        <FileUpload className="sm:col-span-2" folder="staffhr" files={docs} onChange={setDocs} label="ID proof, verification letter…" />
      </div>
    </Modal>
  );
}
