import { useMutation, useQuery } from '@tanstack/react-query';
import { api, request, upload } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useToast } from '../../context/ToastContext';
import { downloadFile } from './download';
import { tt } from '../../lib/i18n/toastText';

// Every accounting query key starts with 'accounting' so one invalidation (and the server's
// realtime 'accounting' event) refreshes balances, journals and reports together.
const inv = { invalidate: ['accounting'] };
const keep = (p) => p;

export const useAccounts = (params = {}) =>
  useQuery({ queryKey: ['accounting', 'accounts', params], queryFn: () => api.get('/accounting/accounts', params), staleTime: 30_000 });
export const useCreateAccount = (o) => useApiMutation((b) => api.post('/accounting/accounts', b), { ...inv, success: (a) => tt('Account {code} added', { code: a.code }), ...o });
export const useUpdateAccount = (o) => useApiMutation(({ id, ...b }) => api.patch(`/accounting/accounts/${id}`, b), { ...inv, success: 'Account updated', ...o });

export const useJournals = (params) => useQuery({ queryKey: ['accounting', 'journals', params], queryFn: () => api.list('/accounting/journals', params), placeholderData: keep });
export const useJournal = (id) => useQuery({ queryKey: ['accounting', 'journal', id], queryFn: () => api.get(`/accounting/journals/${id}`), enabled: Boolean(id) });
export const useCreateJournal = (o) => useApiMutation((b) => api.post('/accounting/journals', b), { ...inv, success: (e) => tt('Entry {number} posted', { number: e.number }), ...o });
export const useReverseJournal = (o) => useApiMutation(({ id, ...b }) => api.post(`/accounting/journals/${id}/reverse`, b), { ...inv, success: (e) => tt('Reversed with {number}', { number: e.number }), ...o });

export const useOpeningBalances = () => useQuery({ queryKey: ['accounting', 'opening'], queryFn: () => api.get('/accounting/opening-balances') });
export const usePostOpeningBalances = (o) => useApiMutation((b) => api.post('/accounting/opening-balances', b), { ...inv, success: 'Opening balances posted', ...o });

export const useSyncStatus = () => useQuery({ queryKey: ['accounting', 'sync'], queryFn: () => api.get('/accounting/sync') });
export const useSync = (o) =>
  useApiMutation((b) => api.post('/accounting/sync', b), {
    ...inv,
    success: (r) => {
      const posted = Object.values(r).reduce((s, v) => s + (v.posted || 0), 0);
      const reversed = Object.values(r).reduce((s, v) => s + (v.reversed || 0), 0);
      return posted || reversed ? tt('Posted {posted} and reversed {reversed} entries', { posted, reversed }) : 'Books are up to date';
    },
    ...o,
  });

export const useReport = (name, params, { enabled = true } = {}) =>
  useQuery({ queryKey: ['accounting', 'report', name, params], queryFn: () => api.get(`/accounting/reports/${name}`, params), enabled, placeholderData: keep });

export const useBudget = (fy) => useQuery({ queryKey: ['accounting', 'budget', fy], queryFn: () => api.get(`/accounting/budgets/${fy}`) });
export const useBudgetReport = (fy) => useQuery({ queryKey: ['accounting', 'budget-report', fy], queryFn: () => api.get(`/accounting/budgets/${fy}/report`) });
// The api helper has no put(); budgets are replaced with PUT through the underlying request().
export const useSaveBudget = (fy, o) =>
  useApiMutation((body) => request('PUT', `/accounting/budgets/${fy}`, { body }).then((j) => j.data), { ...inv, success: 'Budget saved', ...o });

// ---- bank reconciliation ----
export const useBankAccounts = () => useQuery({ queryKey: ['accounting', 'bank', 'accounts'], queryFn: () => api.get('/accounting/bank/accounts') });
export const useStatementLines = (code, params) =>
  useQuery({ queryKey: ['accounting', 'bank', 'lines', code, params], queryFn: () => api.list(`/accounting/bank/${code}/lines`, params), enabled: Boolean(code), placeholderData: keep });
export const useReconciliation = (code, asOf) =>
  useQuery({ queryKey: ['accounting', 'bank', 'summary', code, asOf], queryFn: () => api.get(`/accounting/bank/${code}/summary`, { asOf }), enabled: Boolean(code) });
export const useStatementImports = (code) => useQuery({ queryKey: ['accounting', 'bank', 'imports', code], queryFn: () => api.get(`/accounting/bank/${code}/imports`), enabled: Boolean(code) });
export const useCandidates = (lineId) => useQuery({ queryKey: ['accounting', 'bank', 'candidates', lineId], queryFn: () => api.get(`/accounting/bank/lines/${lineId}/candidates`), enabled: Boolean(lineId) });

const statementForm = (file, mapping) => {
  const fd = new FormData();
  fd.append('file', file);
  if (mapping && Object.keys(mapping).length) fd.append('mapping', JSON.stringify(mapping));
  return fd;
};
export const usePreviewStatement = (code) => useApiMutation(({ file, mapping }) => upload(`/accounting/bank/${code}/preview`, statementForm(file, mapping)), { success: false });
export const useImportStatement = (code, o) =>
  useApiMutation(({ file, mapping }) => upload(`/accounting/bank/${code}/import`, statementForm(file, mapping)), {
    ...inv,
    success: (r) => (r.duplicates
      ? tt('Imported {imported} lines ({duplicates} already imported) · {matched} matched automatically', { imported: r.imported, duplicates: r.duplicates, matched: r.autoMatched })
      : tt('Imported {imported} lines · {matched} matched automatically', { imported: r.imported, matched: r.autoMatched })),
    ...o,
  });
export const useAutoMatch = (code) => useApiMutation(() => api.post(`/accounting/bank/${code}/auto-match`), { ...inv, success: (r) => tt('{count} lines matched', { count: r.matched }) });
export const useMatchLine = (o) => useApiMutation(({ id, entryLines }) => api.post(`/accounting/bank/lines/${id}/match`, { entryLines }), { ...inv, success: 'Line matched', ...o });
export const useUnmatchLine = () => useApiMutation((id) => api.post(`/accounting/bank/lines/${id}/unmatch`), { ...inv, success: 'Line unmatched' });
export const useIgnoreLine = () => useApiMutation((id) => api.post(`/accounting/bank/lines/${id}/ignore`), { ...inv, success: 'Line ignored' });
export const useBookLine = (o) => useApiMutation(({ id, ...b }) => api.post(`/accounting/bank/lines/${id}/create-entry`, b), { ...inv, success: (r) => tt('Booked as {number}', { number: r.entry.number }), ...o });
export const useDeleteImport = () => useApiMutation((id) => api.del(`/accounting/bank/imports/${id}`), { ...inv, success: 'Statement removed' });

// File downloads with a toast on failure.
export function useDownload() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ path, query, filename }) => downloadFile(path, query, filename),
    onError: (err) => toast.error(err),
  });
}
