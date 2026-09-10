import { IsInt, Min } from 'class-validator';

export class UpdateOrderItemQuantityDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
