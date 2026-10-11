import { useState } from 'react';
import { api } from '../../../api/client';
import { Card, CardHeader, Checkbox } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

// SMS / WhatsApp opt-outs. Safety alerts (SOS) are always delivered.
export function ChannelPrefs() {
  const { user, reloadUser } = useAuth();
  const toast = useToast();
  const prefs = { sms: user.notificationPrefs?.sms !== false, whatsapp: user.notificationPrefs?.whatsapp !== false, email: user.notificationPrefs?.email !== false };
  const [saving, setSaving] = useState(null);

  const toggle = async (key) => {
    setSaving(key);
    try {
      await api.patch('/auth/me', { notificationPrefs: { [key]: !prefs[key] } });
      await reloadUser();
      toast.success('Preference saved');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader title="Messages on your phone" subtitle={user.phone ? `Sent to ${user.phone}` : 'Add a phone number above to receive these'} />
      <div className="space-y-3 p-5">
        <Checkbox label="WhatsApp — bills, payment receipts and dues reminders" checked={prefs.whatsapp} disabled={saving === 'whatsapp'} onChange={() => toggle('whatsapp')} />
        <Checkbox label="SMS — overdue dues reminders" checked={prefs.sms} disabled={saving === 'sms'} onChange={() => toggle('sms')} />
        <Checkbox label="Email — notices, receipts and reports sent by email" checked={prefs.email} disabled={saving === 'email'} onChange={() => toggle('email')} />
        <p className="text-xs text-slate-500">SOS emergency alerts are always sent, whatever you choose here.</p>
      </div>
    </Card>
  );
}
