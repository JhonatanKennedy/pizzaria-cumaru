import { dayWindow, isInWindow } from './day-window.js';

// Local-time constructors throughout: the window is a local calendar day, and
// these specs must pass in any timezone.
const ANY_INSTANT = new Date(2026, 8, 7, 14, 30);
const LAST_MILLISECOND = new Date(2026, 8, 7, 23, 59, 59, 999);
const NEXT_MIDNIGHT = new Date(2026, 8, 8, 0, 0, 0, 0);

describe('dayWindow', () => {
  it('should span local midnight to the next local midnight', () => {
    const window = dayWindow(ANY_INSTANT);

    expect(window.start).toEqual(new Date(2026, 8, 7, 0, 0, 0, 0));
    expect(window.end).toEqual(NEXT_MIDNIGHT);
  });

  it('should roll into the next month on the first day of one', () => {
    const window = dayWindow(new Date(2026, 8, 1, 9));

    expect(window.start).toEqual(new Date(2026, 8, 1));
    expect(window.end).toEqual(new Date(2026, 8, 2));
  });

  it('should roll into the next month on the last day of one', () => {
    const window = dayWindow(new Date(2026, 8, 30, 9));

    expect(window.start).toEqual(new Date(2026, 8, 30));
    expect(window.end).toEqual(new Date(2026, 9, 1));
  });

  it('should roll into the next year on the last day of one', () => {
    const window = dayWindow(new Date(2026, 11, 31, 23, 59));

    expect(window.start).toEqual(new Date(2026, 11, 31));
    expect(window.end).toEqual(new Date(2027, 0, 1));
  });
});

describe('isInWindow', () => {
  const window = dayWindow(ANY_INSTANT);

  it('should include an instant inside the day', () => {
    expect(isInWindow(ANY_INSTANT, window)).toBe(true);
  });

  it('should include both edges of the day', () => {
    expect(isInWindow(new Date(2026, 8, 7, 0, 0, 0, 0), window)).toBe(true);
    expect(isInWindow(LAST_MILLISECOND, window)).toBe(true);
  });

  it('should exclude the next midnight and an instant before the day', () => {
    expect(isInWindow(NEXT_MIDNIGHT, window)).toBe(false);
    expect(isInWindow(new Date(2026, 8, 6, 23, 59, 59, 999), window)).toBe(
      false,
    );
  });

  it('should exclude an instant that carries no date at all', () => {
    expect(isInWindow(undefined, window)).toBe(false);
  });
});
