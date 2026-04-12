import { IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
