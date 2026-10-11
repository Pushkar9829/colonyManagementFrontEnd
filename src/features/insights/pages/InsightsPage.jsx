import { useEffect, useState } from 'react';
import { Activity, Copy, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageLoader, Select, StatCard, Table, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../lib/cn';
import { currentPeriod, date, label, money, periodLabel } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useDefaulterRisk, useHealth, useNoticeTemplates, useRenderTemplate, useSuggestCategory, useUnitRisk } from '../api';

const BAND_TONES = { high: 'red', medium: 'amber', low: 'green' };

function Heuristic({ children }) {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// ---------- health ----------
function HealthTab() {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = useHealth(period);
  if (isLoading || !data) return <PageLoader />;
  const m = data.metrics;
  const delta = data.score - data.previousScore;
  return (
    <div className="space-y-6">
      <Heuristic>{data.note}</Heuristic>
      <div className="flex flex-wrap items-end gap-4">
        <Input className="w-44" label="Month" type="month" value={period} max={currentPeriod()} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Activity} tone={data.grade === 'A' ? 'green' : data.grade === 'B' ? 'sky' : data.grade === 'C' ? 'amber' : 'red'} label={`Health · ${periodLabel(period)}`} value={`${data.score} / 100 (${data.grade})`} sub={`${delta >= 0 ? '+' : ''}${delta} vs ${periodLabel(data.previousPeriod)}`} />
        <StatCard label="Collection" value={m.billing.collectionRate !== null ? `${m.billing.collectionRate}%` : '—'} sub={`${money(m.billing.collectedAgainstBills)} of ${money(m.billing.billed)}`} tone="green" />
        <StatCard label="Complaints" value={`${m.complaints.opened} raised`} sub={`${m.complaints.resolved} resolved · ${m.complaints.slaMetRate ?? '—'}% within SLA`} tone="amber" />
        <StatCard label="Visitors" value={m.visitors} sub={`${m.sos.raised} SOS · ${m.bookings} bookings`} tone="sky" />
      </div>
      <Card>
        <CardHeader title="Highlights" />
        <ul className="space-y-2 p-5 text-sm">
          {!data.highlights.length && <li className="text-slate-500">Not much happened this month.</li>}
          {data.highlights.map((h) => (
            <li key={h.text} className="flex items-start gap-2">
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', h.tone === 'good' ? 'bg-emerald-500' : h.tone === 'bad' ? 'bg-red-500' : 'bg-slate-400')} />
              {h.text}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="How the score is made" />
        <div className="grid gap-3 p-5 text-sm sm:grid-cols-3">
          <p><span className="font-medium">Collections (40%)</span><br /><span className="text-slate-500">{data.parts.collection}% of the month’s bills paid</span></p>
          <p><span className="font-medium">SLA (30%)</span><br /><span className="text-slate-500">{data.parts.sla}% of resolved complaints on time</span></p>
          <p><span className="font-medium">Backlog (30%)</span><br /><span className="text-slate-500">{data.parts.backlog} / 100 — {m.complaints.openNow} open for {m.units} units</span></p>
        </div>
      </Card>
    </div>
  );
}

// ---------- defaulter risk ----------
function UnitRiskModal({ unitId, onClose }) {
  const { data, isLoading } = useUnitRisk(unitId);
  return (
    <Modal open onClose={onClose} size="lg" title={data ? `Risk · ${data.unit.label}` : 'Risk'} description={data?.residents.map((r) => `${r.name} (${r.residentType})`).join(', ')}>
      {isLoading || !data ? <PageLoader /> : (
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2"><Badge tone={BAND_TONES[data.band]}>{label(data.band)} risk</Badge><span className="font-semibold">{data.score} / 100</span></div>
          <ul className="space-y-2">
            {data.factors.map((f) => (
              <li key={f.key} className="rounded-lg border border-slate-200 p-3">
                <div className="flex justify-between"><span className="font-medium">{f.label}</span><span>{f.points} / {f.max} pts</span></div>
                <p className="text-xs text-slate-500">{f.key === 'overdueAmount' ? money(f.value) : f.value} — {f.explanation}</p>
              </li>
            ))}
          </ul>
          <Table rowKey="billNumber" rows={data.bills} empty="No bills in the last 12 months"
            columns={[
              { key: 'period', header: 'Month', render: (b) => periodLabel(b.period) },
              { key: 'total', header: 'Bill', render: (b) => money(b.total) },
              { key: 'dueDate', header: 'Due', render: (b) => date(b.dueDate) },
              { key: 'paidAt', header: 'Paid', render: (b) => (b.balance ? <span className="text-red-600">{money(b.balance)} due</span> : date(b.paidAt)) },
              { key: 'daysLate', header: 'Days late', render: (b) => b.daysLate || '—' },
            ]} />
        </div>
      )}
    </Modal>
  );
}

function RiskTab() {
  const [band, setBand] = useState('');
  const [unitId, setUnitId] = useState(null);
  const { data, isLoading } = useDefaulterRisk({ band: band || undefined, limit: 100 });
  return (
    <div className="space-y-4">
      {data && <Heuristic>{data.note} Based on the last {data.windowMonths} months.</Heuristic>}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {['high', 'medium', 'low'].map((b) => <StatCard key={b} icon={ShieldAlert} tone={b === 'high' ? 'red' : b === 'medium' ? 'amber' : 'green'} label={`${label(b)} risk`} value={data.counts[b]} sub="units" />)}
        </div>
      )}
      <Card>
        <CardHeader title="Units by risk" action={<Select className="w-36" value={band} onChange={(e) => setBand(e.target.value)} placeholder="All bands" options={['high', 'medium', 'low'].map((b) => ({ value: b, label: label(b) }))} />} />
        <Table loading={isLoading} rows={data?.items?.map((r) => ({ ...r, _id: r.unit._id }))} empty="No billing history yet" onRowClick={(r) => setUnitId(r.unit._id)}
          columns={[
            { key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-900">{r.unit.label}</span> },
            { key: 'score', header: 'Score', render: (r) => <span className="inline-flex items-center gap-2">{r.score}<Badge tone={BAND_TONES[r.band]}>{label(r.band)}</Badge></span> },
            { key: 'lateRatio', header: 'Late bills', render: (r) => `${Math.round(r.lateRatio * 100)}%` },
            { key: 'avgDaysLate', header: 'Avg days late', render: (r) => r.avgDaysLate },
            { key: 'overdueAmount', header: 'Overdue now', render: (r) => (r.overdueAmount ? money(r.overdueAmount) : '—') },
            { key: 'top', header: 'Main factor', render: (r) => [...r.factors].sort((a, b) => b.points - a.points)[0]?.points ? [...r.factors].sort((a, b) => b.points - a.points)[0].label : '—' },
          ]} />
      </Card>
      {unitId && <UnitRiskModal unitId={unitId} onClose={() => setUnitId(null)} />}
    </div>
  );
}

// ---------- notice drafts ----------
function NoticeTab() {
  const toast = useToast();
  const { data: templates, isLoading } = useNoticeTemplates();
  const [key, setKey] = useState('');
  const [values, setValues] = useState({});
  const render = useRenderTemplate();
  const template = templates?.find((t) => t.key === key) || templates?.[0];

  useEffect(() => {
    if (template) setValues(Object.fromEntries(template.fields.map((f) => [f.key, f.default || ''])));
  }, [template?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !template) return <PageLoader />;
  const draft = render.data;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${draft.title}\n\n${draft.body}`);
      toast.success('Copied — paste it into a new notice');
    } catch {
      toast.error('Copy failed; select the text instead');
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Fill in the details" subtitle="Templates, not AI — edit the result before posting it under Notices" />
        <div className="space-y-3 p-5">
          <Select label="Template" value={template.key} onChange={(e) => { setKey(e.target.value); render.reset(); }} options={templates.map((t) => ({ value: t.key, label: t.label }))} />
          {template.fields.map((f) =>
            f.type === 'textarea' ? (
              <Textarea key={f.key} label={f.label} rows={4} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ) : (
              <Input key={f.key} label={f.label} required={f.required} type={f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ),
          )}
          <Button loading={render.isPending} onClick={() => render.mutate({ key: template.key, values: Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')) })}>Draft notice</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Draft" action={draft && <Button size="sm" variant="secondary" icon={Copy} onClick={copy}>Copy</Button>} />
        <div className="p-5">
          {!draft ? <EmptyState icon={Lightbulb} title="Your draft appears here" /> : (
            <div className="space-y-3 text-sm">
              {draft.missing.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">Still to fill: {draft.missing.map(label).join(', ')}</p>}
              <p className="font-semibold text-slate-900">{draft.title}</p>
              <p className="whitespace-pre-wrap text-slate-700">{draft.body}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------- complaint category helper ----------
function CategoryTab() {
  const [text, setText] = useState({ title: '', description: '' });
  const suggest = useSuggestCategory();
  const r = suggest.data;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Try the category helper" subtitle="The same suggestion the complaint form can show residents" />
        <div className="space-y-3 p-5">
          <Input label="Complaint title" placeholder="Water leaking from bathroom tap" value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} />
          <Textarea label="Details" rows={3} value={text.description} onChange={(e) => setText({ ...text, description: e.target.value })} />
          <Button disabled={text.title.trim().length < 2} loading={suggest.isPending} onClick={() => suggest.mutate({ title: text.title, description: text.description || undefined })}>Suggest category</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Suggestions" />
        <div className="space-y-3 p-5 text-sm">
          {!r ? <EmptyState icon={Lightbulb} title="Type a complaint to see suggestions" /> : (
            <>
              <Heuristic>{r.note} Learned from {r.basedOn.pastComplaints} past complaints.</Heuristic>
              {r.suggestions.map((s) => (
                <div key={s.category}>
                  <div className="flex justify-between"><span className="font-medium">{label(s.category)}</span><span className="text-slate-500">{Math.round(s.confidence * 100)}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.round(s.confidence * 100)}%` }} /></div>
                  {s.matched.length > 0 && <p className="mt-1 text-xs text-slate-500">Matched: {s.matched.join(', ')}</p>}
                </div>
              ))}
              <p className="text-slate-600">Suggested priority: <Badge tone={r.suggestedPriority === 'urgent' ? 'red' : r.suggestedPriority === 'high' ? 'amber' : 'blue'}>{label(r.suggestedPriority)}</Badge></p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function InsightsPage() {
  const { user } = useAuth();
  const admin = user.role === ROLES.ADMIN;
  const tabs = [
    ...(admin ? [{ value: 'health', label: 'Society health' }] : []),
    ...(admin || user.role === ROLES.ACCOUNTANT ? [{ value: 'risk', label: 'Defaulter risk' }] : []),
    ...(admin || user.role === ROLES.FACILITY_MANAGER ? [{ value: 'notices', label: 'Notice drafts' }, { value: 'category', label: 'Complaint categories' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.value);
  return (
    <div>
      <PageHeader title="Insights" description="Rule-based helpers built on your society’s own data. They are heuristics — simple, explainable rules, not machine learning." />
      <Tabs className="mb-6 w-fit" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'health' && <HealthTab />}
      {tab === 'risk' && <RiskTab />}
      {tab === 'notices' && <NoticeTab />}
      {tab === 'category' && <CategoryTab />}
    </div>
  );
}
