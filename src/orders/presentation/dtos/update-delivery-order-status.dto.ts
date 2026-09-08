import { IsIn } from 'class-validator';

export class UpdateDeliveryOrderStatusDto {
  @IsIn(['Preparing', 'Out for delivery', 'Delivered'])
  status: string;
}
