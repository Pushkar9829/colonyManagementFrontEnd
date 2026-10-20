import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { TwoStepSetup } from '../components/TwoStepCard';

// Shown instead of the app when the society requires two-step verification for this role and it isn't on yet.
export default function MfaSetupRequiredPage() {
  const { t } = useT();
  const { user, reloadUser, logout } = useAuth();
  const navigate = useNavigate();
  if (!user.mfaSetupRequired) return <Navigate to="/" replace />;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t('Set up two-step verification')}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {user.society?.name
          ? t('{society} requires admins and accountants to protect their account with a code from an authenticator app.', { society: user.society.name })
          : t('Your society requires admins and accountants to protect their account with a code from an authenticator app.')}
      </p>
      <div className="mt-6">
        <TwoStepSetup onEnabled={async () => { await reloadUser(); navigate('/', { replace: true }); }} />
      </div>
      <button type="button" className="mt-8 text-sm text-slate-500 hover:text-slate-700" onClick={logout}>{t('Log out')}</button>
    </div>
  );
}
