import { useState } from 'react';
import { api, tokens } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Input } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { label } from '../../../lib/format';
import { ROLE_LABELS } from '../../../lib/roles';
import { PushToggle } from '../../notifications/components/PushToggle';
import { ChannelPrefs } from '../../notifications/components/ChannelPrefs';
import { SessionsCard } from '../components/SessionsCard';
import { TwoStepCard } from '../components/TwoStepCard';
import { PrivacyCard } from '../components/PrivacyCard';

export default function ProfilePage() {
  const { user, reloadUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(null);
  const [errors, setErrors] = useState({});

  const run = async (key, fn) => {
    setSaving(key);
    setErrors({});
    try {
      await fn();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (err.code !== 'VALIDATION_ERROR') toast.error(err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="My profile" />
      {user.society && <PushToggle />}
      {user.society && <ChannelPrefs />}
      <Card>
        <CardHeader title="Account" subtitle={user.email} action={<div className="flex gap-1"><Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>{user.residentType && <Badge>{label(user.residentType)}</Badge>}</div>} />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          </div>
          <p className="text-sm text-slate-500">
            {user.society?.name}
            {user.unit?.label ? ` · Unit ${user.unit.label}` : ''}
            {user.designation ? ` · ${user.designation}` : ''}
          </p>
          <Button loading={saving === 'profile'} onClick={() => run('profile', async () => { await api.patch('/auth/me', { name, phone: phone || undefined }); await reloadUser(); toast.success('Profile saved'); })}>
            Save
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Change password" subtitle="You'll stay logged in here; other devices are signed out." />
        <div className="space-y-4 p-5">
          <Input label="Current password" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <Input label="New password" type="password" hint="At least 8 characters" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={errors.newPassword} />
          <Button
            disabled={!pw.currentPassword || !pw.newPassword}
            loading={saving === 'pw'}
            onClick={() => run('pw', async () => { await api.post('/auth/change-password', { ...pw, refreshToken: tokens.refreshToken() || undefined }); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed'); })}
          >
            Update password
          </Button>
        </div>
      </Card>
      <TwoStepCard />
      <SessionsCard />
      <PrivacyCard />
    </div>
  );
}
