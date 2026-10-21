import { Checkbox, Select } from '../../components/ui';
import { useT } from '../../context/LanguageContext';
import { ROLE_LABELS } from '../../lib/roles';
import { useBlocks } from '../units/api';

const ROLE_OPTIONS = ['resident', 'guard', 'staff', 'facility_manager', 'accountant'];

// Shared audience picker for notices and polls: everyone / specific blocks / specific roles.
export function AudienceFields({ value, onChange }) {
  const { data: blocks = [] } = useBlocks();
  const { t } = useT();
  const toggle = (key, id) => {
    const list = value[key] || [];
    onChange({ ...value, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };
  return (
    <div className="space-y-3">
      <Select
        label="Audience"
        value={value.type}
        onChange={(e) => onChange({ type: e.target.value, blocks: [], roles: [] })}
        options={[
          { value: 'all', label: 'Everyone' },
          { value: 'blocks', label: 'Specific blocks' },
          { value: 'roles', label: 'Specific roles' },
        ]}
      />
      {value.type === 'blocks' && (
        <div className="flex flex-wrap gap-4">
          {blocks.map((b) => <Checkbox key={b._id} label={t('Block {name}', { name: b.name })} checked={value.blocks?.includes(b._id)} onChange={() => toggle('blocks', b._id)} />)}
        </div>
      )}
      {value.type === 'roles' && (
        <div className="flex flex-wrap gap-4">
          {ROLE_OPTIONS.map((r) => <Checkbox key={r} label={ROLE_LABELS[r]} checked={value.roles?.includes(r)} onChange={() => toggle('roles', r)} />)}
        </div>
      )}
    </div>
  );
}

export const cleanAudience = (a) => (a.type === 'all' ? { type: 'all' } : a.type === 'blocks' ? { type: 'blocks', blocks: a.blocks } : { type: 'roles', roles: a.roles });
