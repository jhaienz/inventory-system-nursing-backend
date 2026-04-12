import {
  Body,
  Controller,
  Delete,
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
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // POST /items  (admin only)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateItemDto, @Request() req: any) {
    return this.itemsService.create(dto, req.user.id);
  }

  // GET /items?category=X&search=Y&isReturnable=true  (public — catalog)
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isReturnable') isReturnable?: string,
  ) {
    return this.itemsService.findAll({ category, search, isReturnable });
  }

  // GET /items/:id  (public — includes availability for equipment)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  // PATCH /items/:id  (admin only)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  // DELETE /items/:id  (admin only)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.remove(id);
  }
}
