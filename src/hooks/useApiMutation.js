import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';
import { useT } from '../context/LanguageContext';

// useMutation + cache invalidation + toasts, the pattern every feature form uses.
//   invalidate: array of query-key prefixes to refetch on success
//   success: toast text (or fn(data, vars, t) => text); set false to stay quiet
export function useApiMutation(mutationFn, { invalidate = [], success, onSuccess, toastErrors = true } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useT();
  return useMutation({
    mutationFn,
    onSuccess: async (data, vars) => {
      await Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })));
      const msg = typeof success === 'function' ? success(data, vars, t) : success;
      if (msg) toast.success(typeof msg === 'string' ? t(msg) : msg);
      onSuccess?.(data, vars);
    },
    onError: (err) => {
      // Validation errors are shown inline by the form; everything else as a toast.
      if (toastErrors && err.code !== 'VALIDATION_ERROR') toast.error(err);
    },
  });
}
