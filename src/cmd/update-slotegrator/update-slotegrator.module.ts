import { Module } from '@nestjs/common';
import { UpdateSlotegratorCommand } from './update-slotegrator.command';
import { SlotegratorService } from '@modules/betting-providers/slotegrator/service/slotegrator.service';
import { BalanceModule } from '@modules/balance/balance.module';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BetModule } from '@modules/bet/bet.module';
import { GamesModule } from '@modules/games/games.module';
import { UpdateSlotegratorCategoryCommand } from './update-slotegrator-category.command';

@Module({
  imports: [
    InfrastructureModule,
    PrismaModule,
    BalanceModule,
    BetModule,
    GamesModule,
  ],
  providers: [
    SlotegratorService,
    UpdateSlotegratorCommand,
    UpdateSlotegratorCategoryCommand,
  ],
  exports: [UpdateSlotegratorCommand, UpdateSlotegratorCategoryCommand],
})
export class UpdateSlotegratorModule {}
