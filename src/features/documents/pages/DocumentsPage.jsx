import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Archive, Download, FileText, Folder, FolderPlus, History, Search, Upload } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, Checkbox, FileUpload, Input, Modal, PageLoader, Pagination, Select, Table, Textarea } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { useForm } from '../../../hooks/useForm';
import { cn } from '../../../lib/cn';
import { date, dateTime } from '../../../lib/format';
import { ROLE_LABELS } from '../../../lib/roles';
import { useGovernance } from '../../committee/api';
import { openDocument, useAddVersion, useArchiveDocument, useCreateFolder, useDocument, useDocumentTags, useDocuments, useDownloadLog, useFolders, useUpdateDocument, useUploadDocument } from '../api';

const VISIBILITY = [
  { value: 'all', label: 'All members' },
  { value: 'committee', label: 'Committee only' },
  { value: 'admins', label: 'Admins only' },
  { value: 'roles', label: 'Specific roles' },
];
const ROLE_OPTIONS = ['resident', 'guard', 'staff', 'accountant', 'facility_manager'];
const visibilityText = (v) => (v?.type === 'roles' ? v.roles.map((r) => ROLE_LABELS[r]).join(', ') : VISIBILITY.find((x) => x.value === v?.type)?.label);

function ExpiryBadge({ d }) {
  if (!d.expiryDate) return null;
  if (d.expiryState === 'expired') return <Badge tone="red">Expired {date(d.expiryDate)}</Badge>;
  if (d.expiryState === 'expiring') return <Badge tone="amber">Expires in {d.daysToExpiry} d</Badge>;
  return <Badge>Valid till {date(d.expiryDate)}</Badge>;
}

function VisibilityFields({ value, onChange }) {
  const roles = value.roles || [];
  return (
    <div className="space-y-2">
      <Select label="Who can see it" options={VISIBILITY} value={value.type} onChange={(e) => onChange({ type: e.target.value, roles })} />
      {value.type === 'roles' && (
        <div className="flex flex-wrap gap-3">
          {ROLE_OPTIONS.map((r) => <Checkbox key={r} label={ROLE_LABELS[r]} checked={roles.includes(r)} onChange={() => onChange({ type: 'roles', roles: roles.includes(r) ? roles.filter((x) => x !== r) : [...roles, r] })} />)}
        </div>
      )}
    </div>
  );
}

const parseTags = (s) => s.split(',').map((t) => t.trim()).filter(Boolean);

function UploadModal({ open, onClose, folders, folder }) {
  const { values, bind, applyServerErrors, reset, errors } = useForm({ folder: folder || '', title: '', description: '', tags: '', expiryDate: '', remindDaysBefore: '30' });
  const [visibility, setVisibility] = useState({ type: 'all', roles: [] });
  const [files, setFiles] = useState([]);
  const upload = useUploadDocument({ onSuccess: () => { reset(); setFiles([]); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Upload document"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={upload.isPending} disabled={!files.length} onClick={() => upload.mutate({
        folder: values.folder || folder, title: values.title, description: values.description || undefined, tags: parseTags(values.tags), visibility,
        upload: files[0]?._id, expiryDate: values.expiryDate || undefined, remindDaysBefore: values.expiryDate ? Number(values.remindDaysBefore) : undefined,
      }, { onError: applyServerErrors })}>Upload</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Folder" placeholder="Choose" options={folders.map((f) => ({ value: f._id, label: f.name }))} {...bind('folder')} value={values.folder || folder || ''} />
        <Input label="Title" required {...bind('title')} />
        <Textarea className="sm:col-span-2" label="Description" rows={2} {...bind('description')} />
        <Input className="sm:col-span-2" label="Tags" placeholder="insurance, 2026, building" hint="Comma separated" {...bind('tags')} />
        <div className="sm:col-span-2"><VisibilityFields value={visibility} onChange={setVisibility} /></div>
        <Input type="date" label="Expiry date (optional)" {...bind('expiryDate')} />
        {values.expiryDate && <Input type="number" min="0" label="Remind days before" {...bind('remindDaysBefore')} />}
        <div className="sm:col-span-2"><FileUpload folder="documents" files={files} onChange={setFiles} max={1} label="Choose file" />{errors.upload && <p className="text-xs text-red-600">{errors.upload}</p>}</div>
      </div>
    </Modal>
  );
}

