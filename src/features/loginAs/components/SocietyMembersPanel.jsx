import { useState } from 'react';
import { Badge, Input, Select, Spinner } from '../../../components/ui';
import { ROLE_LABELS } from '../../../lib/roles';
import { canAny } from '../../../lib/platformPermissions';
import { useAuth } from '../../../context/AuthContext';
import { usePlatformSocietyMembers, useSetSocietyLoginAsPolicy, useSocietyLoginAsPolicy } from '../api';
import { LoginAsButton } from './LoginAsModal';
import { LEVEL_LABELS } from '../lib';
import { useT } from '../../../context/LanguageContext';

const OVERRIDE_OPTIONS = [
  { value: '', label: 'Same as platform rule' },
  { value: 'on', label: 'Allowed here' },
  { value: 'off', label: 'Not allowed here' },
];
const toValue = (v) => (v === true ? 'on' : v === false ? 'off' : '');
const fromValue = (v) => (v === 'on' ? true : v === 'off' ? false : null);

// Platform console > society: per-society "Log in as" rules.
function SocietyPolicy({ societyId }) {
  const { t } = useT();
  const { data } = useSocietyLoginAsPolicy(societyId);
  const save = useSetSocietyLoginAsPolicy();
  if (!data) return null;
  return (
    <div>
      <p className="mb-2 font-medium text-slate-700">{t('“Log in as” in this society')}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {['platform', 'admin', 'subadmin'].map((k) => (
          <Select key={k} label={LEVEL_LABELS[k]} options={OVERRIDE_OPTIONS} value={toValue(data.override[k])}
            hint={data.effective[k]
              ? (data.global[k] ? t('Now: allowed (platform rule: on)') : t('Now: allowed (platform rule: off)'))
              : (data.global[k] ? t('Now: off (platform rule: on)') : t('Now: off (platform rule: off)'))}
            onChange={(e) => save.mutate({ id: societyId, [k]: fromValue(e.target.value) })} />
        ))}
      </div>
    </div>
  );
}

// Platform console > society: members, each with "Log in as".
export function SocietyMembersPanel({ societyId }) {
  const { t } = useT();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const canView = canAny(user, 'support.access', 'impersonation.manage');
  const canPolicy = canAny(user, 'team.manage', 'impersonation.manage');
  const { data, isLoading } = usePlatformSocietyMembers(societyId, { search: search || undefined, limit: 50 }, { enabled: Boolean(societyId) && canView });
  if (!canView && !canPolicy) return null;
  return (
    <div className="space-y-4">
      {canPolicy && <SocietyPolicy societyId={societyId} />}
      {canView && (
        <div>
          <p className="mb-2 font-medium text-slate-700">{t('Members')}</p>
          <Input aria-label="Search members" placeholder="Search name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {!data?.data?.length && <li className="px-3 py-2 text-slate-500">{t('No members')}</li>}
              {data?.data?.map((m) => (
                <li key={m._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">{[m.unit?.label || m.designation, m.email || m.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{ROLE_LABELS[m.role] ? t(ROLE_LABELS[m.role]) : m.role}</Badge>
                    {m.canLoginAs && <LoginAsButton target={{ membershipId: m._id, user: m.user, name: m.name, role: m.role, unitLabel: m.unit?.label }} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
