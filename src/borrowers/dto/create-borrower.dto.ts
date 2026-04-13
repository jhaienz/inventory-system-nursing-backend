import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateBorrowerDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  username!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  fullName!: string;

  @IsString()
  @Length(4, 8, { message: 'PIN must be 4–8 characters long' })
  pin!: string;
}
