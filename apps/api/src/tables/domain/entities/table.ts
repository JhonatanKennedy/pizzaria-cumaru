export type TCreateTableParams = {
  id: string;
  number: number;
};

const MINIMUM_TABLE_NUMBER = 1;

export class Table {
  private constructor(
    private readonly id: string,
    private number: number,
  ) {}

  static create(params: TCreateTableParams): Table {
    if (params.number < MINIMUM_TABLE_NUMBER) {
      throw new Error('Table number must be greater than zero');
    }
    return new Table(params.id, params.number);
  }

  rename(number: number): void {
    if (number < MINIMUM_TABLE_NUMBER) {
      throw new Error('Table number must be greater than zero');
    }
    this.number = number;
  }

  getId(): string {
    return this.id;
  }

  getNumber(): number {
    return this.number;
  }
}
