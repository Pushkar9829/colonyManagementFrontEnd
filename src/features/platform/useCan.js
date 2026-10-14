import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { permissionChecker } from '../../lib/platformPermissions';

// const can = useCan(); can('societies.suspend') — what the signed-in platform member may do.
export function useCan() {
  const { user } = useAuth();
  return useMemo(() => permissionChecker(user), [user]);
}
