import { tableListingSchema } from './tables.api';

const FREE_TABLE = { id: 'table-1', number: 5, openOrder: null };
const OCCUPIED_TABLE = {
  id: 'table-2',
  number: 6,
  openOrder: { orderId: 'order-1', totalPrice: 90 },
};

describe('tableListingSchema', () => {
  it('should accept free and occupied tables', () => {
    expect(
      tableListingSchema.safeParse([FREE_TABLE, OCCUPIED_TABLE]).success,
    ).toBe(true);
  });

  it('should reject an entry without the number', () => {
    const { number: _number, ...withoutNumber } = FREE_TABLE;
    expect(tableListingSchema.safeParse([withoutNumber]).success).toBe(false);
  });

  it('should reject a non-positive table number', () => {
    expect(
      tableListingSchema.safeParse([{ ...FREE_TABLE, number: 0 }]).success,
    ).toBe(false);
  });
});
