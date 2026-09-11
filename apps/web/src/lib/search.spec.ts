import { matchesSearch, normalizeForSearch } from './search';

describe('normalizeForSearch', () => {
  it('should fold the case', () => {
    expect(normalizeForSearch('Calabresa')).toBe('calabresa');
  });

  it('should strip the accents', () => {
    expect(normalizeForSearch('Açaí')).toBe('acai');
  });

  it('should trim the surrounding space', () => {
    expect(normalizeForSearch('  catupiry  ')).toBe('catupiry');
  });
});

describe('matchesSearch', () => {
  it('should match a name from its first letters', () => {
    expect(matchesSearch('Calabresa G', 'cal')).toBe(true);
  });

  it('should match a name from the middle', () => {
    expect(matchesSearch('Calabresa G', 'abre')).toBe(true);
  });

  it('should match an accented name typed without accents', () => {
    expect(matchesSearch('Açaí', 'acai')).toBe(true);
  });

  it('should match an unaccented name typed with accents', () => {
    expect(matchesSearch('Calabresa', 'calabrésa')).toBe(true);
  });

  it('should ignore the case on both sides', () => {
    expect(matchesSearch('Suco Natural', 'SUCO')).toBe(true);
  });

  it('should not match a name that does not contain the query', () => {
    expect(matchesSearch('Suco Natural', 'calabresa')).toBe(false);
  });

  // The empty state of the field has to read as "no filter", not as "no
  // results", or every list would open empty.
  it('should match everything on an empty query', () => {
    expect(matchesSearch('Suco Natural', '')).toBe(true);
  });

  it('should match everything on a query of spaces', () => {
    expect(matchesSearch('Suco Natural', '   ')).toBe(true);
  });
});
