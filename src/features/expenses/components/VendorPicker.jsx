import { Select } from '../../../components/ui';
import { useVendors } from '../api';
import { useT } from '../../../context/LanguageContext';

// Active vendors as a dropdown (societies work with tens of vendors, not thousands).
export function VendorPicker({ value, onChange, label = 'Vendor', placeholder = 'Select vendor', required, error, className, includeInactive = false }) {
  const { data } = useVendors({ limit: 100, ...(includeInactive ? {} : { active: true }) });
  const vendors = data?.data || [];
  const { t } = useT();
  return (
    <Select className={className} label={label} required={required} error={error} placeholder={placeholder} value={value || ''}
      onChange={(e) => onChange(e.target.value, vendors.find((v) => v._id === e.target.value))}
      options={vendors.map((v) => ({ value: v._id, label: v.active ? v.name : t('{name} (inactive)', { name: v.name }) }))} />
  );
}
