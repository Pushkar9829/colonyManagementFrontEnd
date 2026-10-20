import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, Spinner } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';
import { useMyPersonalDetails, useSaveMyPersonalDetails } from '../api';
import { PersonalDetailsFields, personalBody, personalForm } from './PersonalDetailsFields';

// My profile: the member's own birthday, anniversary, gender and occupation in the open society.
export function PersonalDetailsCard() {
  const { data, isLoading } = useMyPersonalDetails();
  const { t } = useT();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const save = useSaveMyPersonalDetails({ onSuccess: () => setErrors({}) });
  useEffect(() => {
    if (data) setForm(personalForm(data));
  }, [data]);
  return (
    <Card>
      <CardHeader title="Personal details" subtitle="Used for birthday and anniversary wishes. Neighbours see them only if you allow it in Directory → My privacy (never your birth year)." />
      {isLoading || !form ? <div className="flex justify-center py-6"><Spinner /></div> : (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <PersonalDetailsFields value={form} onChange={setForm} errors={errors} />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button loading={save.isPending} onClick={() => save.mutate(personalBody(form), { onError: (e) => setErrors(e.fieldErrors || {}) })}>Save details</Button>
            <Link to="/directory" className="text-sm font-medium text-brand-600 hover:underline">{t('Privacy settings')}</Link>
          </div>
        </div>
      )}
    </Card>
  );
}
