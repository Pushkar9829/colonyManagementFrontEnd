import { Ban } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui';
import { useSocietyAdSettings } from '../api';
import { AdsManager } from '../components/AdsManager';
import { useT } from '../../../context/LanguageContext';

// Society admin / facility manager: banners and pop-ups for this society's members only.
export default function SocietyAdsPage() {
  const { t } = useT();
  const { data: settings } = useSocietyAdSettings();
  const blocked = settings && !settings.allowSocietyAds;
  return (
    <div>
      <PageHeader title="Ads" description="Top banners and pop-ups for your members — events, offers from local partners, reminders." />
      {blocked && (
        <Card className="mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Ban className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p>{t('Society ads are switched off for this society by the ColonyHub platform team. Your ads are not shown and new ones can’t be created. Contact support to turn them back on.')}</p>
        </Card>
      )}
      <AdsManager scope="society" canCreate={!blocked} />
    </div>
  );
}
