import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';

// Second login step: 6-digit code from the authenticator app, or a one-time backup code.
export function MfaStep({ mfaToken, onDone, onRestart }) {
  const { t } = useT();
  const { verifyMfa } = useAuth();
  const [useBackup, setUseBackup] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // The server locks or expires the attempt; the only way forward is logging in again.
  const [dead, setDead] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMfa(mfaToken, useBackup ? { backupCode: value.trim() } : { code: value.trim() });
      onDone();
    } catch (err) {
      setError(err.message);
      if (['MFA_LOCKED', 'MFA_TOKEN_INVALID'].includes(err.code)) setDead(true);
      setValue('');
    } finally {
      setLoading(false);
    }
  };

  const valid = useBackup ? value.replace(/[^a-z0-9]/gi, '').length >= 8 : /^\d{6}$/.test(value);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <p>{useBackup ? t('Enter one of your backup codes. Each code works only once.') : t('Open your authenticator app and enter the 6-digit code for ColonyHub.')}</p>
      </div>
      {useBackup ? (
        <Input key="backup" label={t('Backup code')} autoComplete="one-time-code" placeholder="XXXXX-XXXXX" value={value} onChange={(e) => setValue(e.target.value)} required autoFocus disabled={dead} />
      ) : (
        <Input key="totp" label={t('Authentication code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} required autoFocus disabled={dead} />
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {dead ? (
        <Button className="w-full" onClick={onRestart}>{t('Log in again')}</Button>
      ) : (
        <Button type="submit" loading={loading} disabled={!valid} className="w-full">{t('Verify & log in')}</Button>
      )}
      <div className="flex justify-between text-sm">
        <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onRestart}>{t('Back')}</button>
        {!dead && (
          <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => { setUseBackup(!useBackup); setValue(''); setError(''); }}>
            {useBackup ? t('Use the authenticator app') : t('Use a backup code')}
          </button>
        )}
      </div>
    </form>
  );
}
