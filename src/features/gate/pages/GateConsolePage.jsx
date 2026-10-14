import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Baby, Car, CheckCircle2, DoorClosed, KeyRound, LogOut, Package, Phone, QrCode, ShieldAlert, ShieldX, Undo2, UserPlus, WifiOff } from 'lucide-react';
import { useLiveInterval } from '../../../realtime/RealtimeProvider';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, CardHeader, Checkbox, EmptyState, FileUpload, Input, Modal, Spinner, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../lib/cn';
import { label, time, timeAgo } from '../../../lib/format';
import { ROLES } from '../../../lib/roles';
import { useForm } from '../../../hooks/useForm';
import { api } from '../../../api/client';
import { UnitPicker } from '../../units/components/UnitPicker';
import { VisitorRow } from '../../visitors/components/VisitorRow';
import { checkWatchlist, useCheckOut, useDenyVisitor, useGuardSendBack, useFrequent, useGuardCheckIn, useHouseholdContacts, useLogVisitor, useVerifyPass, useVisitors } from '../../visitors/api';
import { useDailyHelp, useGateScan } from '../../dailyHelp/api';
import { LogParcelForm } from '../../parcels/components/LogParcelForm';
import { ChildExitPanel } from '../../emergency/components/ChildExitPanel';
import { isNetworkError, useGateQueue } from '../offlineQueue';
import { OfflineBanner } from '../components/OfflineBanner';
import { QrScanner } from '../components/QrScanner';
import { ManualLog } from '../components/ManualLog';
import { BarrierControl } from '../components/BarrierControl';
import { useCurrentGate } from '../../gates/useCurrentGate';
import { GateBar } from '../../gates/components/GatePicker';
import { gateTakes } from '../../gates/gateRules';

const PURPOSES = ['guest', 'delivery', 'cab', 'service', 'other'];
const LESS_USED = [{ value: 'vehicles', label: 'Vehicles' }, { value: 'children', label: 'Children' }];
const TAB_VALUES = ['entry', 'scan', 'parcels', 'vehicles', 'children', 'pending', 'inside'];
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== false));
const visitorKind = (purpose) => (purpose === 'delivery' ? 'deliveries' : 'visitors');
const KIND_WORD = { visitors: 'visitors', deliveries: 'deliveries', vehicles: 'vehicles', staff: 'daily help or staff' };

