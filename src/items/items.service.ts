import { Injectable, NotFoundException } from '@nestjs/common';
import { BorrowedItemStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateItemDto, adminId: number) {
    return this.prisma.item.create({
      data: {
        name: dto.name,
        category: dto.category,
        isReturnable: dto.isReturnable,
        quantity: dto.quantity,
        createdBy: adminId,
      },
    });
  }

  findAll(query: { category?: string; search?: string; isReturnable?: string }) {
    const { category, search, isReturnable } = query;
    return this.prisma.item.findMany({
      where: {
        ...(category && { category }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(isReturnable !== undefined && { isReturnable: isReturnable === 'true' }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    if (!item.isReturnable) {
      return item;
    }

    // For returnable equipment, include availability info
    const activeLoans = await this.prisma.borrowedItem.findMany({
      where: { itemId: id, status: BorrowedItemStatus.APPROVED },
      select: {
        id: true,
        quantity: true,
        dueDate: true,
        borrower: { select: { username: true, fullName: true } },
      },
    });

    const usedQty = activeLoans.reduce((sum, l) => sum + l.quantity, 0);

    return {
      ...item,
      availability: {
        totalUnits: item.quantity,
        availableUnits: item.quantity - usedQty,
        activeLoans,
      },
    };
  }

  async update(id: number, dto: UpdateItemDto) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.item.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.item.delete({ where: { id } });
    return { message: 'Item deleted' };
  }
}
