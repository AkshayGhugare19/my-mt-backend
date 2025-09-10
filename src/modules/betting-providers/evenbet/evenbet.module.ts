import { HttpModule } from '@nestjs/axios';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvenBetController } from './controller/evenbet.controller';
import { EvenBetService } from './service/evenbet.service';
import { registerErrorParser } from '@common/error-filters/error-parsers';
import { EvenBetError, EvenBetErrorParser } from './error';
import { BalanceModule } from '@modules/balance/balance.module';
import { UserModule } from '@modules/user/user.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { DeadlockGuard } from '@infrastructure/database/prisma/utils/deadlock-guard';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { EvenbetEventHandler } from './events/handler';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    BalanceModule,
    TransactionLedgerModule,
    UserModule,
    PrismaModule,
    PermissionModule,
  ],
  controllers: [EvenBetController],
  providers: [EvenBetService, DeadlockGuard, AtomicLock, EvenbetEventHandler],
  exports: [EvenBetService],
})
export class EvenBetModule implements OnModuleInit {
  onModuleInit(): void {
    registerErrorParser(EvenBetError.name, EvenBetErrorParser);
  }
}
