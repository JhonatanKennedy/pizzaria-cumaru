import { hasItemsInPreparation } from './has-items-in-preparation';

describe('hasItemsInPreparation', () => {
  it('should report a mixed order with a pending or preparing item', () => {
    expect(
      hasItemsInPreparation([
        { status: 'Ready' },
        { status: 'Pending' },
        { status: null },
      ]),
    ).toBe(true);
    expect(
      hasItemsInPreparation([{ status: 'Ready' }, { status: 'Preparing' }]),
    ).toBe(true);
  });

  it('should report an order whose kitchen items all reached Ready', () => {
    expect(
      hasItemsInPreparation([{ status: 'Ready' }, { status: 'Ready' }]),
    ).toBe(false);
  });

  it('should never block an order with only items that need no preparation', () => {
    expect(hasItemsInPreparation([{ status: null }, { status: null }])).toBe(
      false,
    );
  });

  it('should report an empty order as free to close', () => {
    expect(hasItemsInPreparation([])).toBe(false);
  });
});
