import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { api } from '../../../api/client';
import { Button, Card, CardHeader, Checkbox, Modal, StatusBadge, Textarea } from '../../../components/ui';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { date, todayISO } from '../../../lib/format';
import { downloadFile } from '../../accounting/download';

// Personal data rights under India's DPDP Act 2023: get a copy of your data, ask for your account to be erased.
export function PrivacyCard() {
  const toast = useToast();
  const { t } = useT();
  const [downloading, setDownloading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const { data: request } = useQuery({ queryKey: ['deletion-request'], queryFn: () => api.get('/me/deletion-request') });
  const ask = useApiMutation((b) => api.post('/me/deletion-request', b), {
    invalidate: ['deletion-request'],
    success: 'Request sent to your society admin',
    onSuccess: (d) => {
      setAsking(false);
      setReason('');
      setUnderstood(false);
      if (d.soleAdminOf?.length) toast.error(t('You are the only admin of {societies}. Make someone else an admin so the request can be approved.', { societies: d.soleAdminOf.join(', ') }));
    },
  });
  const cancel = useApiMutation(() => api.del('/me/deletion-request'), { invalidate: ['deletion-request'], success: 'Request withdrawn' });

  const exportData = async () => {
    setDownloading(true);
    try {
      await downloadFile('/me/data-export', undefined, `colonyhub-my-data-${todayISO()}.json`);
    } catch (err) {
      toast.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const pending = request?.status === 'pending';
  return (
    <Card>
      <CardHeader title="Your data & privacy" subtitle="Download a copy of your personal data, or ask for your account to be deleted." />
      <div className="divide-y divide-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-slate-800">{t('Download my data')}</p>
            <p className="text-slate-500">{t('Profile, homes, complaints, bookings, bills and payments, votes, messages and posts — as a JSON file.')}</p>
          </div>
          <Button variant="secondary" icon={Download} loading={downloading} onClick={exportData}>Download</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-slate-800">{t('Delete my account')}</p>
            {request ? (
              <p className="text-slate-500">
                {t('Request of {date}:', { date: date(request.createdAt) })} <StatusBadge status={request.status} />
                {request.status === 'rejected' && request.decisionNote ? ` — ${request.decisionNote}` : ''}
              </p>
            ) : (
              <p className="text-slate-500">{t('Your society admin reviews the request before your account is erased.')}</p>
            )}
          </div>
          {pending ? (
            <Button variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate()}>Withdraw request</Button>
          ) : (
            <Button variant="danger" icon={Trash2} onClick={() => setAsking(true)}>Request deletion</Button>
          )}
        </div>
      </div>

      <Modal open={asking} onClose={() => setAsking(false)} title="Delete my account"
        footer={<><Button variant="ghost" onClick={() => setAsking(false)}>Cancel</Button><Button variant="danger" disabled={!understood} loading={ask.isPending} onClick={() => ask.mutate({ reason: reason.trim() || undefined })}>Send request</Button></>}>
        <div className="space-y-4 text-sm text-slate-600">
          <p>{t('Once your society admin approves, your name, email, phone and photo are removed, you are signed out everywhere and you can no longer log in.')}</p>
          <p>{t("Bills, payments, receipts and the society's statutory registers stay with your flat, because the law requires societies to keep them.")}</p>
          <Textarea label="Reason (optional)" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Checkbox label="I understand this cannot be undone" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
        </div>
      </Modal>
    </Card>
  );
}
