import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PenaltyStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PenaltiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: PenaltyStatus) {
    return this.prisma.penalty.findMany({
      where: status ? { status } : undefined,
      include: {
        borrower: { select: { id: true, username: true, fullName: true } },
        borrowedItem: {
          select: {
            id: true,
            quantity: true,
            dueDate: true,
            returnedAt: true,
            item: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const penalty = await this.prisma.penalty.findUnique({
      where: { id },
      include: {
        borrower: { select: { id: true, username: true, fullName: true } },
        borrowedItem: {
          select: {
            id: true,
            quantity: true,
            dueDate: true,
            returnedAt: true,
            item: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });
    if (!penalty) throw new NotFoundException('Penalty not found');
    return penalty;
  }

  // Admin clears a penalty — unblocks borrower if no remaining unpaid penalties
  async clear(id: number) {
    const penalty = await this.prisma.penalty.findUnique({
      where: { id },
    });
    if (!penalty) throw new NotFoundException('Penalty not found');
    if (penalty.status === PenaltyStatus.CLEARED) {
      throw new BadRequestException('Penalty is already cleared.');
    }

    await this.prisma.penalty.update({
      where: { id },
      data: { status: PenaltyStatus.CLEARED, clearedAt: new Date() },
    });

    // Unblock borrower only when they have no remaining UNPAID penalties
    const remaining = await this.prisma.penalty.count({
      where: { borrowerId: penalty.borrowerId, status: PenaltyStatus.UNPAID },
    });

    if (remaining === 0) {
      await this.prisma.borrower.update({
        where: { id: penalty.borrowerId },
        data: { isBlocked: false },
      });
    }

    return { message: 'Penalty cleared', borrowerUnblocked: remaining === 0 };
  }
}
