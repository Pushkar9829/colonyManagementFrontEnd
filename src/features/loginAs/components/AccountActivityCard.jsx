import { Eye } from 'lucide-react';
import { Card, CardHeader, Spinner } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../context/LanguageContext';
import { dateTime } from '../../../lib/format';
import { useMyLoginAsActivity } from '../api';
import { durationText, LEVEL_LABELS } from '../lib';

// Profile: who opened this account with "Log in as", when, why and for how long.
export function AccountActivityCard() {
  const { user } = useAuth();
  const { t } = useT();
  const { data = [], isLoading } = useMyLoginAsActivity();
  if (user?.actingAs) return null;
  return (
    <Card>
      <CardHeader title="Who viewed your account" subtitle="People above you can open your account for a short, recorded time to help you." />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div> : (
        <ul className="divide-y divide-slate-100">
          {!data.length && <li className="px-5 py-3 text-sm text-slate-500">{t('Nobody has viewed your account.')}</li>}
          {data.map((s) => (
            <li key={s._id} className="flex gap-3 px-5 py-3 text-sm">
              <Eye className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{s.byName} <span className="font-normal text-slate-500">({t(LEVEL_LABELS[s.byLevel])}{s.society?.name ? ` · ${s.society.name}` : ''})</span></p>
                <p className="text-slate-600">“{s.reason}”</p>
                <p className="text-xs text-slate-500">{dateTime(s.startedAt)} · {s.status === 'active' ? t('still open') : durationText(s.durationSeconds, t)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
