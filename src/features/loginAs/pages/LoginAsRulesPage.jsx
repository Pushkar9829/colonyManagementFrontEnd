import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, CardHeader, Pagination, Spinner, Table } from '../../../components/ui';
import { dateTime } from '../../../lib/format';
import { ROLE_LABELS } from '../../../lib/roles';
import { useT } from '../../../context/LanguageContext';
import { useLoginAsRules, useSocietyLoginAsSessions } from '../api';
import { durationText, LEVEL_LABELS } from '../lib';

const STATUS_TONE = { active: 'amber', exit: 'slate', expired: 'slate', replaced: 'slate' };

// Society admins: what the platform allows here (read-only) and every "Log in as" session in the society.
export default function LoginAsRulesPage() {
  const { t } = useT();
  const { data: rules, isLoading } = useLoginAsRules();
  const [page, setPage] = useState(1);
  const sessions = useSocietyLoginAsSessions({ page });
  return (
    <div className="space-y-4">
      <PageHeader title="Log in as" description="See the app as a member sees it, to help them. The platform decides who may do this." />
      <Card>
        <CardHeader title="Who may log in as others here" subtitle="Set by the ColonyHub platform team. Ask them to change it." />
        {isLoading || !rules ? <div className="flex justify-center py-6"><Spinner /></div> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {['platform', 'admin', 'subadmin'].map((k) => (
              <li key={k} className="flex items-center justify-between gap-3 px-5 py-3">
                <span>{t(LEVEL_LABELS[k])}</span>
                {rules.policy[k] ? <Badge tone="green"><Check className="mr-1 inline size-3" />{t('Allowed')}</Badge> : <Badge><X className="mr-1 inline size-3" />{t('Off')}</Badge>}
              </li>
            ))}
            <li className="px-5 py-3 text-slate-600">
              {rules.allowed ? t('You can log in as: {roles}. Sessions last up to {hours} hours.', { roles: rules.canTarget.map((r) => t(ROLE_LABELS[r] || r)).join(', '), hours: rules.maxMinutes / 60 }) : t('You cannot log in as other members.')}
            </li>
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title="Sessions in this society" />
        <Table loading={sessions.isLoading} rows={sessions.data?.data} empty="Nobody has used “Log in as” here yet"
          columns={[
            { key: 'by', header: 'By', render: (s) => <div><p className="font-medium text-slate-900">{s.byName}</p><p className="text-xs text-slate-500">{t(LEVEL_LABELS[s.byLevel])}</p></div> },
            { key: 'target', header: 'Viewed', render: (s) => `${s.targetName}${s.targetUnitLabel ? ` (${s.targetUnitLabel})` : ''}` },
            { key: 'reason', header: 'Reason', render: (s) => s.reason },
            { key: 'when', header: 'When', render: (s) => dateTime(s.startedAt) },
            { key: 'dur', header: 'Length', mobile: false, render: (s) => durationText(s.durationSeconds, t) },
            { key: 'status', header: 'Status', render: (s) => <Badge tone={STATUS_TONE[s.status]}>{t(s.status === 'active' ? 'Open' : s.status === 'exit' ? 'Exited' : s.status === 'expired' ? 'Timed out' : 'Replaced')}</Badge> },
          ]} />
        <Pagination meta={sessions.data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}