function DocumentModal({ id, onClose, manage }) {
  const toast = useToast();
  const { data: d, isLoading } = useDocument(id);
  const { data: log = [] } = useDownloadLog(id, manage);
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [expiry, setExpiry] = useState('');
  const addVersion = useAddVersion({ onSuccess: () => { setFiles([]); setNote(''); setExpiry(''); } });
  const update = useUpdateDocument();
  const archive = useArchiveDocument();
  const open = (version) => openDocument(id, version).catch((err) => toast.error(err));
  return (
    <Modal open={Boolean(id)} onClose={onClose} size="lg" title={d?.title || 'Document'} description={d && `${d.folder?.name} · version ${d.currentVersion}`}
      footer={d && <><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={Download} onClick={() => open()}>Open latest</Button></>}>
      {isLoading || !d ? <PageLoader /> : (
        <div className="space-y-5 text-sm">
          {d.description && <p className="text-slate-700">{d.description}</p>}
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{visibilityText(d.visibility)}</Badge>
            <ExpiryBadge d={d} />
            {d.tags.map((t) => <Badge key={t}>#{t}</Badge>)}
            {manage && <Badge>{d.downloads} download(s)</Badge>}
            {d.archived && <Badge tone="red">Archived</Badge>}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-medium text-slate-900"><History className="size-4" /> Versions</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {d.versions.map((v) => (
                <li key={v.version} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">v{v.version} · {v.name || 'file'} {v.version === d.currentVersion && <Badge tone="green">current</Badge>}</p>
                    <p className="text-xs text-slate-500">{dateTime(v.uploadedAt)}{v.uploadedBy?.name ? ` by ${v.uploadedBy.name}` : ''}{v.note ? ` · ${v.note}` : ''}</p>
                  </div>
                  <Button size="sm" variant="ghost" icon={Download} aria-label={`Download version ${v.version}`} onClick={() => open(v.version)} />
                </li>
              ))}
            </ul>
          </div>
          {manage && !d.archived && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">Upload a new version</p>
              <FileUpload folder="documents" files={files} onChange={setFiles} max={1} label="Choose file" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="What changed? (e.g. renewed policy)" value={note} onChange={(e) => setNote(e.target.value)} />
                {d.expiryDate && <Input type="date" aria-label="New expiry date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />}
              </div>
              <Button size="sm" disabled={!files.length} loading={addVersion.isPending} onClick={() => addVersion.mutate({ id, upload: files[0]._id, note: note || undefined, expiryDate: expiry || undefined })}>Save version</Button>
            </div>
          )}
          {manage && (
            <div className="space-y-2">
              <VisibilityFields value={d.visibility} onChange={(v) => (v.type !== 'roles' || v.roles.length) && update.mutate({ id, visibility: v })} />
              <Button size="sm" variant="ghost" icon={Archive} onClick={() => archive.mutate({ id, archived: !d.archived })}>{d.archived ? 'Restore' : 'Archive'}</Button>
            </div>
          )}
          {manage && log.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-900">Recent downloads</p>
              <ul className="max-h-40 overflow-y-auto text-xs text-slate-600">{log.map((l) => <li key={l._id} className="py-0.5">{l.user?.name} · v{l.version} · {dateTime(l.at)}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function DocumentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: access } = useGovernance();
  const manage = Boolean(access?.canManage);
  const { data: folders = [], isLoading } = useFolders();
  const { data: tags = [] } = useDocumentTags();
  const [filters, setFilters] = useState({ folder: '', q: '', tag: '', expiring: false, archived: false, page: 1 });
  const { data, isLoading: loadingDocs } = useDocuments(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== false)));
  const [uploading, setUploading] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const createFolder = useCreateFolder({ onSuccess: () => setNewFolder('') });
  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  if (isLoading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Document library" description="Bye-laws, audit reports, minutes, agreements, NOCs, insurance and more."
        actions={manage && <Button icon={Upload} onClick={() => setUploading(true)}>Upload</Button>} />
      <div className="grid gap-6 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <Select className="lg:hidden" placeholder="All folders" options={folders.map((f) => ({ value: f._id, label: `${f.name} (${f.documents})` }))} value={filters.folder} onChange={(e) => set({ folder: e.target.value })} />
          <Card className="hidden p-2 lg:block">
            {[{ _id: '', name: 'All documents', documents: folders.reduce((s, f) => s + f.documents, 0) }, ...folders].map((f) => (
              <button key={f._id || 'all'} type="button" onClick={() => set({ folder: f._id })}
                className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', filters.folder === f._id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50')}>
                <span className="flex items-center gap-2"><Folder className="size-4" />{f.name}</span>
                <span className="text-xs text-slate-400">{f.documents}</span>
              </button>
            ))}
            {manage && (
              <div className="mt-2 flex gap-1 border-t border-slate-100 pt-2">
                <Input className="flex-1" placeholder="New folder" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
                <Button size="sm" variant="ghost" icon={FolderPlus} aria-label="Create folder" disabled={newFolder.trim().length < 2} onClick={() => createFolder.mutate({ name: newFolder })} />
              </div>
            )}
          </Card>
        </aside>
        <div className="space-y-4 lg:col-span-3">
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                <input className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Search title, description or tag" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
              </div>
              <Checkbox label={<span className="inline-flex items-center gap-1"><AlertTriangle className="size-3.5 text-amber-500" />Expiring</span>} checked={filters.expiring} onChange={(e) => set({ expiring: e.target.checked })} />
              {manage && <Checkbox label="Archived" checked={filters.archived} onChange={(e) => set({ archived: e.target.checked })} />}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 15).map((t) => (
                  <button key={t.tag} type="button" onClick={() => set({ tag: filters.tag === t.tag ? '' : t.tag })}
                    className={cn('rounded-full px-2.5 py-0.5 text-xs', filters.tag === t.tag ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>#{t.tag}</button>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <Table loading={loadingDocs} rows={data?.data} empty="No documents" onRowClick={(d) => navigate(`/documents/${d._id}`)}
              columns={[
                { key: 'title', header: 'Document', className: 'max-w-xs', render: (d) => <div className="flex items-center gap-2"><FileText className="size-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="truncate font-medium text-slate-900">{d.title}</p><p className="truncate text-xs text-slate-500">{d.folder?.name}{d.tags.length ? ` · ${d.tags.map((t) => `#${t}`).join(' ')}` : ''}</p></div></div> },
                { key: 'currentVersion', header: 'Ver.', render: (d) => `v${d.currentVersion}` },
                { key: 'visibility', header: 'Visible to', render: (d) => <span className="text-xs">{visibilityText(d.visibility)}</span> },
                { key: 'expiry', header: '', render: (d) => <ExpiryBadge d={d} /> },
                { key: 'updatedAt', header: 'Updated', render: (d) => date(d.updatedAt) },
              ]} />
            <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </Card>
        </div>
      </div>
      {manage && <UploadModal open={uploading} onClose={() => setUploading(false)} folders={folders} folder={filters.folder} />}
      <DocumentModal id={id} manage={manage} onClose={() => navigate('/documents')} />
    </div>
  );
}
