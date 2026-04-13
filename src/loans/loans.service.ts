import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BorrowedItemStatus, PenaltyStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';

const LOAN_INCLUDE = {
  borrower: { select: { id: true, username: true, fullName: true } },
  item: { select: { id: true, name: true, category: true, isReturnable: true } },
  admin: { select: { id: true, username: true } },
  penalty: { select: { id: true, status: true } },
};

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Borrower submits a borrow request ──────────────────────────────────────
  async create(dto: CreateLoanDto) {
    // 1. Verify borrower identity
    const borrower = await this.prisma.borrower.findUnique({
      where: { username: dto.username },
    });
    if (!borrower) throw new UnauthorizedException('Invalid credentials');

    const pinValid = await bcrypt.compare(dto.pin, borrower.pinHash);
    if (!pinValid) throw new UnauthorizedException('Invalid PIN');

    // 2. Check blocked
    if (borrower.isBlocked) {
      throw new ForbiddenException('Account is blocked. Please settle your pending penalty with an admin.');
    }

    // 3. Check unpaid penalty
    const unpaid = await this.prisma.penalty.findFirst({
      where: { borrowerId: borrower.id, status: PenaltyStatus.UNPAID },
    });
    if (unpaid) {
      throw new ForbiddenException('You have an unpaid penalty. Please contact an admin to clear it.');
    }

    // 4. Find item
    const item = await this.prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');

    // 5. Check availability
    if (item.isReturnable) {
      // Equipment: available = total - sum of quantities in APPROVED loans
      const { _sum } = await this.prisma.borrowedItem.aggregate({
        where: { itemId: item.id, status: BorrowedItemStatus.APPROVED },
        _sum: { quantity: true },
      });
      const used = _sum.quantity ?? 0;
      if (item.quantity - used < dto.quantity) {
        throw new BadRequestException(
          `Only ${item.quantity - used} unit(s) available.`,
        );
      }
      if (!dto.dueDate) {
        throw new BadRequestException('dueDate is required for returnable equipment.');
      }
    } else {
      // Consumable: check stock
      if (item.quantity < dto.quantity) {
        throw new BadRequestException(`Only ${item.quantity} unit(s) in stock.`);
      }
    }

    // 6. Create PENDING loan
    return this.prisma.borrowedItem.create({
      data: {
        borrowerId: borrower.id,
        itemId: item.id,
        quantity: dto.quantity,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: BorrowedItemStatus.PENDING,
      },
      include: LOAN_INCLUDE,
    });
  }

  // ── Admin lists all loans ──────────────────────────────────────────────────
  findAll(status?: BorrowedItemStatus) {
    return this.prisma.borrowedItem.findMany({
      where: status ? { status } : undefined,
      include: LOAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Single loan ────────────────────────────────────────────────────────────
  async findOne(id: number) {
    const loan = await this.prisma.borrowedItem.findUnique({
      where: { id },
      include: LOAN_INCLUDE,
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  // ── Admin approves a PENDING loan ──────────────────────────────────────────
  async approve(id: number, adminId: number) {
    const loan = await this.prisma.borrowedItem.findUnique({
      where: { id },
      include: { item: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== BorrowedItemStatus.PENDING) {
      throw new BadRequestException('Only PENDING loans can be approved.');
    }

    const { item } = loan;

    if (!item.isReturnable) {
      // Consumable → auto-COMPLETED + decrement stock in one transaction
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.borrowedItem.update({
          where: { id },
          data: { status: BorrowedItemStatus.COMPLETED, approvedBy: adminId },
          include: LOAN_INCLUDE,
        });
        await tx.item.update({
          where: { id: item.id },
          data: { quantity: { decrement: loan.quantity } },
        });
        return updated;
      });
    }

    // Equipment → double-check availability, then APPROVED
    const { _sum } = await this.prisma.borrowedItem.aggregate({
      where: { itemId: item.id, status: BorrowedItemStatus.APPROVED },
      _sum: { quantity: true },
    });
    const used = _sum.quantity ?? 0;
    if (item.quantity - used < loan.quantity) {
      throw new BadRequestException('Not enough units available to approve.');
    }

    return this.prisma.borrowedItem.update({
      where: { id },
      data: { status: BorrowedItemStatus.APPROVED, approvedBy: adminId },
      include: LOAN_INCLUDE,
    });
  }

  // ── Admin rejects a PENDING loan ───────────────────────────────────────────
  async reject(id: number, adminId: number) {
    const loan = await this.prisma.borrowedItem.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== BorrowedItemStatus.PENDING) {
      throw new BadRequestException('Only PENDING loans can be rejected.');
    }

    return this.prisma.borrowedItem.update({
      where: { id },
      data: { status: BorrowedItemStatus.REJECTED, approvedBy: adminId },
      include: LOAN_INCLUDE,
    });
  }

  // ── Admin marks equipment as returned ─────────────────────────────────────
  async markReturned(id: number) {
    const loan = await this.prisma.borrowedItem.findUnique({
      where: { id },
      include: { item: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (
      loan.status !== BorrowedItemStatus.APPROVED &&
      loan.status !== BorrowedItemStatus.OVERDUE
    ) {
      throw new BadRequestException('Only APPROVED or OVERDUE loans can be marked returned.');
    }
    if (!loan.item.isReturnable) {
      throw new BadRequestException('Consumable loans cannot be returned.');
    }

    return this.prisma.borrowedItem.update({
      where: { id },
      data: { status: BorrowedItemStatus.RETURNED, returnedAt: new Date() },
      include: LOAN_INCLUDE,
    });
  }

  async findByBorrower(username: string) {
    const borrower = await this.prisma.borrower.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    console.log('Finding borrower with username:', username);
    console.log('Found borrower:', borrower);
    if (!borrower) throw new NotFoundException('Borrower not found');
    return this.prisma.borrowedItem.findMany({
      where: { borrowerId: borrower.id },
      include: LOAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
