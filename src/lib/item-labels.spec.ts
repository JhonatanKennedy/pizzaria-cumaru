import { itemStatusLabel } from './item-labels';

describe('itemStatusLabel', () => {
  it('should map every known item status to its Portuguese label', () => {
    expect(itemStatusLabel('Pending')).toBe('Pendente');
    expect(itemStatusLabel('Preparing')).toBe('Preparando');
    expect(itemStatusLabel('Ready')).toBe('Pronto');
  });

  it('should return an empty string for items without a status', () => {
    expect(itemStatusLabel(null)).toBe('');
  });

  it('should fall back to the raw value for unknown statuses', () => {
    expect(itemStatusLabel('Baking')).toBe('Baking');
  });
});
