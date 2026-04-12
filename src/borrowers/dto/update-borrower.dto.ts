import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBorrowerDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}
