import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input, Tabs } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { OtpLoginForm } from '../components/OtpLoginForm';
import { MfaStep } from '../components/MfaStep';

const DEMO = [
  ['Admin', 'admin@demo.test'],
  ['Resident', 'resident@demo.test'],
  ['Guard', 'guard@demo.test'],
  ['Accountant', 'accountant@demo.test'],
  ['Manager', 'manager@demo.test'],
  ['Staff', 'plumber@demo.test'],
];
// The platform console's team, one per built-in role the seed creates.
const PLATFORM_DEMO = [
  ['Owner', 'superadmin@demo.test'],
  ['Billing', 'billing@demo.test'],
  ['Support', 'support@demo.test'],
  ['Viewer', 'viewer@demo.test'],
];
const DEMO_PASSWORD = 'Password@123';

export default function LoginPage() {
  const { t } = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('password');
  const [mfaToken, setMfaToken] = useState(null);
  const done = () => navigate(location.state?.from || '/', { replace: true });

  const signIn = async (id, pw) => {
    setError('');
    setLoading(true);
    try {
      const pending = await login(id.trim(), pw);
      if (pending?.mfaRequired) setMfaToken(pending.mfaToken);
      else done();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    signIn(identifier, password);
  };

  if (mfaToken) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('Two-step verification')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('One more step to keep your account safe.')}</p>
        <div className="mt-6">
          <MfaStep mfaToken={mfaToken} onDone={done} onRestart={() => { setMfaToken(null); setPassword(''); }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t('Welcome back')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('Log in with your password or a one-time SMS code.')}</p>

      <Tabs className="mt-6" value={mode} onChange={setMode} tabs={[{ value: 'password', label: t('Password') }, { value: 'otp', label: t('SMS code') }]} />
      {mode === 'otp' ? <div className="mt-6"><OtpLoginForm onDone={done} onMfa={setMfaToken} /></div> : (
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label={t('Email or phone')} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        <Input label={t('Password')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          {t('Log in')}
        </Button>
        <p className="text-right text-sm"><Link to="/forgot-password" className="text-brand-600 hover:underline">{t('Forgot password?')}</Link></p>
      </form>
      )}

      <div className="mt-6 space-y-2 text-sm text-slate-600">
        <p>
          New resident?{' '}
          <Link to="/join" className="font-medium text-brand-600 hover:underline">
            Join your society
          </Link>
        </p>
        <p>
          Managing a society?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Register it here
          </Link>
        </p>
      </div>

      {(import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true') && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Try the demo — tap a role to log in</p>
          <p className="mt-0.5 text-xs text-slate-400">All demo accounts use the password {DEMO_PASSWORD}</p>
          {[['Society', DEMO], ['Platform team', PLATFORM_DEMO]].map(([group, accounts]) => (
            <div key={group} className="mt-2 flex flex-wrap items-center gap-2">
              <span className="w-full text-[11px] font-medium text-slate-400 sm:w-24">{group}</span>
              {accounts.map(([name, email]) => (
                <button
                  key={email}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIdentifier(email);
                    setPassword(DEMO_PASSWORD);
                    signIn(email, DEMO_PASSWORD);
                  }}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
