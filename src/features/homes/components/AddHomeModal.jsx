import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../../api/client';
import { Button, Input, Modal, Select } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';

// Lets a signed-in person request another flat — in this society or a different one.
export function AddHomeModal({ onClose }) {
  const { reloadUser } = useAuth();
  const [code, setCode] = useState('');
  const [society, setSociety] = useState(null);
  const [block, setBlock] = useState('');
  const [unit, setUnit] = useState('');
  const [residentType, setResidentType] = useState('owner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const lookup = async () => {
    setError('');
    setLoading(true);
    try {
      setSociety(await api.get(`/auth/societies/${code.trim().toUpperCase()}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/homes', { societyCode: code.trim().toUpperCase(), unit, residentType });
      await reloadUser();
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Modal open onClose={onClose} title="Request sent" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
          <p className="mt-3 text-sm text-slate-600">The {society.society.name} admin will review it. Once approved it appears in your home switcher.</p>
        </div>
      </Modal>
    );
  }

  const units = (society?.units || []).filter((u) => !block || String(u.block) === block);
  return (
    <Modal open onClose={onClose} title="Add another home" description="Own or rent more than one flat? Request access with the society's joining code."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>{society ? <Button disabled={!unit} loading={loading} onClick={submit}>Send request</Button> : <Button disabled={code.trim().length !== 6} loading={loading} onClick={lookup}>Continue</Button>}</>}>
      <div className="space-y-4">
        {!society ? (
          <Input label="Society code" maxLength={6} placeholder="e.g. DEMO01" value={code} onChange={(e) => setCode(e.target.value)} />
        ) : (
          <>
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{society.society.name}{society.society.city ? `, ${society.society.city}` : ''}</p>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Block" placeholder="All blocks" value={block} onChange={(e) => setBlock(e.target.value)} options={society.blocks.map((b) => ({ value: b._id, label: b.name }))} />
              <Select label="Unit" placeholder="Select unit" value={unit} onChange={(e) => setUnit(e.target.value)} options={units.map((u) => ({ value: u._id, label: u.label }))} />
            </div>
            <Select label="You are" value={residentType} onChange={(e) => setResidentType(e.target.value)} options={[{ value: 'owner', label: 'Owner' }, { value: 'tenant', label: 'Tenant' }, { value: 'family', label: 'Family member' }]} />
          </>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
