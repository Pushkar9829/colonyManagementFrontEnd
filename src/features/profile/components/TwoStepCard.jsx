import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Copy, Download, KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../../../api/client';
import { Badge, Button, Card, CardHeader, Input, Modal, Spinner } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { date } from '../../../lib/format';

const codeInput = (value, setValue, props = {}) => (
  <Input label="6-digit code from the app" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} {...props} />
);

function downloadCodes(codes) {
  const text = [
    'ColonyHub two-step verification backup codes',
    `Generated ${new Date().toLocaleString()}`,
    '',
    'Each code can be used once to log in if you lose your phone. Keep them somewhere safe.',
    '',
    ...codes,
    '',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'colonyhub-backup-codes.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Shown once, right after the codes are created — the server only keeps hashes.
export function BackupCodes({ codes }) {
  const toast = useToast();
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Save these backup codes now. Each one logs you in once if you lose your phone. You won't see them again.</p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-800">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCodes(codes)}>Download .txt</Button>
        <Button size="sm" variant="ghost" icon={Copy} onClick={() => { navigator.clipboard?.writeText(codes.join('\n')); toast.success('Codes copied'); }}>Copy</Button>
      </div>
    </div>
  );
}

// Scan QR -> confirm a code -> show backup codes. Used on the profile page and the forced setup screen.
export function TwoStepSetup({ onEnabled }) {
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const start = useApiMutation(() => api.post('/auth/mfa/setup'), { onSuccess: (d) => { setSetup(d); setCode(''); } });
  const enable = useApiMutation((c) => api.post('/auth/mfa/enable', { code: c }), { success: 'Two-step verification is on', onSuccess: (d) => setCodes(d.backupCodes) });

  useEffect(() => {
    if (!setup) return;
    QRCode.toDataURL(setup.otpauthUri, { width: 200, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [setup]);

  if (codes) {
    return (
      <div className="space-y-4">
        <BackupCodes codes={codes} />
        <Button onClick={() => onEnabled?.()}>I've saved my codes</Button>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Add a second step to your login: after your password or SMS code, enter a 6-digit code from an authenticator app
          (Google Authenticator, Microsoft Authenticator, Authy…).
        </p>
        <Button icon={ShieldCheck} loading={start.isPending} onClick={() => start.mutate()}>Set up two-step verification</Button>
      </div>
    );
  }

  const key = setup.secret.match(/.{1,4}/g).join(' ');
  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>Open your authenticator app and add an account.</li>
        <li>Scan this QR code, or type the key by hand.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex size-[200px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
          {qr ? <img src={qr} alt="QR code for your authenticator app" className="size-[200px]" /> : <Spinner />}
        </div>
        <div className="w-full min-w-0 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Key</p>
            <p className="break-all font-mono text-sm text-slate-800">{key}</p>
            <p className="mt-1 text-xs text-slate-500">Account: {setup.account} · time-based</p>
          </div>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); enable.mutate(code); }}>
            {codeInput(code, setCode, { autoFocus: true })}
            <div className="flex gap-2">
              <Button type="submit" loading={enable.isPending} disabled={code.length !== 6}>Turn on</Button>
              <Button variant="ghost" onClick={() => setSetup(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DisableModal({ open, onClose, onDone }) {
  const [form, setForm] = useState({ password: '', code: '' });
  const off = useApiMutation((b) => api.post('/auth/mfa/disable', b), { success: 'Two-step verification is off', onSuccess: () => { setForm({ password: '', code: '' }); onDone(); } });
  return (
    <Modal open={open} onClose={onClose} title="Turn off two-step verification" description="Your account will be protected by your password (or SMS code) only."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={off.isPending} disabled={!form.password || form.code.length < 6} onClick={() => off.mutate(form)}>Turn off</Button></>}>
      <div className="space-y-4">
        <Input label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Input label="Code from the app, or a backup code" autoComplete="one-time-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      </div>
    </Modal>
  );
}

function RegenerateModal({ open, onClose, onDone }) {
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const regen = useApiMutation((c) => api.post('/auth/mfa/backup-codes', { code: c }), { success: 'New backup codes created', onSuccess: (d) => { setCodes(d.backupCodes); onDone(); } });
  const close = () => { setCode(''); setCodes(null); onClose(); };
  return (
    <Modal open={open} onClose={close} title="New backup codes" description={codes ? undefined : 'Your old backup codes stop working.'}
      footer={codes ? <Button onClick={close}>Done</Button> : <><Button variant="ghost" onClick={close}>Cancel</Button><Button loading={regen.isPending} disabled={code.length !== 6} onClick={() => regen.mutate(code)}>Create codes</Button></>}>
      {codes ? <BackupCodes codes={codes} /> : codeInput(code, setCode, { autoFocus: true })}
    </Modal>
  );
}

export function TwoStepCard() {
  const qc = useQueryClient();
  const { reloadUser } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['mfa'], queryFn: () => api.get('/auth/mfa') });
  const [modal, setModal] = useState(null);
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['mfa'] });
    await reloadUser();
  };

  return (
    <Card>
      <CardHeader title="Two-step verification" subtitle="A code from your phone in addition to your password."
        action={data && (data.enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>)} />
      <div className="p-5">
        {isLoading || !data ? <div className="flex justify-center py-4"><Spinner /></div> : data.enabled ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              On since {date(data.enabledAt)}. {data.backupCodesLeft} backup code{data.backupCodesLeft === 1 ? '' : 's'} left.
              {data.backupCodesLeft <= 2 && ' Create new ones so you are not locked out.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={KeyRound} onClick={() => setModal('regen')}>New backup codes</Button>
              <Button variant="ghost" onClick={() => setModal('disable')}>Turn off</Button>
            </div>
          </div>
        ) : (
          <TwoStepSetup onEnabled={refresh} />
        )}
      </div>
      <DisableModal open={modal === 'disable'} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />
      <RegenerateModal open={modal === 'regen'} onClose={() => setModal(null)} onDone={() => qc.invalidateQueries({ queryKey: ['mfa'] })} />
    </Card>
  );
}
