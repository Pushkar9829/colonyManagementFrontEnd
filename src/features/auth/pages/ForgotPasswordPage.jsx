import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api } from '../../../api/client';
import { Button, Input } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { errorText } from '../../../lib/errorText';

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setSent(await api.post('/auth/password/forgot', { email: email.trim() }, { auth: false }));
    } catch (err) {
      setError(err.fieldErrors?.email || errorText(err, t));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-12 text-brand-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">{t('Check your email')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t(sent.message)} {t('The link works for 30 minutes.')}</p>
        {sent.devLink && (
          <p className="mt-4 break-all rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
            Dev only (no email provider configured): <a className="font-medium underline" href={sent.devLink}>open the reset link</a>
          </p>
        )}
        <Link to="/login" className="mt-6 inline-block font-medium text-brand-600 hover:underline">{t('Back to login')}</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t('Forgot password')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("Enter your account email and we'll send a reset link. No email on your account? Log in with an SMS code instead.")}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
      </form>
      <p className="mt-6 text-sm text-slate-600"><Link to="/login" className="font-medium text-brand-600 hover:underline">{t('Back to login')}</Link></p>
    </div>
  );
}
