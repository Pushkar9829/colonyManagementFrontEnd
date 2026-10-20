import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Siren } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Modal, Pagination, Spinner, Tabs, Textarea } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { dateTime, label, timeAgo } from '../../../lib/format';
import { hasRole } from '../../../lib/roles';
import { useAcknowledgeSos, useResolveSos, useSosAlerts } from '../api';
import { useT } from '../../../context/LanguageContext';

// Plain words for the alert states (the API says active / acknowledged / resolved).
const STATUS = { active: { label: 'Open', tone: 'red' }, acknowledged: { label: 'Guard responding', tone: 'blue' }, resolved: { label: 'Closed', tone: 'slate' } };

function CloseModal({ alert, responder, onClose, onConfirm, busy }) {
  const [note, setNote] = useState('');
  const { t } = useT();
  return (
    <Modal
      open={Boolean(alert)}
      onClose={onClose}
      size="sm"
      title={responder ? 'Close this alert?' : 'Cancel your alert?'}
      description={alert ? `${t('{type} emergency', { type: t(label(alert.type)) })}${alert.unit ? ` · ${alert.unit.label}` : ''}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button loading={busy} onClick={() => onConfirm(note.trim())}>{responder ? 'Close alert' : 'Cancel alert'}</Button>
        </>
      }
    >
      <Textarea label={responder ? 'What happened? (optional)' : 'Why are you cancelling? (optional)'} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

export default function SosPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSosAlerts({ status: status || undefined, page });
  const ack = useAcknowledgeSos();
  const resolve = useResolveSos();
  const [closing, setClosing] = useState(null);
  const responder = hasRole(user, 'guard', 'facility_manager');
  // Guards have no SOS button in the header, so their empty state explains what this page does instead.
  const emptyText = user.role === 'guard'
    ? 'No alerts right now. When a resident presses SOS, this page rings and the alert appears here.'
    : responder
      ? 'When a resident presses SOS, the alert appears here.'
      : 'Use the red SOS button at the top in an emergency.';

  return (
    <div>
      <PageHeader
        title="SOS alerts"
        description={responder ? 'Emergency alerts from residents. This page refreshes automatically.' : 'Alerts you have raised.'}
        actions={<Link to="/emergency"><Button variant="secondary" icon={PhoneCall}>Emergency numbers</Button></Link>}
      />
      <Tabs
        className="mb-4 w-full sm:w-fit"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={[
          { value: '', label: 'All' },
          { value: 'active', label: 'Open' },
          { value: 'acknowledged', label: 'Guard responding' },
          { value: 'resolved', label: 'Closed' },
        ]}
      />
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !data?.data.length ? (
          <EmptyState icon={Siren} title={status ? 'No alerts here' : 'No alerts'} description={emptyText} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((a) => (
              <li key={a._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${a.status === 'active' ? 'bg-red-50/60' : ''}`}>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Siren className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{t('{type} emergency', { type: t(label(a.type)) })}</p>
                    <Badge tone={STATUS[a.status]?.tone}>{t(STATUS[a.status]?.label || label(a.status))}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {a.raisedBy?.name}
                    {a.unit ? ` · ${a.unit.label}` : ''}
                    {a.raisedBy?.phone ? ` · ${a.raisedBy.phone}` : ''}
                    {a.location ? ` · ${t('at {place}', { place: a.location })}` : ''}
                  </p>
                  {a.message && <p className="mt-1 text-sm text-slate-700">“{a.message}”</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {dateTime(a.createdAt)} ({timeAgo(a.createdAt)})
                    {a.acknowledgedBy ? ` · ${t('{name} responding', { name: a.acknowledgedBy.name })}` : ''}
                    {a.resolvedBy ? ` · ${t('closed by {name}', { name: a.resolvedBy.name })}` : ''}
                    {a.resolutionNote ? ` — ${a.resolutionNote}` : ''}
                  </p>
                </div>
                {a.status !== 'resolved' && (
                  <div className="flex flex-wrap gap-2">
                    {responder && (
                      <Link to="/emergency-info" className="inline-flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50">
                        {t('Medical info')}
                      </Link>
                    )}
                    {responder && a.status === 'active' && (
                      <Button size="sm" loading={ack.isPending && ack.variables === a._id} onClick={() => ack.mutate(a._id)}>
                        I’m responding
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setClosing(a)}>
                      {responder ? 'Close alert' : 'Cancel alert'}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      <CloseModal
        key={closing?._id}
        alert={closing}
        responder={responder}
        busy={resolve.isPending}
        onClose={() => setClosing(null)}
        onConfirm={(note) => resolve.mutate({ id: closing._id, resolutionNote: note || undefined }, { onSuccess: () => setClosing(null) })}
      />
    </div>
  );
}
