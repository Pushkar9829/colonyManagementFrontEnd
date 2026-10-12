import { useState } from 'react';
import { Ticket } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Modal, Spinner, StatusBadge } from '../../../components/ui';
import { date as fmtDate, money, todayISO } from '../../../lib/format';
import { useBuyPass, useCancelPass, usePassPlans, usePasses, usePayPass } from '../api';
import { PassQr } from './PassQr';

function BuyModal({ plan, onClose }) {
  const [validFrom, setValidFrom] = useState(todayISO());
  const buy = useBuyPass({ onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`${plan.amenity?.name} · ${plan.name}`} description={`${plan.durationDays} days · ${plan.price ? money(plan.price) : 'Free'}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={buy.isPending} onClick={() => buy.mutate({ plan: plan._id, validFrom })}>{plan.price ? `Buy for ${money(plan.price)}` : 'Join'}</Button></>}>
      <Input label="Starts on" type="date" min={todayISO()} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
      {plan.description && <p className="mt-3 text-sm text-slate-600">{plan.description}</p>}
    </Modal>
  );
}

// Resident view: plans on sale and the home's passes with their QR codes.
export function MyPasses() {
  const { data: plans = [], isLoading: loadingPlans } = usePassPlans();
  const { data: passes, isLoading } = usePasses({ limit: 50 });
  const [buying, setBuying] = useState(null);
  const [showing, setShowing] = useState(null);
  const pay = usePayPass();
  const cancel = useCancelPass();
  const today = todayISO();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Memberships on offer" subtitle="Monthly gym, pool and other passes" />
        {loadingPlans ? <div className="flex justify-center py-8"><Spinner /></div> : !plans.length ? <EmptyState icon={Ticket} title="No memberships on sale" /> : (
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => (
              <li key={p._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{p.amenity?.name} · {p.name}</p>
                  <p className="text-sm text-slate-500">{p.durationDays} days · {p.price ? money(p.price) : 'Free'}</p>
                </div>
                <Button size="sm" onClick={() => setBuying(p)}>Buy</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title="Our memberships" />
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : !passes?.data.length ? <EmptyState title="No memberships yet" /> : (
          <ul className="divide-y divide-slate-100">
            {passes.data.map((p) => {
              const live = p.status === 'active' && p.validFrom <= today && p.validTo >= today;
              return (
                <li key={p._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{p.amenity?.name} · {p.plan?.name}</p>
                      {live ? <Badge tone="green">Valid now</Badge> : <StatusBadge status={p.status} />}
                    </div>
                    <p className="text-sm text-slate-500">{p.holder?.name} · {fmtDate(p.validFrom)} – {fmtDate(p.validTo)} · {p.entries} entries</p>
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'active' && <Button size="sm" variant="secondary" onClick={() => setShowing(p)}>Show QR</Button>}
                    {p.status === 'payment_pending' && p.paymentStatus === 'pending' && <Button size="sm" loading={pay.isPending} onClick={() => pay.mutate(p)}>Pay {money(p.price)}</Button>}
                    {p.status === 'payment_pending' && p.paymentStatus === 'pay_at_desk' && <Badge tone="amber">Pay at office</Badge>}
                    {p.status === 'payment_pending' && <Button size="sm" variant="ghost" onClick={() => window.confirm('Cancel this pass?') && cancel.mutate({ id: p._id })}>Cancel</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {buying && <BuyModal plan={buying} onClose={() => setBuying(null)} />}
      {showing && (
        <Modal open onClose={() => setShowing(null)} title={`${showing.amenity?.name} pass`} description={`${showing.holder?.name} · valid till ${fmtDate(showing.validTo)}`} size="sm">
          <div className="flex justify-center py-2"><PassQr code={showing.code} size={220} /></div>
          <p className="text-center text-xs text-slate-500">Show this at the entrance. The guard scans it or types the code.</p>
        </Modal>
      )}
    </div>
  );
}
