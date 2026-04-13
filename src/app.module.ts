import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpLoggerMiddleware } from './common/http-logger.middleware';
import { AdminsModule } from './admins/admins.module';
import { AuthModule } from './auth/auth.module';
import { BorrowersModule } from './borrowers/borrowers.module';
import { ItemsModule } from './items/items.module';
import { LoansModule } from './loans/loans.module';
import { PenaltiesModule } from './penalties/penalties.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminsModule,
    BorrowersModule,
    ItemsModule,
    LoansModule,
    PenaltiesModule,
    SchedulerModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
