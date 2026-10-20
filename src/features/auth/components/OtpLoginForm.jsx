import { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import { Button, Input } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';

// Two steps: phone -> 6-digit code sent by SMS -> logged in (or on to the two-step verification code).
export function OtpLoginForm({ onDone, onMfa }) {
  const { t } = useT();
  const { loginWithOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/auth/otp/request', { phone: phone.trim() }, { auth: false });
      setSent(true);
      setCooldown(30);
      // devCode only exists in development with the console SMS provider
      setInfo(r.devCode ? `${r.message} (Dev code: ${r.devCode})` : r.message);
    } catch (err) {
      setError(err.fieldErrors?.phone || err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const pending = await loginWithOtp(phone.trim(), code.trim());
      if (pending?.mfaRequired) onMfa(pending.mfaToken);
      else onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sent) {
    return (
      <form onSubmit={send} className="space-y-4">
        <Input label={t('Mobile number')} type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">{t('Send code')}</Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      {info && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{info}</p>}
      <Input label={t('6-digit code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">{t('Verify & log in')}</Button>
      <div className="flex justify-between text-sm">
        <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => { setSent(false); setCode(''); setInfo(''); }}>{t('Change number')}</button>
        <button type="button" className="font-medium text-brand-600 hover:underline disabled:text-slate-400 disabled:no-underline" disabled={cooldown > 0 || loading} onClick={send}>
          {cooldown ? t('Resend code ({s}s)', { s: cooldown }) : t('Resend code')}
        </button>
      </div>
    </form>
  );
}
