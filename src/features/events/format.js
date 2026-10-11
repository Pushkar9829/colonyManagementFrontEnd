// "Sat, 12 Oct · 7:00 pm – 11:00 pm" (or a date range for multi-day events)
export const whenText = (e) => {
  const s = new Date(e.startAt);
  const end = new Date(e.endAt);
  const sameDay = s.toDateString() === end.toDateString();
  const d = s.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const t = (x) => x.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${d} · ${t(s)} – ${t(end)}` : `${d} ${t(s)} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${t(end)}`;
};