// "This gate" / "All gates" for the waiting and inside lists (only when there is more than one gate).
function ScopeToggle({ scope }) {
  if (!scope.multi) return null;
  return (
    <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium" role="group" aria-label="Show">
      {[['gate', 'This gate'], ['all', 'All gates']].map(([v, l]) => (
        <button key={v} type="button" aria-pressed={scope.value === v} onClick={() => scope.set(v)} className={cn('rounded-md px-2.5 py-1.5', scope.value === v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
          {l}
        </button>
      ))}
    </div>
  );
}

// Shown when the gate refused an entry: the guard may still let them in once the resident confirmed by phone.
function OverrideButton({ onClick, loading }) {
  return (
    <Button size="sm" variant="secondary" className="mt-2" loading={loading} onClick={onClick}>
      Resident confirmed by phone — let in here
    </Button>
  );
}

function useWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

function Notice({ tone, icon: Icon, title, children, onClose }) {
  const tones = {
    red: 'border-red-300 bg-red-50 text-red-800',
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    blue: 'border-sky-300 bg-sky-50 text-sky-800',
  };
  return (
    <div className={cn('flex gap-3 rounded-xl border p-3 text-sm', tones[tone])} role="alert">
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5">{children}</div>}
      </div>
      {onClose && <button type="button" onClick={onClose} className="text-xs font-medium underline">Dismiss</button>}
    </div>
  );
}

// ---------- new entry ----------
function NewEntry({ queue, gate }) {
  const toast = useToast();
  const { values, set, bind, applyServerErrors, setValues } = useForm({ unit: '', name: '', phone: '', purpose: 'delivery', company: '', vehicleNumber: '', guardApproved: false });
  const [unitLabel, setUnitLabel] = useState('');
  const [photo, setPhoto] = useState([]);
  const [outcome, setOutcome] = useState(null); // { tone, title, body }
  const [pre, setPre] = useState(null); // watchlist pre-check
  const [pref, setPref] = useState(null);
  const { data: frequent } = useFrequent({ unit: values.unit, limit: 12 }, { enabled: Boolean(values.unit) && queue.online });

  const resetForm = () => {
    setValues((v) => ({ ...v, unit: '', name: '', phone: '', company: '', vehicleNumber: '', guardApproved: false }));
    setPhoto([]);
    setPre(null);
    setPref(null);
  };
  const log = useLogVisitor({
    onSuccess: (v) => {
      if (v.flag?.type === 'watch') setOutcome({ tone: 'amber', icon: ShieldAlert, title: `Watchlist: ${v.name}`, body: `${v.flag.reason}. Entry allowed — management alerted.` });
      else if (v.leaveAtGate) setOutcome({ tone: 'blue', icon: Package, title: 'Leave the parcel at the gate', body: `${v.unit.label} asked deliveries to be left at the gate. No approval needed.` });
      else setOutcome(null);
      resetForm();
    },
  });

  // Delivery preference hint as soon as unit + company are known.
  useEffect(() => {
    setPref(null);
    if (!queue.online || values.purpose !== 'delivery' || !values.unit) return undefined;
    const t = setTimeout(() => {
      api.get('/parcels/preferences/check', { unit: values.unit, company: values.company || undefined }).then(setPref).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [values.unit, values.company, values.purpose, queue.online]);

  const precheck = async () => {
    if (!queue.online || (!values.phone && !values.vehicleNumber)) return;
    try {
      const r = await checkWatchlist(clean({ phone: values.phone, vehicleNumber: values.vehicleNumber, name: values.name }));
      setPre(r.status === 'clear' ? null : r);
    } catch {
      setPre(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const body = clean({ ...values, gateId: gate?._id });
    if (photo[0]) body.photo = photo[0]._id;
    const enqueue = () => {
      delete body.photo; // uploads need the network
      queue.enqueue('entry', body, `${values.name} → ${unitLabel || 'unit'}${values.guardApproved ? ' (allowed)' : ''}`);
      toast.success('Saved offline — will sync when back online');
      resetForm();
    };
    if (!queue.online) return enqueue();
    setOutcome(null);
    return log.mutate(body, {
      onError: (err) => {
        if (isNetworkError(err)) return enqueue();
        if (err.code === 'VISITOR_BLOCKED') setOutcome({ tone: 'red', icon: ShieldX, title: 'Do not allow entry', body: err.message });
        if (err.code === 'GATE_NOT_ALLOWED') setOutcome({ tone: 'amber', icon: DoorClosed, title: 'Not at this gate', body: err.message, retry: body });
        return applyServerErrors(err);
      },
    });
  };
  // Override of a gate refusal, recorded on the entry.
  const override = () => log.mutate({ ...outcome.retry, guardApproved: true }, { onError: (err) => setOutcome({ tone: 'red', icon: AlertTriangle, title: 'Not allowed', body: err.message }) });
  const kind = visitorKind(values.purpose);
  const wrongGate = gate && !gateTakes(gate, kind) ? `${gate.name} does not take ${KIND_WORD[kind]}` : gate?.isPedestrianOnly && values.vehicleNumber ? `${gate.name} is for people on foot only` : null;

  const pickFrequent = (f) => setValues((v) => ({ ...v, name: f.name, phone: f.phone || '', purpose: f.purpose || 'guest', company: f.company || '', vehicleNumber: f.vehicleNumber || '' }));

  return (
    <Card>
      <CardHeader title="New visitor" subtitle={queue.online ? 'Resident gets an approval request instantly' : 'Offline: saved on this device'} />
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
        {outcome && (
          <Notice tone={outcome.tone} icon={outcome.icon} title={outcome.title} onClose={() => setOutcome(null)}>
            {outcome.body}
            {outcome.retry && <div><OverrideButton loading={log.isPending} onClick={override} /></div>}
          </Notice>
        )}
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => set('purpose', p)}
              className={cn('rounded-full border px-3 py-2 text-sm font-medium', values.purpose === p ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {label(p)}
            </button>
          ))}
        </div>
        {wrongGate && !outcome && (
          <Notice tone="amber" icon={DoorClosed} title={wrongGate}>Send them to the right gate, or tick "resident confirmed" after a phone call to let them in here.</Notice>
        )}
        <UnitPicker value={values.unit} onChange={(id, u) => { set('unit', id); setUnitLabel(u?.label || ''); }} required />
        {frequent?.data?.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Frequent visitors of {unitLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {frequent.data.map((f) => (
                <button key={f._id} type="button" onClick={() => pickFrequent(f)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">
                  {f.name}{f.autoApprove ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
        {pref?.leaveAtGate && (
          <Notice tone="blue" icon={Package} title="Household says: leave at gate">
            {pref.preference.company}{pref.preference.oneOff ? ' (today only)' : ''}{pref.preference.note ? ` — ${pref.preference.note}` : ''}. No approval needed.
          </Notice>
        )}
        {/* Phones: name (and company) full width, phone + vehicle side by side so the form stays short. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Input className="col-span-2 sm:col-span-1" label="Visitor name" required {...bind('name')} />
          {['delivery', 'cab', 'service'].includes(values.purpose) && <Input className="col-span-2 sm:col-span-1" label="Company" placeholder="Amazon, Swiggy, Uber…" {...bind('company')} />}
          <Input label="Phone" type="tel" inputMode="tel" {...bind('phone')} onBlur={precheck} />
          <Input label="Vehicle number" autoCapitalize="characters" {...bind('vehicleNumber')} onBlur={precheck} />
        </div>
        {pre && (
          <Notice tone={pre.status === 'block' ? 'red' : 'amber'} icon={pre.status === 'block' ? ShieldX : ShieldAlert} title={pre.status === 'block' ? 'On the blocklist' : 'On the watchlist'}>
            {pre.matches.map((m) => <p key={m.entry}>{m.name ? `${m.name}: ` : ''}{m.reason}</p>)}
          </Notice>
        )}
        {queue.online && <FileUpload folder="visitors" files={photo} onChange={setPhoto} max={1} camera label="Visitor photo" />}
        {(!queue.online || wrongGate) && (
          <Checkbox label="Resident confirmed by phone — let them in" checked={values.guardApproved} onChange={(e) => set('guardApproved', e.target.checked)} />
        )}
        {/* Stays at the bottom of the screen on phones so the guard never has to scroll to send. */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" size="lg" icon={queue.online ? UserPlus : WifiOff} loading={log.isPending} disabled={!values.unit} className="w-full">
            {queue.online ? 'Request entry' : 'Save entry offline'}
          </Button>
          {!values.unit && <p className="mt-1 text-center text-xs text-slate-500 sm:hidden">Pick the flat first</p>}
        </div>
      </form>
    </Card>
  );
}

// ---------- scan / codes ----------
function ScanPanel({ queue, gate }) {
  const toast = useToast();
  const [mode, setMode] = useState('pass');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const gateId = gate?._id;
  const onDone = (v) => {
    setResult(v.watch ? { tone: 'amber', icon: ShieldAlert, title: `${v.name} entered — watchlist`, body: `${v.watch.reason} · ${v.unit.label}` } : { tone: 'green', icon: CheckCircle2, title: `${v.name} may enter`, body: `${v.unit.label} · ${v.note || 'Pre-approved pass'}` });
    setCode('');
  };
  const verify = useVerifyPass({ onSuccess: onDone });
  const scan = useGateScan({ onSuccess: (r) => { setResult({ tone: 'green', icon: CheckCircle2, title: `${r.help.name} ${r.direction === 'in' ? 'entered' : 'left'}`, body: 'Daily help' }); setCode(''); } });
  const busy = verify.isPending || scan.isPending;

  // retry: the pass body to send again as an override when the refusal is about the gate.
  const fail = (err, retry) => {
    if (err.code === 'VISITOR_BLOCKED') setResult({ tone: 'red', icon: ShieldX, title: 'Do not allow entry', body: err.message });
    else if (err.code === 'GATE_NOT_ALLOWED') setResult({ tone: 'amber', icon: DoorClosed, title: 'Not at this gate', body: err.message, retry });
    else setResult({ tone: 'red', icon: AlertTriangle, title: 'Not allowed', body: err.message });
  };
  const override = () => verify.mutate({ ...result.retry, guardApproved: true }, { onError: (err) => fail(err) });

  // Offline the guard checks the code against the guest's phone; the server verifies it on sync.
  const queuePass = (body, text) => {
    queue.enqueue('pass', body, `Pass ${text}`);
    toast.success('Pass saved offline — it is verified when the connection returns');
    setResult({ tone: 'amber', icon: WifiOff, title: 'Saved offline', body: 'Check the code against the guest’s phone before letting them in.' });
    setCode('');
  };
  const submitPass = (raw, text) => {
    const body = { ...raw, gateId };
    if (!queue.online) return queuePass(body, text);
    return verify.mutate(body, { onError: (err) => (isNetworkError(err) ? queuePass(body, text) : fail(err, body)) });
  };

  const onScan = (text) => {
    if (!text) return setResult({ tone: 'red', icon: AlertTriangle, title: 'No QR code found in the photo' });
    if (text.startsWith('CHP1.')) return submitPass({ qr: text }, 'QR');
    if (/^\d{6}$/.test(text)) return submitPass({ code: text }, text);
    if (text.startsWith('CHKPT:')) return setResult({ tone: 'blue', icon: QrCode, title: 'This is a patrol checkpoint', body: 'Scan it from the Patrols page.' });
    return setResult({ tone: 'red', icon: AlertTriangle, title: 'Not a guest pass QR' });
  };

  const submitCode = (e) => {
    e.preventDefault();
    if (code.length < 4) return;
    setResult(null);
    if (mode === 'pass') return submitPass({ code }, code);
    if (!queue.online) {
      queue.enqueue('help_scan', { passcode: code }, `Daily help ${code}`);
      toast.success('Saved offline');
      return setCode('');
    }
    return scan.mutate({ passcode: code, gateId }, { onError: (err) => (isNetworkError(err) ? queue.enqueue('help_scan', { passcode: code }, `Daily help ${code}`) : fail(err)) });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader title="Scan guest pass QR" />
        <div className="p-4"><QrScanner onScan={onScan} paused={busy} fallbackHint="Or type the 6-digit code from the guest’s phone in the box below." /></div>
      </Card>
      <div className="space-y-4">
        {result && (
          <Notice tone={result.tone} icon={result.icon} title={result.title} onClose={() => setResult(null)}>
            {result.body}
            {result.retry && <div><OverrideButton loading={verify.isPending} onClick={override} /></div>}
          </Notice>
        )}
        <Card>
          <CardHeader title="Or type a code" />
          <form onSubmit={submitCode} className="space-y-4 p-4">
            <Tabs value={mode} onChange={setMode} tabs={[{ value: 'pass', label: 'Guest pass' }, { value: 'help', label: 'Daily help in/out' }]} />
            <input
              inputMode="numeric"
              maxLength={mode === 'pass' ? 6 : 10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              aria-label="Code"
              className="block h-14 w-full rounded-lg border border-slate-300 text-center font-mono text-3xl tracking-[0.5em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <Button type="submit" size="lg" icon={KeyRound} loading={busy} disabled={mode === 'pass' ? code.length !== 6 : code.length < 4} className="w-full">
              {mode === 'pass' ? 'Verify & let in' : 'Mark entry / exit'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ---------- pending / inside ----------
function ContactsModal({ visitor, onClose }) {
  const { data, isLoading } = useHouseholdContacts(visitor?._id);
  return (
    <Modal open={Boolean(visitor)} onClose={onClose} title={`Call ${visitor?.unit?.label || 'household'}`} description={visitor ? `${visitor.name} is waiting at the gate` : ''} size="sm" footer={<Button onClick={onClose}>Close</Button>}>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : !data?.length ? (
        <p className="text-sm text-slate-500">No residents registered for this unit.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={`${c.name}-${c.phone}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{label(c.residentType)}{c.phone ? ` · ${c.phone}` : ' · no phone'}</p>
              </div>
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"><Phone className="size-4" />Call</a>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// "Let in" / "Send back" ask once more in a large dialog, so a wrong tap on a busy gate does not decide.
function DecisionModal({ decision, onClose, onConfirm, busy }) {
  const v = decision?.visitor;
  const letIn = decision?.kind === 'in';
  return (
    <Modal
      open={Boolean(decision)}
      onClose={onClose}
      size="sm"
      title={letIn ? `Let ${v?.name} in?` : `Send ${v?.name} back?`}
      description={v ? `${label(v.purpose)} for ${v.unit?.label || 'the flat'}` : ''}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <Button variant={letIn ? 'success' : 'danger'} size="lg" loading={busy} onClick={onConfirm}>{letIn ? 'Yes, let in' : 'Yes, send back'}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {letIn ? 'Only let them in if the resident said yes (for example on a phone call).' : 'The visitor is turned away and the household sees that entry was refused.'}
      </p>
    </Modal>
  );
}

function PendingList({ online, scope }) {
  const { user } = useAuth();
  const live5 = useLiveInterval(5000);
  const { data } = useVisitors({ status: 'pending', limit: 30, gate: scope.gateId }, { refetchInterval: live5, enabled: online });
  const allow = useGuardCheckIn();
  const adminDeny = useDenyVisitor();
  const guardDeny = useGuardSendBack();
  const deny = user.role === ROLES.GUARD ? guardDeny : adminDeny;
  const [calling, setCalling] = useState(null);
  const [decision, setDecision] = useState(null); // { kind: 'in' | 'back', visitor }
  // Guards send visitors back through their own endpoint; admins refuse on the household's behalf.
  const canSendBack = user.role === ROLES.ADMIN || user.role === ROLES.GUARD;
  const rows = data?.data || [];
  const confirm = () => {
    const done = { onSuccess: () => setDecision(null) };
    if (decision.kind === 'in') allow.mutate(decision.visitor._id, done);
    else deny.mutate(decision.visitor._id, done);
  };
  return (
    <Card>
      <CardHeader title={`Waiting for approval (${rows.length})`} subtitle={online ? 'Updates live · if the resident does not answer, call them' : 'Offline — list may be out of date'} action={<ScopeToggle scope={scope} />} />
      {!rows.length ? (
        <EmptyState title="No one waiting" description="Visitors you log wait here until the resident answers." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((v) => (
            <VisitorRow key={v._id} v={v} actionsBelow
              actions={
                <div className={cn('grid w-full gap-2', canSendBack && 'sm:grid-cols-2')}>
                  <Button size="lg" variant="success" icon={CheckCircle2} className="w-full" onClick={() => setDecision({ kind: 'in', visitor: v })}>Let in</Button>
                  {canSendBack && <Button size="lg" variant="danger" icon={Undo2} className="w-full" onClick={() => setDecision({ kind: 'back', visitor: v })}>Send back</Button>}
                  <Button variant={v.callResident ? 'danger' : 'secondary'} icon={Phone} className={cn('w-full', canSendBack && 'sm:col-span-2')} onClick={() => setCalling(v)}>Call resident</Button>
                </div>
              } />
          ))}
        </ul>
      )}
      <ContactsModal visitor={calling} onClose={() => setCalling(null)} />
      <DecisionModal decision={decision} onClose={() => setDecision(null)} onConfirm={confirm} busy={allow.isPending || deny.isPending} />
    </Card>
  );
}

// gate: the console's gate (visitors leave by it); scope.gateId: list only those who came in by it.
function InsideList({ queue, gate, scope }) {
  const toast = useToast();
  const live15 = useLiveInterval(15000);
  const { data } = useVisitors({ status: 'checked_in', limit: 50, gate: scope.gateId }, { refetchInterval: live15, enabled: queue.online });
  const { data: help } = useDailyHelp({ inside: true, limit: 50, gate: scope.gateId }, { refetchInterval: live15, enabled: queue.online });
  const out = useCheckOut();
  const rows = data?.data || [];
  // Entries made offline (allowed in by the guard) that have not reached the server yet.
  const offlineInside = queue.queued.filter(
    (o) => o.kind === 'entry' && o.data.guardApproved && (!scope.gateId || o.gateId === scope.gateId) && !queue.queued.some((c) => c.kind === 'checkout' && c.data.entryKey === o.key),
  );
  const checkedOutOffline = new Set(queue.queued.filter((o) => o.kind === 'checkout' && o.data.visitorId).map((o) => o.data.visitorId));

  const checkOut = (v) => {
    const enqueue = () => {
      queue.enqueue('checkout', { visitorId: v._id }, `${v.name} (${v.unit?.label || ''}) out`);
      toast.success('Check-out saved offline');
    };
    if (!queue.online) return enqueue();
    return out.mutate({ id: v._id, gateId: gate?._id }, { onError: (err) => isNetworkError(err) && enqueue() });
  };

  const visible = rows.filter((v) => !checkedOutOffline.has(v._id));
  const count = visible.length + offlineInside.length + (help?.data.length || 0);
  return (
    <Card>
      <CardHeader title={`Inside now (${count})`} subtitle={scope.gateId && gate ? `Came in by ${gate.name}` : undefined} action={<ScopeToggle scope={scope} />} />
      {!count && <EmptyState title="Nobody inside" />}
      <ul className="divide-y divide-slate-100">
        {offlineInside.map((o) => (
          <li key={o.key} className="flex items-center gap-3 px-4 py-3 text-sm">
            <Badge tone="amber"><WifiOff className="mr-1 size-3" />Not synced</Badge>
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{o.label}</span>
            <span className="text-xs text-slate-400">{time(o.occurredAt)}</span>
            <Button size="sm" variant="secondary" icon={LogOut} onClick={() => queue.enqueue('checkout', { entryKey: o.key }, `${o.data.name} out`)}>Out</Button>
          </li>
        ))}
        {visible.map((v) => (
          <VisitorRow key={v._id} v={v} actions={<Button size="sm" variant="secondary" icon={LogOut} loading={out.isPending && out.variables?.id === v._id} onClick={() => checkOut(v)}>Check out</Button>} />
        ))}
        {help?.data.map((h) => (
          <li key={h._id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Daily help</span>
            <span className="font-medium text-slate-800">{h.name}</span>
            <span className="truncate text-slate-500">{label(h.type)} · {h.units.map((u) => u.label).join(', ')}</span>
            <span className="ml-auto text-xs text-slate-400">{timeAgo(h.lastSeenAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------- parcels / vehicles ----------
function ParcelsPanel({ online, gate, gates }) {
  if (!online) return <Card><EmptyState icon={WifiOff} title="Parcels need a connection" description="Keep the parcel aside and log it when the network is back." /></Card>;
  if (gate && !gateTakes(gate, 'deliveries')) {
    const to = gates.filter((g) => gateTakes(g, 'deliveries')).map((g) => g.name).join(' or ');
    return <Card><EmptyState icon={DoorClosed} title={`${gate.name} does not take deliveries`} description={to ? `Send couriers to ${to}.` : undefined} /></Card>;
  }
  return (
    <div className="space-y-4">
      <LogParcelForm gateId={gate?._id} />
      <Link to="/parcels" className="block text-center text-sm font-medium text-brand-600 hover:underline">Open the parcel register to hand over parcels →</Link>
    </div>
  );
}

function VehiclesPanel({ online, gate }) {
  if (!online) return <Card><EmptyState icon={WifiOff} title="Vehicle checks need a connection" /></Card>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {gate && !gateTakes(gate, 'vehicles') ? (
        <Card><EmptyState icon={DoorClosed} title={`${gate.name} takes no vehicles`} description="Vehicle checks are logged at the vehicle gates." /></Card>
      ) : (
        <ManualLog gate={gate} />
      )}
      <BarrierControl compact gate={gate} />
    </div>
  );
}

export default function GateConsolePage() {
  const { user } = useAuth();
  const current = useCurrentGate();
  const { gate } = current;
  const queue = useGateQueue(user.society?._id || user.society, gate);
  const wide = useWide();
  // Waiting / inside lists default to this gate when the society has several.
  const [scopeValue, setScope] = useState('gate');
  const multi = current.gates.length > 1 && Boolean(gate);
  const scope = { multi, value: scopeValue, set: setScope, gateId: multi && scopeValue === 'gate' ? gate._id : undefined };
  const [params] = useSearchParams();
  // ?tab= lets the home screen open the console on a given job (scan, parcels, waiting list…).
  const [tab, setTab] = useState(() => (TAB_VALUES.includes(params.get('tab')) ? params.get('tab') : 'entry'));
  const [moreTab, setMoreTab] = useState('vehicles');
  const live = { enabled: !wide && queue.online, refetchInterval: 10000 };
  const { data: pending } = useVisitors({ status: 'pending', limit: 1, gate: scope.gateId }, live);
  const { data: inside } = useVisitors({ status: 'checked_in', limit: 1, gate: scope.gateId }, live);
  const { data: helpInside } = useDailyHelp({ inside: true, limit: 1, gate: scope.gateId }, live);
  const waitingCount = pending?.meta?.total || 0;
  const insideCount = (inside?.meta?.total || 0) + (helpInside?.meta?.total || 0);

  // Tablets/desktops keep the waiting and inside lists beside the action tabs. Phones get them as tabs,
  // most-used first, with the rarely used ones folded under "More".
  const tabs = wide
    ? [{ value: 'entry', label: 'Entry' }, { value: 'scan', label: 'Scan / code' }, { value: 'parcels', label: 'Parcels' }, ...LESS_USED]
    : [
        { value: 'entry', label: 'Entry' },
        { value: 'pending', label: 'Waiting', count: waitingCount },
        { value: 'inside', label: 'Inside' },
        { value: 'scan', label: 'Scan / code' },
        { value: 'parcels', label: 'Parcels' },
        { value: 'more', label: 'More' },
      ];
  const currentTab = wide && ['pending', 'inside'].includes(tab) ? 'entry' : tab;
  const inMore = !wide && LESS_USED.some((t) => t.value === currentTab);
  const openTab = (v) => setTab(v === 'more' ? moreTab : v);

  const panel = {
    entry: <NewEntry queue={queue} gate={gate} />,
    scan: <ScanPanel queue={queue} gate={gate} />,
    parcels: <ParcelsPanel online={queue.online} gate={gate} gates={current.gates} />,
    vehicles: <VehiclesPanel online={queue.online} gate={gate} />,
    children: queue.online ? <ChildExitPanel gate={gate} /> : <Card><EmptyState icon={Baby} title="Child alerts need a connection" description="Call the parents directly." /></Card>,
    pending: <PendingList online={queue.online} scope={scope} />,
    inside: <InsideList queue={queue} gate={gate} scope={scope} />,
  }[currentTab];

  return (
    <div>
      <PageHeader
        title="Gate console"
        description="Log visitors, scan passes, take parcels and watch the gate."
        actions={
          <>
            <Link to="/vehicle-movements"><Button variant="secondary" size="sm" icon={Car}>Vehicles</Button></Link>
            <Link to="/security/watchlist"><Button variant="secondary" size="sm" icon={ShieldAlert}>Blocklist</Button></Link>
          </>
        }
      />
      <GateBar current={current} />
      <OfflineBanner queue={queue} />
      {!wide && queue.online && (
        <div className="sticky top-16 z-10 -mx-4 mb-3 flex border-y border-slate-200 bg-white/95 text-sm font-semibold backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <button type="button" onClick={() => setTab('pending')} className={cn('flex-1 px-3 py-2.5 text-center', waitingCount ? 'text-amber-700' : 'text-slate-600')}>
            Waiting: {waitingCount}
          </button>
          <span className="w-px bg-slate-200" aria-hidden="true" />
          <button type="button" onClick={() => setTab('inside')} className="flex-1 px-3 py-2.5 text-center text-slate-700">
            Inside: {insideCount}
          </button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0 space-y-4">
          <Tabs className="w-full sm:w-fit" value={inMore ? 'more' : currentTab} onChange={openTab} tabs={tabs} />
          {inMore && (
            <Tabs className="w-fit" value={currentTab} onChange={(v) => { setMoreTab(v); setTab(v); }} tabs={LESS_USED} />
          )}
          {panel}
        </div>
        {wide && (
          <div className="space-y-6">
            <PendingList online={queue.online} scope={scope} />
            <InsideList queue={queue} gate={gate} scope={scope} />
          </div>
        )}
      </div>
    </div>
  );
}
