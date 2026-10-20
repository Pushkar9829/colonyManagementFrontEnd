import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input } from '../../../components/ui';
import { useForm } from '../../../hooks/useForm';
import { useT } from '../../../context/LanguageContext';
import { LoginBrandBanner, useLoginBrand } from '../../whitelabel/components/BrandMark';

export default function RegisterSocietyPage() {
  const { t } = useT();
  const { registerSociety } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const brand = useLoginBrand();
  const { values, bind, applyServerErrors } = useForm({
    name: '',
    city: '',
    state: '',
    address: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    designation: 'Secretary',
    licenceKey: '',
  });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerSociety({
        society: { name: values.name, city: values.city || undefined, state: values.state || undefined, address: values.address || undefined },
        admin: { name: values.adminName, email: values.email, phone: values.phone || undefined, password: values.password, designation: values.designation || undefined },
        licenceKey: values.licenceKey.trim() || undefined,
      });
      navigate('/units', { replace: true });
    } catch (err) {
      // map nested server field names onto this flat form
      const fe = err.fieldErrors || {};
      applyServerErrors({
        fieldErrors: {
          name: fe['society.name'],
          adminName: fe['admin.name'],
          email: fe['admin.email'],
          phone: fe['admin.phone'],
          password: fe['admin.password'],
          licenceKey: fe.licenceKey,
        },
      });
      if (err.code !== 'VALIDATION_ERROR') setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <LoginBrandBanner brand={brand} />
      <h1 className="text-2xl font-semibold text-slate-900">{t('Register your society')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("You'll become the society admin. Add blocks and units next.")}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Society')}</legend>
          <Input label="Society name" required {...bind('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" {...bind('city')} />
            <Input label="State" {...bind('state')} />
          </div>
          <Input label="Address" {...bind('address')} />
        </fieldset>
        <fieldset className="space-y-4 pt-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Admin account')}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Your name" required {...bind('adminName')} />
            <Input label="Designation" {...bind('designation')} />
          </div>
          <Input label="Email" type="email" required {...bind('email')} />
          <Input label="Phone" type="tel" {...bind('phone')} />
          <Input label="Password" type="password" required hint="At least 8 characters" {...bind('password')} />
        </fieldset>
        <fieldset className="space-y-4 pt-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Licence key (optional)')}</legend>
          <Input label="Licence key" placeholder="CH-XXXX-XXXX-XXXX" autoComplete="off" hint={brand ? t('From {app}', { app: brand.appName }) : 'Only if your provider gave you one'} {...bind('licenceKey')} />
        </fieldset>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Create society
        </Button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        {t('Already registered?')}{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          {t('Log in')}
        </Link>
      </p>
    </div>
  );
}
