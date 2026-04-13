import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BorrowedItemStatus } from '../generated/prisma/enums.js';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoansService } from './loans.service';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  // POST /loans  (public — borrower submits request; PIN verified in service)
  @Post()
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  // GET /loans?status=PENDING  (admin)
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('status') status?: BorrowedItemStatus) {
    return this.loansService.findAll(status);
  }

  // GET /loans/borrower/:username  (admin)
  @Get('borrower/:username')
  findByBorrower(@Param('username') username: string) {
    return this.loansService.findByBorrower(username);
  }

  // GET /loans/:id  (admin)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.loansService.findOne(id);
  }

  // PATCH /loans/:id/approve  (admin)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.loansService.approve(id, req.user.id);
  }

  // PATCH /loans/:id/reject  (admin)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.loansService.reject(id, req.user.id);
  }

  // PATCH /loans/:id/return  (admin)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/return')
  markReturned(@Param('id', ParseIntPipe) id: number) {
    return this.loansService.markReturned(id);
  }
}
