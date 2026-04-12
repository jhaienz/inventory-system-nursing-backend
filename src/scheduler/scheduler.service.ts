import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BorrowedItemStatus, PenaltyStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every day at midnight — marks overdue loans, issues penalties, blocks borrowers
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleOverdueLoans() {
    const now = new Date();
    this.logger.log(`[Overdue Check] Running at ${now.toISOString()}`);

    const overdueLoans = await this.prisma.borrowedItem.findMany({
      where: {
        status: BorrowedItemStatus.APPROVED,
        dueDate: { lt: now },
        penalty: { is: null }, // no penalty issued yet
      },
      include: { borrower: true },
    });

    if (overdueLoans.length === 0) {
      this.logger.log('[Overdue Check] No overdue loans found.');
      return;
    }

    this.logger.log(`[Overdue Check] Found ${overdueLoans.length} overdue loan(s).`);

    for (const loan of overdueLoans) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Mark loan as OVERDUE
        await tx.borrowedItem.update({
          where: { id: loan.id },
          data: { status: BorrowedItemStatus.OVERDUE },
        });
        // 2. Issue penalty
        await tx.penalty.create({
          data: {
            borrowerId: loan.borrowerId,
            borrowedItemId: loan.id,
            status: PenaltyStatus.UNPAID,
          },
        });
        // 3. Block borrower
        await tx.borrower.update({
          where: { id: loan.borrowerId },
          data: { isBlocked: true },
        });
      });

      this.logger.log(
        `[Overdue Check] Loan #${loan.id} marked OVERDUE — borrower "${loan.borrower.username}" blocked.`,
      );
    }
  }
}
