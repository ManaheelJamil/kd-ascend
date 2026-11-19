/** Parse "9:00 AM – 5:00 PM" style ranges to minutes-from-midnight; overlap if same calendar day. */

function toMinutes(h: number, m: number, ap: string): number {
  let hour = h % 12;
  if (ap.toUpperCase() === 'PM') hour += 12;
  if (ap.toUpperCase() === 'AM' && h === 12) hour = 0;
  return hour * 60 + m;
}

export function parseEventTimeRange(eventTime: string): { startMin: number; endMin: number } | null {
  const m = eventTime.trim().match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );
  if (!m) return null;
  const startMin = toMinutes(Number(m[1]), Number(m[2]), m[3]);
  const endMin = toMinutes(Number(m[4]), Number(m[5]), m[6]);
  if (endMin <= startMin) return null;
  return { startMin, endMin };
}

/** Local wall-clock start of the shift (event date + range start from eventTime). */
export function eventStartMs(eventDate: string, eventTime: string): number | null {
  const range = parseEventTimeRange(eventTime);
  if (!range || !eventDate.trim()) return null;
  const parts = eventDate.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const h = Math.floor(range.startMin / 60);
  const min = range.startMin % 60;
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

export function assumedHoursFromEventTime(eventTime: string, fallback = 6): number {
  const range = parseEventTimeRange(eventTime);
  if (!range) return fallback;
  const hrs = (range.endMin - range.startMin) / 60;
  return Math.round(hrs * 10) / 10;
}

export function eventSlotOverlaps(
  dateA: string,
  timeA: string,
  dateB: string,
  timeB: string,
): boolean {
  if (!dateA || !dateB || dateA !== dateB) return false;
  const a = parseEventTimeRange(timeA);
  const b = parseEventTimeRange(timeB);
  if (!a || !b) return true;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}