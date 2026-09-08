import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddItemToOrderDto {
  @IsString()
  itemId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flavors?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
