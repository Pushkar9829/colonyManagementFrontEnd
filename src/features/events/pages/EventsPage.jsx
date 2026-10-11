import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, List, MapPin, Plus, Ticket, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Pagination, Spinner, Tabs } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/cn';
import { label, money } from '../../../lib/format';
import { isManager } from '../../../lib/roles';
import { useEvents } from '../api';
import { CalendarGrid, dayKey, monthGrid } from '../components/CalendarGrid';
import { EventFormModal } from '../components/EventFormModal';
import { whenText } from '../format';

const RSVP_BADGE = { confirmed: ['green', 'Going'], waitlisted: ['amber', 'Waitlisted'], maybe: ['blue', 'Maybe'], declined: ['slate', 'Not going'], cancelled: ['slate', 'Cancelled'] };

export function EventCard({ e }) {
  const navigate = useNavigate();
  const start = new Date(e.startAt);
  const rsvp = e.myRsvp && RSVP_BADGE[e.myRsvp.state];
  return (
    <Card className="flex cursor-pointer overflow-hidden transition hover:border-brand-200" onClick={() => navigate(`/events/${e._id}`)}>
      {e.cover?.url ? (
        <img src={e.cover.url} alt="" className="hidden w-32 shrink-0 object-cover sm:block" />
      ) : (
        <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-brand-50 text-brand-700 sm:w-20">
          <span className="text-[11px] font-semibold uppercase">{start.toLocaleDateString('en-IN', { month: 'short' })}</span>
          <span className="text-2xl font-bold leading-none">{start.getDate()}</span>
        </div>
      )}
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className={cn('font-semibold text-slate-900', e.status === 'cancelled' && 'line-through')}>{e.title}</h3>
          {e.status === 'cancelled' && <Badge tone="red">Cancelled</Badge>}
          {rsvp && e.status !== 'cancelled' && <Badge tone={rsvp[0]}>{rsvp[1]}</Badge>}
          {e.isFull && e.status !== 'cancelled' && <Badge tone="amber">Full</Badge>}
        </div>
        <p className="mt-1 text-sm text-slate-600">{whenText(e)}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {e.venue && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{e.venue}</span>}
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{e.goingCount}{e.capacity ? ` / ${e.capacity}` : ''} going</span>
          <span className="inline-flex items-center gap-1"><Ticket className="size-3.5" />{e.ticketPrice ? `${money(e.ticketPrice)} / person` : 'Free'}</span>
          <Badge>{label(e.category)}</Badge>
        </div>
      </div>
    </Card>
  );
}

function CalendarView() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(dayKey(new Date()));
  const range = useMemo(() => {
    const days = monthGrid(month);
    const to = new Date(days[41]);
    to.setDate(to.getDate() + 1);
    return { from: days[0].toISOString(), to: to.toISOString() };
  }, [month]);
  const { data, isLoading } = useEvents({ ...range, limit: 100 });
  const events = data?.data || [];
  const dayEvents = events.filter((e) => dayKey(e.startAt) <= selected && dayKey(e.endAt) >= selected);
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {isLoading && !data ? <div className="flex justify-center py-16"><Spinner /></div> : <CalendarGrid month={month} onMonth={setMonth} events={events} selected={selected} onSelect={setSelected} />}
      </Card>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {!dayEvents.length ? <p className="text-sm text-slate-400">No events on this day.</p> : <div className="space-y-3">{dayEvents.map((e) => <EventCard key={e._id} e={e} />)}</div>}
      </div>
    </div>
  );
}

function ListView({ when }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEvents({ when, page });
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data?.data.length) {
    return <Card><EmptyState icon={CalendarDays} title={when === 'past' ? 'No past events' : 'No upcoming events'} description={when === 'past' ? undefined : 'Festivals, sports and meet-ups organised by the committee show up here.'} /></Card>;
  }
  return (
    <div className="space-y-3">
      {data.data.map((e) => <EventCard key={e._id} e={e} />)}
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const organiser = isManager(user);
  const [view, setView] = useState('upcoming');
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <PageHeader title="Events" description="What's happening in the society." actions={organiser && <Button icon={Plus} onClick={() => setCreating(true)}>New event</Button>} />
      <Tabs className="mb-4 w-fit" value={view} onChange={setView}
        tabs={[{ value: 'upcoming', label: <span className="inline-flex items-center gap-1.5"><List className="size-4" />Upcoming</span> }, { value: 'calendar', label: <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />Calendar</span> }, { value: 'past', label: 'Past' }]} />
      {view === 'calendar' ? <CalendarView /> : <ListView key={view} when={view} />}
      {creating && <EventFormModal open onClose={() => setCreating(false)} onSaved={(e) => navigate(`/events/${e._id}`)} />}
    </div>
  );
}
