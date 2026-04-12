import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PenaltyStatus } from '../generated/prisma/enums.js';
import { PenaltiesService } from './penalties.service';

@UseGuards(JwtAuthGuard)
@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly penaltiesService: PenaltiesService) {}

  // GET /penalties?status=UNPAID
  @Get()
  findAll(@Query('status') status?: PenaltyStatus) {
    return this.penaltiesService.findAll(status);
  }

  // GET /penalties/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.penaltiesService.findOne(id);
  }

  // PATCH /penalties/:id/clear  — clears penalty, unblocks borrower if no more unpaid
  @Patch(':id/clear')
  clear(@Param('id', ParseIntPipe) id: number) {
    return this.penaltiesService.clear(id);
  }
}
