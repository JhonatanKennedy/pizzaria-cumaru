import { IsNumber } from 'class-validator';

export class UpdateItemPriceDto {
  @IsNumber()
  price: number;
}
