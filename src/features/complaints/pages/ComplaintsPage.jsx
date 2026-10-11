import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Gauge, Lightbulb, Plus, Settings2, Star, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, FileUpload, Input, Modal, Pagination, Select, StatCard, StatusBadge, Table, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useForm } from '../../../hooks/useForm';
import { dateTime, label } from '../../../lib/format';
import { isManager, ROLES } from '../../../lib/roles';
import { useCategories, useComplaints, useComplaintStats, useCreateComplaint } from '../api';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants';
import { suggestCategory } from '../suggest';

const useCategoryOptions = () => {
  const { data } = useCategories();
  return { categories: data || [], options: data ? data.map((c) => ({ value: c.key, label: c.name })) : CATEGORIES };
};

function NewComplaintModal({ open, onClose }) {
  const navigate = useNavigate();
  const { values, bind, set, applyServerErrors, reset } = useForm({ category: 'plumbing', priority: 'medium', area: 'unit', title: '', description: '' });
  const [files, setFiles] = useState([]);
  const { categories, options } = useCategoryOptions();
  const suggestion = suggestCategory(`${values.title} ${values.description}`, categories);
  const showSuggestion = suggestion && suggestion.key !== values.category;
  const create = useCreateComplaint({ onSuccess: (c) => { reset(); setFiles([]); onClose(); navigate(`/complaints/${c._id}`); } });
  return (
    <Modal open={open} onClose={onClose} title="Raise a complaint"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate({ ...values, description: values.description || undefined, attachments: files.length ? files.map((f) => f._id) : undefined }, { onError: applyServerErrors })}>Submit</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" options={options} {...bind('category')} />
        <Select label="Priority" options={PRIORITIES} {...bind('priority')} />
        <Select className="sm:col-span-2" label="Where" options={[{ value: 'unit', label: 'Inside my home' }, { value: 'common', label: 'Common area' }]} {...bind('area')} />
        <Input className="sm:col-span-2" label="Title" required placeholder="e.g. Kitchen tap leaking" {...bind('title')} />
        {showSuggestion && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
            <Lightbulb className="size-4 shrink-0" />
            <span className="flex-1">Suggested category: <b>{suggestion.name}</b> <span className="text-xs text-amber-700">(based on “{suggestion.matched.join('”, “')}” in your text — you can keep your choice)</span></span>
            <Button size="sm" variant="secondary" onClick={() => set('category', suggestion.key)}>Use it</Button>
          </div>
        )}
        <Textarea className="sm:col-span-2" label="Details" rows={4} {...bind('description')} />
        <FileUpload className="sm:col-span-2" folder="complaints" files={files} onChange={setFiles} label="Add photos" />
      </div>
    </Modal>
  );
}

function Stats() {
  const { data } = useComplaintStats(true);
  if (!data) return null;
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Wrench} label="Active" value={data.active} />
      <StatCard icon={AlertTriangle} tone="red" label="SLA breached" value={data.overdue} />
      <StatCard icon={Clock} tone="sky" label="Avg resolution" value={data.avgResolutionHours ? `${data.avgResolutionHours.toFixed(1)} h` : '—'} />
      <StatCard icon={Star} tone="amber" label="Avg rating" value={data.avgRating ? `${data.avgRating.toFixed(1)} / 5` : '—'} />
    </div>
  );
}

export default function ComplaintsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const manager = isManager(user);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', overdue: '', page: 1 });
  const { data, isLoading } = useComplaints(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')));
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const { categories, options: categoryOptions } = useCategoryOptions();
  const categoryName = (key) => categories.find((c) => c.key === key)?.name || label(key);

  return (
    <div>
      <PageHeader
        title="Helpdesk"
        description={user.role === ROLES.RESIDENT ? 'Raise and track maintenance requests.' : user.role === ROLES.STAFF ? 'Tickets assigned to you.' : 'All complaints with SLA tracking.'}
        actions={(
          <>
            {manager && <Link to="/complaints/performance"><Button variant="secondary" icon={Gauge}>Staff performance</Button></Link>}
            {manager && <Link to="/complaints/settings"><Button variant="secondary" icon={Settings2}>Settings</Button></Link>}
            {[ROLES.RESIDENT, ROLES.FACILITY_MANAGER, ROLES.ADMIN].includes(user.role) && <Button icon={Plus} onClick={() => setCreating(true)}>New complaint</Button>}
          </>
        )}
      />
      {manager && <Stats />}
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4">
          <Select placeholder="All statuses" options={STATUSES} value={filters.status} onChange={set('status')} />
          <Select placeholder="All categories" options={categoryOptions} value={filters.category} onChange={set('category')} />
          <Select placeholder="All priorities" options={PRIORITIES} value={filters.priority} onChange={set('priority')} />
          <Select placeholder="Any SLA" options={[{ value: 'true', label: 'SLA breached' }]} value={filters.overdue} onChange={set('overdue')} />
        </div>
        <Table
          loading={isLoading}
          rows={data?.data}
          empty="No complaints"
          onRowClick={(c) => navigate(`/complaints/${c._id}`)}
          columns={[
            { key: 'ticketNumber', header: 'Ticket', render: (c) => <span className="font-mono text-xs font-semibold text-slate-700">{c.ticketNumber}</span> },
            { key: 'title', header: 'Issue', className: 'max-w-xs', render: (c) => <div className="truncate"><p className="truncate font-medium text-slate-900">{c.title}</p><p className="text-xs text-slate-500">{categoryName(c.category)}{c.unit ? ` · ${c.unit.label}` : ''}</p></div> },
            { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} /> },
            { key: 'status', header: 'Status', render: (c) => <div className="flex items-center gap-1.5"><StatusBadge status={c.status} />{c.isOverdue && <Badge tone="red">SLA</Badge>}{c.escalationLevel > 0 && <Badge tone="amber">L{c.escalationLevel}</Badge>}</div> },
            { key: 'assignedTo', header: 'Assigned', render: (c) => c.assignedTo?.name || <span className="text-slate-400">—</span> },
            { key: 'createdAt', header: 'Raised', render: (c) => dateTime(c.createdAt) },
            { key: 'rating', header: '', render: (c) => (c.rating ? <span className="flex items-center gap-0.5 text-amber-500"><Star className="size-3.5 fill-current" />{c.rating}</span> : c.status === 'resolved' ? <CheckCircle2 className="size-4 text-emerald-500" /> : null) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
      <NewComplaintModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
