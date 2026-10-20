import { CalendarClock, Check, Sparkles, Trophy } from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useT } from '../../../context/LanguageContext';
import { timingText } from '../lib';

// The member's call to action on a draw card / detail page. Pure: the parent passes the mutations.
export function ParticipateButton({ draw, onEnter, onWithdraw, entering = false, withdrawing = false, className }) {
  const { t } = useT();
  const entered = draw.myEntry?.status === 'entered';
  const box = (tone, children) => <div className={cn('flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', tone, className)}>{children}</div>;

  if (draw.myWins?.length) {
    return box('bg-amber-50 text-amber-800', <><Trophy className="size-5" /> {t('You won {prize}!', { prize: draw.myWins.map((w) => w.prize).join(', ') })}</>);
  }
  if (draw.phase === 'cancelled' || draw.phase === 'draft') return null;
  if (draw.phase === 'drawn') return entered ? box('bg-slate-50 text-slate-600', t('You took part — better luck next time')) : null;
  if (entered) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700" role="status">
          <Check className="size-4" /> {t("You're in")}
        </span>
        {draw.phase === 'open' && <Button variant="ghost" size="sm" loading={withdrawing} onClick={() => onWithdraw?.(draw._id)}>Withdraw</Button>}
      </div>
    );
  }
  if (draw.phase === 'closed') return box('bg-slate-50 text-slate-600', t('Entries are closed'));
  if (!draw.eligible) return draw.ineligibleReason === 'Only residents can take part' ? null : box('bg-slate-50 text-slate-600', t(draw.ineligibleReason));
  if (draw.phase === 'upcoming') {
    return <Button size="lg" variant="secondary" icon={CalendarClock} disabled className={cn('w-full sm:w-auto', className)}>{timingText(draw, undefined, t)}</Button>;
  }
  return (
    <Button size="lg" icon={Sparkles} loading={entering} onClick={() => onEnter?.(draw._id)} className={cn('w-full sm:w-auto', className)}>
      Participate
    </Button>
  );
}
