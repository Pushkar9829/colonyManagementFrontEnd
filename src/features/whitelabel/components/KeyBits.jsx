import { Badge } from '../../../components/ui';
import { useT } from '../../../context/LanguageContext';

const TONES = { unused: 'sky', active: 'green', revoked: 'slate' };
const TERMS = { monthly: '1 month', quarterly: '3 months', yearly: '1 year' };

export const KeyStatusBadge = ({ status }) => {
  const { t } = useT();
  return <Badge tone={TONES[status] || 'slate'}>{t(status === 'unused' ? 'Unused' : status === 'active' ? 'Used' : 'Revoked')}</Badge>;
};

// What a key prepays: "1 year", "36 months one-time", "lifetime". Pass `t` to translate.
export const termText = ({ cycle, validityMonths }, t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s)) =>
  cycle === 'one_time' ? (validityMonths ? t('{n} months one-time', { n: validityMonths }) : t('lifetime')) : TERMS[cycle] ? t(TERMS[cycle]) : cycle;
