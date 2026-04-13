import { IsString, Length, MinLength } from 'class-validator';

export class CreateBorrowerDto {
  @IsString()
  username!: string;

  @IsString()
  fullName!: string;

  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 characters long' })
  pin!: string;
}
