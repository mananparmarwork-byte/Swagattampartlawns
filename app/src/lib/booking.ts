// Time slots for hall bookings, shared by the estimator and the admin panel.
export type SlotId = 'morning' | 'afternoon' | 'evening' | 'night';
export type EventSlots = Record<string, SlotId[]>;

export const SLOTS: { id: SlotId; label: string; letter: string; start: string; end: string }[] = [
  { id: 'morning', label: 'Morning', letter: 'M', start: '5:00 AM', end: '12:00 PM' },
  { id: 'afternoon', label: 'Afternoon', letter: 'A', start: '12:00 PM', end: '5:00 PM' },
  { id: 'evening', label: 'Evening', letter: 'E', start: '5:00 PM', end: '9:00 PM' },
  { id: 'night', label: 'Night', letter: 'N', start: '9:00 PM', end: '4:00 AM' },
];

export const ALL_SLOT_IDS: SlotId[] = SLOTS.map((slot) => slot.id);

export function sortSlots(slots: SlotId[] | undefined): SlotId[] {
  const wanted = new Set(slots ?? []);
  return ALL_SLOT_IDS.filter((id) => wanted.has(id));
}

// "Morning to Afternoon (5:00 AM – 5:00 PM)", "Entire day", "Morning + Night" ...
export function slotText(slots: SlotId[] | undefined, withTimes = true): string {
  const sorted = sortSlots(slots);
  if (!sorted.length) return 'Time not selected';
  const indexes = sorted.map((id) => ALL_SLOT_IDS.indexOf(id));
  const runs: number[][] = [];
  indexes.forEach((index) => {
    const last = runs[runs.length - 1];
    if (last && index === last[last.length - 1] + 1) last.push(index);
    else runs.push([index]);
  });
  return runs
    .map((run) => {
      const first = SLOTS[run[0]];
      const last = SLOTS[run[run.length - 1]];
      const label = run.length === SLOTS.length ? 'Entire day' : run.length === 1 ? first.label : `${first.label} to ${last.label}`;
      return withTimes ? `${label} (${first.start} – ${last.end})` : label;
    })
    .join(' + ');
}

export type ScheduleLine = { date: string; text: string };

export function scheduleLines(dates: string[], slots: EventSlots | undefined): ScheduleLine[] {
  return dates.map((date) => ({ date, text: slotText(slots?.[date]) }));
}

export function hasAnySlots(slots: EventSlots | undefined): boolean {
  return Boolean(slots && Object.values(slots).some((list) => list && list.length));
}

// Older saved bills have no time slots: treat them as holding the whole day, flagged as "time not set".
export type OccupancyEntry = { date: string; slots: SlotId[]; timeKnown: boolean };

export function occupancyEntries(dates: string[], slots: EventSlots | undefined): OccupancyEntry[] {
  return dates.map((date) => {
    const chosen = sortSlots(slots?.[date]);
    return chosen.length ? { date, slots: chosen, timeKnown: true } : { date, slots: [...ALL_SLOT_IDS], timeKnown: false };
  });
}

export type BookingConflict = { reference: string; name: string; date: string; slots: SlotId[] };

// Which already-booked bills overlap with the given dates/slots?
export function findConflicts(
  candidate: { reference: string; dates: string[]; slots: EventSlots | undefined },
  booked: { reference: string; name: string; dates: string[]; slots: EventSlots | undefined }[],
): BookingConflict[] {
  const wanted = occupancyEntries(candidate.dates, candidate.slots);
  const conflicts: BookingConflict[] = [];
  booked.forEach((other) => {
    if (other.reference === candidate.reference) return;
    occupancyEntries(other.dates, other.slots).forEach((entry) => {
      const mine = wanted.find((item) => item.date === entry.date);
      if (!mine) return;
      const overlap = mine.slots.filter((slot) => entry.slots.includes(slot));
      if (overlap.length) conflicts.push({ reference: other.reference, name: other.name, date: entry.date, slots: overlap });
    });
  });
  return conflicts;
}
