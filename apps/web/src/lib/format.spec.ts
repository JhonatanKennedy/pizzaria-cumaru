import {
  formatBRL,
  formatCount,
  formatElapsed,
  formatQuantity,
} from './format';

// Intl separates the symbol from the amount with a no-break space, not a plain
// one, and it is built by code point here: an invisible character in the source
// is not something a reader can check.
const NBSP = String.fromCharCode(0x00a0);

describe('formatBRL', () => {
  it('should render a value as Brazilian currency', () => {
    expect(formatBRL(45)).toBe(`R$${NBSP}45,00`);
  });

  it('should keep the cents', () => {
    expect(formatBRL(42.5)).toBe(`R$${NBSP}42,50`);
  });
});

describe('formatCount', () => {
  it('should count the whole list with its plural', () => {
    expect(formatCount(12, 12, 'item', 'itens')).toBe('12 itens');
  });

  it('should count a single entry with its singular', () => {
    expect(formatCount(1, 1, 'item', 'itens')).toBe('1 item');
  });

  it('should name the total once a filter narrows the list', () => {
    expect(formatCount(3, 12, 'item', 'itens')).toBe('3 de 12 itens');
  });

  it('should name the total when the filter matches nothing', () => {
    expect(formatCount(0, 12, 'item', 'itens')).toBe('0 de 12 itens');
  });
});

describe('formatQuantity', () => {
  it('should agree the noun with a count above one', () => {
    expect(formatQuantity(5, 'item na cozinha', 'itens na cozinha')).toBe(
      '5 itens na cozinha',
    );
  });

  it('should agree the noun with a single count', () => {
    expect(formatQuantity(1, 'item na cozinha', 'itens na cozinha')).toBe(
      '1 item na cozinha',
    );
  });

  it('should keep the plural for zero', () => {
    expect(formatQuantity(0, 'item', 'itens')).toBe('0 itens');
  });
});

describe('formatElapsed', () => {
  const MS_PER_MINUTE = 60 * 1000;
  const NOW = new Date('2026-09-11T20:30:00.000Z');

  function minutesAgo(minutes: number): Date {
    return new Date(NOW.getTime() - minutes * MS_PER_MINUTE);
  }

  it('should call a duration shorter than a minute "agora"', () => {
    expect(formatElapsed(minutesAgo(0), NOW)).toBe('agora');
  });

  it('should count the minutes within the hour', () => {
    expect(formatElapsed(minutesAgo(12), NOW)).toBe('há 12 min');
  });

  it('should carry the leftover minutes past the hour', () => {
    expect(formatElapsed(minutesAgo(80), NOW)).toBe('há 1h20');
  });

  it('should pad the leftover so the hour reads as a clock', () => {
    expect(formatElapsed(minutesAgo(65), NOW)).toBe('há 1h05');
  });

  it('should drop the minutes on a whole hour', () => {
    expect(formatElapsed(minutesAgo(120), NOW)).toBe('há 2h');
  });

  it('should read a start in the future as now, not as a negative duration', () => {
    expect(formatElapsed(minutesAgo(-5), NOW)).toBe('agora');
  });

  it('should return nothing for a date it cannot read', () => {
    expect(formatElapsed(new Date('ontem'), NOW)).toBe('');
  });
});
