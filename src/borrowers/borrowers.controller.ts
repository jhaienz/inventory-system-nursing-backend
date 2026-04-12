import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BorrowersService } from './borrowers.service';
import { CreateBorrowerDto } from './dto/create-borrower.dto';
import { UpdateBorrowerDto } from './dto/update-borrower.dto';

@UseGuards(JwtAuthGuard)
@Controller('borrowers')
export class BorrowersController {
  constructor(private readonly borrowersService: BorrowersService) {}

  // POST /borrowers
  @Post()
  create(@Body() dto: CreateBorrowerDto) {
    return this.borrowersService.create(dto);
  }

  // GET /borrowers
  @Get()
  findAll() {
    return this.borrowersService.findAll();
  }

  // GET /borrowers/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.borrowersService.findOne(id);
  }

  // PATCH /borrowers/:id
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBorrowerDto) {
    return this.borrowersService.update(id, dto);
  }

  // DELETE /borrowers/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.borrowersService.remove(id);
  }
}
