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