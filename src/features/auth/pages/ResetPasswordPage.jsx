import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../../api/client';
import { Button, Input, PageLoader } from '../../../components/ui';

// Handles both "forgot password" links and "set your password" invites for imported/added members.
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const invite = params.get('invite') === '1';
  const [info, setInfo] = useState(null);
  const [invalid, setInvalid] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalid('This link is missing its token.');
      return;
    }
    api.post('/auth/password/check', { token }, { auth: false }).then(setInfo).catch((err) => setInvalid(err.message));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password/reset', { token, password }, { auth: false });
      setDone(true);
    } catch (err) {
      setError(err.fieldErrors?.password || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (invalid) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Link not valid</h1>
        <p className="mt-2 text-sm text-slate-500">{invalid}</p>
        <Link to="/forgot-password" className="mt-6 inline-block font-medium text-brand-600 hover:underline">Request a new link</Link>
      </div>
    );
  }
  if (!info) return <PageLoader />;
  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Password {invite ? 'set' : 'changed'}</h1>
        <p className="mt-2 text-sm text-slate-500">You can now log in with your new password. Other devices were signed out.</p>
        <Link to="/login" className="mt-6 inline-block font-medium text-brand-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{invite ? 'Welcome to ColonyHub' : 'Choose a new password'}</h1>
      <p className="mt-1 text-sm text-slate-500">{info.name ? `${info.name} · ` : ''}{info.email}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">{invite ? 'Set password' : 'Change password'}</Button>
      </form>
    </div>
  );
}
