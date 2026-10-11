import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../../api/client';
import { Button, Input, Select } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';

export default function JoinSocietyPage() {
  const [step, setStep] = useState('code'); // code -> details -> done
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { values, bind, applyServerErrors } = useForm({ code: '', block: '', unit: '', name: '', email: '', phone: '', password: '', residentType: 'owner' });

  const lookup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setSociety(await api.get(`/auth/societies/${values.code.trim().toUpperCase()}`));
      setStep('details');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(
        '/auth/join',
        {
          societyCode: values.code.trim().toUpperCase(),
          name: values.name,
          email: values.email || undefined,
          phone: values.phone || undefined,
          password: values.password,
          unit: values.unit,
          residentType: values.residentType,
        },
        { auth: false },
      );
      setStep('done');
    } catch (err) {
      applyServerErrors(err);
      if (err.code !== 'VALIDATION_ERROR') setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Request sent</h1>
        <p className="mt-2 text-sm text-slate-500">The {society?.society?.name} admin will review your request. You can log in once it is approved.</p>
        <Link to="/login" className="mt-6 inline-block font-medium text-brand-600 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  const units = (society?.units || []).filter((u) => !values.block || String(u.block) === values.block);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Join your society</h1>
      <p className="mt-1 text-sm text-slate-500">Ask your society office for the 6-character joining code.</p>

      {step === 'code' ? (
        <form onSubmit={lookup} className="mt-6 space-y-4">
          <Input label="Society code" required maxLength={6} placeholder="e.g. DEMO01" className="uppercase" {...bind('code')} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Joining <strong>{society.society.name}</strong>
            {society.society.city ? `, ${society.society.city}` : ''}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Block" placeholder="All blocks" options={society.blocks.map((b) => ({ value: b._id, label: b.name }))} {...bind('block')} />
            <Select label="Unit" required placeholder="Select unit" options={units.map((u) => ({ value: u._id, label: u.label }))} {...bind('unit')} />
          </div>
          <Select
            label="You are"
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'tenant', label: 'Tenant' },
              { value: 'family', label: 'Family member' },
            ]}
            {...bind('residentType')}
          />
          <Input label="Full name" required {...bind('name')} />
          <Input label="Email" type="email" {...bind('email')} />
          <Input label="Phone" type="tel" {...bind('phone')} />
          <Input label="Password" type="password" required hint="At least 8 characters" {...bind('password')} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('code')}>
              Back
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Send request
            </Button>
          </div>
        </form>
      )}
      <p className="mt-6 text-sm text-slate-600">
        Already approved?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
