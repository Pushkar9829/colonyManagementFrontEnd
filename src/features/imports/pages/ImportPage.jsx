import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { BASE_URL, tokens, upload } from '../../../api/client';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Table, Tabs } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';

const KINDS = {
  units: { label: 'Units', help: 'Columns: Block, Unit number, Floor, Type (flat/villa/plot/shop/other), Area sqft. Missing blocks are created.' },
  members: { label: 'Members', help: 'Columns: Name, Email, Phone, Role (resident/tenant/admin/accountant/manager/guard/staff), Unit (e.g. A-101), Resident type, Designation. New people get an email invite to set their password. Import units first.' },
};
const TONE = { created: 'green', skipped: 'slate', failed: 'red', invalid: 'amber' };

async function downloadTemplate(kind) {
  const res = await fetch(`${BASE_URL}/imports/${kind}/template`, { headers: { Authorization: `Bearer ${tokens.access()}` } });
  if (!res.ok) throw new Error('Could not download the template');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `colonyhub-${kind}-template.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const input = useRef(null);
  const [kind, setKind] = useState('units');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(null);

  const send = async (step) => {
    const fd = new FormData();
    fd.append('file', file);
    return upload(`/imports/${kind}/${step}`, fd);
  };

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFile(f);
    setResult(null);
    setBusy('preview');
    try {
      const fd = new FormData();
      fd.append('file', f);
      setPreview(await upload(`/imports/${kind}/preview`, fd));
    } catch (err) {
      toast.error(err);
      setPreview(null);
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    setBusy('commit');
    try {
      const r = await send('commit');
      setResult(r);
      setPreview(null);
      toast.success(`${r.created} created, ${r.skipped} skipped${r.failed ? `, ${r.failed} failed` : ''}`);
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['blocks'] });
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  const switchKind = (k) => {
    setKind(k);
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Import from Excel" description="Onboard a society in minutes: download the template, fill it, upload to check, then import." />
      <Tabs className="mb-4 w-fit" value={kind} onChange={switchKind} tabs={Object.entries(KINDS).map(([value, k]) => ({ value, label: k.label }))} />
      <Card className="mb-6">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <FileSpreadsheet className="size-10 shrink-0 text-emerald-600" />
          <p className="flex-1 text-sm text-slate-600">{KINDS[kind].help}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Download} onClick={() => downloadTemplate(kind).catch((e) => toast.error(e.message))}>Template</Button>
            <Button icon={Upload} loading={busy === 'preview'} onClick={() => input.current?.click()}>{file ? 'Choose another file' : 'Upload .xlsx / .csv'}</Button>
          </div>
          <input ref={input} type="file" hidden accept=".xlsx,.csv" onChange={pick} />
        </div>
      </Card>

      {preview && (
        <Card>
          <CardHeader
            title={`Check: ${file?.name}`}
            subtitle={`${preview.valid} of ${preview.total} rows ready${preview.invalid ? ` · ${preview.invalid} with problems (they will be skipped)` : ''}`}
            action={<Button disabled={!preview.valid} loading={busy === 'commit'} onClick={commit}>Import {preview.valid} rows</Button>}
          />
          <Table rows={preview.rows} rowKey="row"
            columns={[
              { key: 'row', header: 'Row' },
              { key: 'label', header: 'Record', render: (r) => <span className="font-medium text-slate-800">{r.label}</span> },
              { key: 'errors', header: 'Check', className: 'whitespace-normal', render: (r) => (r.errors.length ? <span className="text-red-600">{r.errors.join('; ')}</span> : <Badge tone="green">OK</Badge>) },
            ]} />
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader title="Import finished" subtitle={`${result.created} created · ${result.skipped} skipped · ${result.failed} failed · ${result.invalid} invalid`} />
          <Table rows={result.results} rowKey="row"
            columns={[
              { key: 'row', header: 'Row' },
              { key: 'label', header: 'Record' },
              { key: 'status', header: 'Result', render: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
              { key: 'message', header: 'Note', className: 'whitespace-normal text-xs text-slate-500' },
            ]} />
        </Card>
      )}
    </div>
  );
}
