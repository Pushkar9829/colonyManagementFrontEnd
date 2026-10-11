import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Badge, Button, Modal } from '../../../components/ui';
import { money } from '../../../lib/format';
import { useDownload, useImportOpening } from '../api';

// Go-live import of dues brought forward: check first (dry run), then import.
export function OpeningBalancesModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const run = useImportOpening({ onSuccess: (r) => setResult(r) });
  const { download, busy } = useDownload();
  const failed = result?.results?.filter((r) => !r.ok) || [];
  return (
    <Modal open onClose={onClose} size="lg" title="Import opening balances"
      description="One row per unit: Unit (e.g. A-101), Amount in ₹ (negative = advance held), As of (YYYY-MM-DD). Dues become an opening bill; advances become credit. Each unit can be imported once."
      footer={
        <>
          <Button variant="ghost" icon={Download} loading={busy === 'tpl'} onClick={() => download('tpl', '/bills/opening-balances/template.xlsx', null, 'opening-balances-template.xlsx')}>Template</Button>
          <Button variant="secondary" disabled={!file} loading={run.isPending && run.variables?.dryRun} onClick={() => run.mutate({ file, dryRun: true })}>Check file</Button>
          <Button icon={Upload} disabled={!file} loading={run.isPending && !run.variables?.dryRun} onClick={() => window.confirm('Import these opening balances?') && run.mutate({ file })}>Import</Button>
        </>
      }>
      <div className="space-y-4 text-sm">
        <input type="file" accept=".xlsx,.csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-medium file:text-brand-700" />
        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {result.dryRun ? <Badge tone="blue">{result.valid} ready</Badge> : <Badge tone="green">{result.imported} imported</Badge>}
              {result.failed > 0 && <Badge tone="red">{result.failed} with problems</Badge>}
            </div>
            {failed.length > 0 && (
              <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {failed.map((r) => (
                  <li key={`${r.row}-${r.unit}`} className="flex justify-between gap-3 px-3 py-2">
                    <span>Row {r.row ?? '–'} · {r.unit} {Number.isFinite(r.amount) ? `· ${money(r.amount)}` : ''}</span>
                    <span className={r.skipped ? 'text-amber-700' : 'text-red-600'}>{r.error}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
