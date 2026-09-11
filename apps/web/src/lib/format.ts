export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// "12 itens", or "3 de 12 itens" once a filter is on. The total is what tells
// the manager the list in front of her is the whole catalog or a slice of it —
// a bare "3 itens" reads as a catalog that lost its items.
export function formatCount(
  shown: number,
  total: number,
  singular: string,
  plural: string,
): string {
  if (shown === total) {
    return `${shown} ${shown === 1 ? singular : plural}`;
  }
  return `${shown} de ${total} ${plural}`;
}

// "12 mesas", "1 mesa" — a count with the noun that agrees with it. Unlike
// formatCount this names no total, so it composes into a longer sentence.
export function formatQuantity(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatTime(timeValue: string): string {
  const time = new Date(timeValue);
  if (Number.isNaN(time.getTime())) {
    return '';
  }
  return time.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;

// How long ago something started — "agora", "há 12 min", "há 1h20". formatTime
// renders a clock reading; this renders a duration, which is what a manager
// scanning the service actually wants (a start time makes her subtract).
//
// The clock is a parameter rather than a call to Date.now(): the caller reads it
// once per render and hands the same instant to every row, and a test asserts a
// fixed duration instead of whatever the machine's clock says.
export function formatElapsed(from: Date, now: Date): string {
  const elapsed = now.getTime() - from.getTime();
  if (Number.isNaN(elapsed)) {
    return '';
  }
  // A negative duration is clock skew between two reads, not a future event.
  if (elapsed < MS_PER_MINUTE) {
    return 'agora';
  }
  const minutes = Math.floor(elapsed / MS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `há ${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  if (rest === 0) {
    return `há ${hours}h`;
  }
  return `há ${hours}h${String(rest).padStart(2, '0')}`;
}
