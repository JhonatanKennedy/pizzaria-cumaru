import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CloseOrderDto {
  @IsIn(['Cash', 'CreditCard', 'Pix'])
  paymentType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  splitInto?: number;
}
