import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsBoolean()
  isReturnable: boolean;

  @IsInt()
  @Min(0)
  quantity: number;
}
