import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  username!: string;

  @IsString()
  pin!: string;

  @IsInt()
  itemId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  // Required for returnable equipment (the week_end / return date)
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
