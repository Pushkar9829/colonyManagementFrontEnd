import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Button, Card, CardHeader } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';
import { disablePush, enablePush, pushState } from '../push';

const MESSAGES = {
  unsupported: 'This browser does not support push notifications. On iPhone, add the app to your Home Screen first.',
  disabled: 'Push notifications are not set up on the server yet.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings, then reload.',
  on: 'This device gets alerts for visitors at the gate, SOS, bills and complaint updates — even when the app is closed.',
  off: 'Get alerts for visitors at the gate, SOS, bills and complaint updates even when the app is closed.',
};

export function PushToggle() {
  const toast = useToast();
  const { t } = useT();
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === 'on') {
        await disablePush();
        toast.success(t('Push notifications turned off on this device'));
      } else {
        await enablePush();
        toast.success(t('Push notifications turned on'));
      }
      setState(await pushState());
    } catch (err) {
      toast.error(err);
      setState(await pushState().catch(() => 'unsupported'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Notifications on this device" />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <BellRing className="size-8 shrink-0 text-brand-500" />
        <p className="flex-1 text-sm text-slate-600">{state === 'loading' ? t('Checking…') : t(MESSAGES[state])}</p>
        {['on', 'off'].includes(state) && (
          <Button variant={state === 'on' ? 'secondary' : 'primary'} loading={busy} onClick={toggle}>
            {state === 'on' ? 'Turn off' : 'Turn on'}
          </Button>
        )}
      </div>
    </Card>
  );
}
