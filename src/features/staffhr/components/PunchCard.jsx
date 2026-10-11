import { useRef, useState } from 'react';
import { Camera, Loader2, LogIn, LogOut, MapPin } from 'lucide-react';
import { upload } from '../../../api/client';
import { Badge, Button, Card, CardHeader, Spinner } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { label, time } from '../../../lib/format';
import { useCheckIn, useCheckOut, useMyToday } from '../api';
import { ATT_TONES } from '../constants';

const locate = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });

// Self check-in / out: front-camera selfie (via <input capture>) plus GPS for the society geofence.
export function PunchCard() {
  const toast = useToast();
  const { data, isLoading } = useMyToday();
  const input = useRef(null);
  const [step, setStep] = useState('');
  const action = useRef('in');
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const start = (kind) => {
    action.current = kind;
    if (data?.requireSelfie) input.current?.click();
    else submit(null);
  };

  const submit = async (file) => {
    try {
      let photo;
      if (file) {
        setStep('Uploading selfie…');
        const fd = new FormData();
        fd.append('folder', 'staffhr');
        fd.append('file', file);
        photo = (await upload('/uploads', fd))._id;
      }
      setStep('Getting location…');
      const geo = await locate();
      if (!geo && data?.geofence) {
        toast.error('Allow location access to mark attendance');
        return;
      }
      setStep('Saving…');
      const body = { photo, ...(geo || {}) };
      await (action.current === 'in' ? checkIn : checkOut).mutateAsync(body);
    } catch {
      // errors are shown by the mutation / upload toast
    } finally {
      setStep('');
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) submit(file);
  };

  if (isLoading) return <Card className="flex justify-center p-8"><Spinner /></Card>;
  if (!data?.employee) {
    return (
      <Card className="p-5 text-sm text-slate-600">
        You don’t have an employee profile here yet, so attendance and payslips are not available. Ask the facility manager to add you.
      </Card>
    );
  }
  const rec = data.record;
  const open = data.openFromYesterday;
  const canIn = !rec?.checkIn && !open && !(rec?.status === 'on_leave' && rec.leaveDays === 1);
  const canOut = (rec?.checkIn && !rec?.checkOut) || open;
  const busy = Boolean(step) || checkIn.isPending || checkOut.isPending;

  return (
    <Card>
      <CardHeader title="My attendance" subtitle={`${data.employee.name} · ${data.employee.employeeCode}`} action={rec && <Badge tone={ATT_TONES[rec.status]}>{label(rec.status)}</Badge>} />
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Shift</p><p className="font-semibold text-slate-900">{data.dayOff ? 'Day off' : data.shift ? `${data.shift.start}–${data.shift.end}` : 'Flexible'}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">In</p><p className="font-semibold text-slate-900">{rec?.checkIn?.at ? time(rec.checkIn.at) : open ? `${time(open.checkIn.at)} (yday)` : '—'}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Out</p><p className="font-semibold text-slate-900">{rec?.checkOut?.at ? time(rec.checkOut.at) : '—'}</p></div>
        </div>
        {rec?.status === 'late' && <p className="text-sm text-amber-700">Checked in {rec.lateMinutes} minutes late.</p>}
        {rec?.status === 'on_leave' && <p className="text-sm text-sky-700">You are on approved leave today.</p>}
        <div className="flex gap-3">
          <Button size="lg" className="flex-1" icon={busy && action.current === 'in' ? Loader2 : LogIn} disabled={!canIn || busy} onClick={() => start('in')}>Check in</Button>
          <Button size="lg" variant="secondary" className="flex-1" icon={busy && action.current === 'out' ? Loader2 : LogOut} disabled={!canOut || busy} onClick={() => start('out')}>Check out</Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          {data.requireSelfie && <><Camera className="size-3.5" /> Selfie required</>}
          {data.geofence && <><MapPin className="ml-2 size-3.5" /> Within {data.geofence.radiusM} m of the society</>}
          {step && <span className="ml-auto font-medium text-brand-700">{step}</span>}
        </p>
        <input ref={input} type="file" accept="image/*" capture="user" hidden onChange={onFile} />
      </div>
    </Card>
  );
}
