import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button, Input, Modal, Select } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ROLE_LABELS } from '../../../lib/roles';
import { useLoginAsRules } from '../api';
import { canLoginAsRole, DURATIONS } from '../lib';

// Confirm step: your own password (and two-step code), a reason and how long. Everything is logged and the
// person can see it on their profile.
export function LoginAsModal({ target, onClose }) {
  const { user, loginAs } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', code: '', reason: '', minutes: '30' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await loginAs({
        membershipId: target.membershipId,
        password: form.password,
        reason: form.reason,
        minutes: Number(form.minutes),
        ...(user.mfaEnabled && form.code ? (/^\d{6}$/.test(form.code.trim()) ? { code: form.code.trim() } : { backupCode: form.code.trim() }) : {}),
      });
      onClose();
      navigate('/');
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else if (err.code === 'PASSWORD_INCORRECT') setErrors({ password: err.message });
      else if (err.code?.startsWith('MFA_')) setErrors({ code: err.message });
      else toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const who = [target.name, target.unitLabel].filter(Boolean).join(' · ');
  return (
    <Modal open onClose={onClose} title={`Log in as ${target.name}`} description={`${who}${target.role ? ` · ${ROLE_LABELS[target.role] || target.role}` : ''}. You will see the app exactly as they do. This is recorded and they can see it.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={LogIn} loading={busy} onClick={submit}>Log in as</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Your password" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} error={errors.password} />
        {user.mfaEnabled && <Input className="sm:col-span-2" label="Two-step code" inputMode="numeric" autoComplete="one-time-code" hint="6-digit code from your app, or a backup code" required value={form.code} onChange={set('code')} error={errors.code || errors.backupCode} />}
        <Input className="sm:col-span-2" label="Reason" required placeholder="e.g. Checking the bill they reported" maxLength={200} value={form.reason} onChange={set('reason')} error={errors.reason} />
        <Select label="For" options={DURATIONS} value={form.minutes} onChange={set('minutes')} error={errors.minutes} />
        <button type="submit" hidden aria-hidden="true" />
      </form>
    </Modal>
  );
}

// Row action. Society members: shown only for roles the rules allow; platform console: always (the server decides).
export function LoginAsButton({ target, size = 'sm', variant = 'ghost', className }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isSocietyUser = Boolean(user?.society);
  const rules = useLoginAsRules({ enabled: isSocietyUser && ['admin', 'accountant', 'facility_manager'].includes(user?.role) && !user?.actingAs });
  if (!user || user.actingAs || String(target.user) === String(user._id)) return null;
  if (isSocietyUser && !canLoginAsRole(rules.data, target.role)) return null;
  return (
    <>
      <Button size={size} variant={variant} icon={LogIn} className={className} title={`Log in as ${target.name}`} onClick={() => setOpen(true)}>Log in as</Button>
      {open && <LoginAsModal target={target} onClose={() => setOpen(false)} />}
    </>
  );
}
