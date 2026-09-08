import { IsIn } from 'class-validator';

export class UpdateItemStatusDto {
  @IsIn(['Preparing', 'Ready'])
  status: string;
}
