import {
  canvasFor,
  canvasRemainder,
  formatComposition,
  pizzaSizeOf,
  sumParts,
} from './flavor-composition';

describe('pizzaSizeOf', () => {
  it('should read the trailing size token of sized names', () => {
    expect(pizzaSizeOf('Calabresa G')).toBe('G');
    expect(pizzaSizeOf('Mussarela M')).toBe('M');
  });

  it('should return null for token-less names', () => {
    expect(pizzaSizeOf('Calabresa')).toBeNull();
    expect(pizzaSizeOf('Água')).toBeNull();
  });
});

describe('canvasFor', () => {
  it('should map each size to its canvas', () => {
    expect(canvasFor('Mussarela G')).toBe(8);
    expect(canvasFor('Mussarela M')).toBe(6);
  });

  it('should return null when the name carries no size token', () => {
    expect(canvasFor('Mussarela')).toBeNull();
  });
});

describe('sumParts', () => {
  it('should total the pieces of every part', () => {
    expect(
      sumParts([
        { name: 'Mussarela G', pieces: 6 },
        { name: 'Chocolate G', pieces: 2 },
      ]),
    ).toBe(8);
  });

  it('should total zero for no parts', () => {
    expect(sumParts([])).toBe(0);
  });
});

describe('canvasRemainder', () => {
  it('should keep the base the canvas minus the given fatias', () => {
    expect(
      canvasRemainder(8, [
        { name: 'Chocolate G', pieces: 2 },
        { name: 'Bacon G', pieces: 2 },
      ]),
    ).toBe(4);
  });

  it('should keep the whole canvas when nothing is given away', () => {
    expect(canvasRemainder(8, [])).toBe(8);
  });
});

describe('formatComposition', () => {
  it('should render clean G shares as reduced fractions', () => {
    expect(
      formatComposition([
        { name: 'Calabresa G', pieces: 4 },
        { name: 'Portuguesa G', pieces: 4 },
      ]),
    ).toBe('Calabresa 1/2 · Portuguesa 1/2');
    expect(
      formatComposition([
        { name: 'Mussarela G', pieces: 6 },
        { name: 'Chocolate G', pieces: 2 },
      ]),
    ).toBe('Mussarela 3/4 · Chocolate 1/4');
  });

  it('should render clean M shares as reduced fractions', () => {
    expect(
      formatComposition([
        { name: 'Mussarela M', pieces: 3 },
        { name: 'Chocolate M', pieces: 3 },
      ]),
    ).toBe('Mussarela 1/2 · Chocolate 1/2');
    expect(
      formatComposition([
        { name: 'Mussarela M', pieces: 4 },
        { name: 'Chocolate M', pieces: 2 },
      ]),
    ).toBe('Mussarela 2/3 · Chocolate 1/3');
  });

  it('should render shares that do not reduce cleanly as fatias', () => {
    expect(
      formatComposition([
        { name: 'Mussarela M', pieces: 5 },
        { name: 'Chocolate M', pieces: 1 },
      ]),
    ).toBe('Mussarela 5 fatias · Chocolate 1 fatia');
  });

  it('should render a whole-canvas part as the bare name', () => {
    expect(formatComposition([{ name: 'Calabresa G', pieces: 8 }])).toBe(
      'Calabresa',
    );
  });

  it('should keep token-less names as they are', () => {
    expect(formatComposition([{ name: 'Calabresa', pieces: 8 }])).toBe(
      'Calabresa',
    );
  });

  it('should render an empty composition as an empty string', () => {
    expect(formatComposition([])).toBe('');
  });
});
