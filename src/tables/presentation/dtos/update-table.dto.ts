import { IsInt, Min } from 'class-validator';

export class UpdateTableDto {
  @IsInt()
  @Min(1)
  number: number;
}
