import { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Card, CardHeader, Checkbox, Pagination, Spinner, Table } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { canAny } from '../../../lib/platformPermissions';
import { dateTime } from '../../../lib/format';
import { usePlatformLoginAsPolicy, usePlatformLoginAsSessions, useSetPlatformLoginAsPolicy } from '../api';
import { durationText, LEVEL_LABELS } from '../lib';

const HINTS = {
  platform: 'Platform members with support access log in as anyone in a society.',
  admin: 'Society admins log in as accountants, facility managers, guards, residents and staff.',
  subadmin: 'Accountants and facility managers log in as guards, residents and staff.',
};

// Platform console: platform-wide "Log in as" rules (societies can be overridden from the society's page) and
// every session across societies.
export default function PlatformLoginAsPage() {
  const { user } = useAuth();
  const canPolicy = canAny(user, 'team.manage', 'impersonation.manage');
  const policy = usePlatformLoginAsPolicy({ enabled: canPolicy });
  const save = useSetPlatformLoginAsPolicy();
  const [page, setPage] = useState(1);
  const sessions = usePlatformLoginAsSessions({ page });
  return (
    <div className="space-y-4">
      <PageHeader title="Log in as" description="Who may open the account of someone below them. Every session needs the person's own password, a reason, and is logged." />
      {canPolicy && (
        <Card>
          <CardHeader title="Platform rule" subtitle={policy.data ? `${policy.data.overrides} societ${policy.data.overrides === 1 ? 'y has' : 'ies have'} their own rule (Societies › open a society).` : undefined} />
          {!policy.data ? <div className="flex justify-center py-6"><Spinner /></div> : (
            <div className="space-y-3 px-5 pb-5">
              {['platform', 'admin', 'subadmin'].map((k) => (
                <div key={k}>
                  <Checkbox label={LEVEL_LABELS[k]} checked={policy.data.policy[k]} disabled={save.isPending} onChange={(e) => save.mutate({ [k]: e.target.checked })} />
                  <p className="ml-6 text-xs text-slate-500">{HINTS[k]}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <Card>
        <CardHeader title="All sessions" />
        <Table loading={sessions.isLoading} rows={sessions.data?.data} empty="No sessions yet"
          columns={[
            { key: 'society', header: 'Society', render: (s) => s.society?.name || '—' },
            { key: 'by', header: 'By', render: (s) => <div><p className="font-medium text-slate-900">{s.byName}</p><p className="text-xs text-slate-500">{LEVEL_LABELS[s.byLevel]}</p></div> },
            { key: 'target', header: 'Viewed', render: (s) => `${s.targetName}${s.targetUnitLabel ? ` (${s.targetUnitLabel})` : ''}` },
            { key: 'reason', header: 'Reason', mobile: false, render: (s) => s.reason },
            { key: 'when', header: 'When', render: (s) => dateTime(s.startedAt) },
            { key: 'dur', header: 'Length', mobile: false, render: (s) => (s.status === 'active' ? <Badge tone="amber">Open</Badge> : durationText(s.durationSeconds)) },
          ]} />
        <Pagination meta={sessions.data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}
