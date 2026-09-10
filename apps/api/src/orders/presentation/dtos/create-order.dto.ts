import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { EOrderType } from '../../domain/enums/order-type.js';

export class CreateOrderDto {
  @IsInt()
  userId: number;

  @IsIn([EOrderType.LOCAL, EOrderType.DELIVERY])
  type: EOrderType;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
