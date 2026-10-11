import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui';
import { hasRole } from '../../lib/roles';

export function RequireAuth() {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!user.society || !hasRole(user, ...roles)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Platform console (no society open).
export function RequirePlatform() {
  const { user } = useAuth();
  if (user.society || user.platformRole !== 'super_admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, booting } = useAuth();
  if (booting) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
