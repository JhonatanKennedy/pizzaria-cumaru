export interface IDayWindow {
  start: Date;
  end: Date;
}

// The calendar day containing `day`, in local time. The end is the next
// local midnight, not `start + 24h`: on a DST transition the arithmetic form
// yields a 23- or 25-hour day and the report silently drifts an hour.
export function dayWindow(day: Date): IDayWindow {
  return {
    start: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
    end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1),
  };
}

// Start inclusive, end exclusive — the day's last millisecond belongs to it.
export function isInWindow(
  instant: Date | undefined,
  window: IDayWindow,
): boolean {
  if (!instant) {
    return false;
  }
  const instantMs = instant.getTime();
  return instantMs >= window.start.getTime() && instantMs < window.end.getTime();
}
