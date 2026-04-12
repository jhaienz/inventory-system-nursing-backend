import { IsString, Length, MinLength } from 'class-validator';

export class CreateBorrowerDto {
  @IsString()
  username: string;

  @IsString()
  fullName: string;

  @IsString()
  @Length(4, 8)
  pin: string;
}
