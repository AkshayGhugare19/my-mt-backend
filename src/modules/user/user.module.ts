import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { MailingModule } from '@infrastructure/mail/mailing.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { GamesModule } from '@modules/games/games.module';
import { RoleModule } from '@modules/role/role.module';
import { UserController } from '@modules/user/controller/user.controller';
import { UserPasswordService } from '@modules/user/services/password.service';
import { UserCodeService } from '@modules/user/services/user-code.service';
import { UserService } from '@modules/user/services/user.service';
import { forwardRef, Module } from '@nestjs/common';
import { UserBetsController } from './controller/bets.controller';
import { BetModule } from '@modules/bet/bet.module';
import { UserBlacklistService } from './services/user-blacklist.service';
import { PermissionModule } from '@modules/permission/permission.module';
import { UserEventHandler } from './events/handler';
import { BonusModule } from '@modules/bonus/bonus.module';
import { GamanzaEngageModule } from '@external/gamanza-engage/gamanza-engage.module';
import { MediaModule } from '@modules/media';
import { ProfileController } from '@modules/user/controller/profile.controller';
import { ProfileService } from '@modules/user/services/profile.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => BalanceModule),
    MailingModule,
    RoleModule,
    GamesModule,
    BetModule,
    PermissionModule,
    forwardRef(() => BonusModule),
    forwardRef(() => GamanzaEngageModule),
    MediaModule,
  ],
  controllers: [UserController, UserBetsController, ProfileController],
  providers: [
    UserService,
    UserPasswordService,
    UserCodeService,
    UserBlacklistService,
    UserEventHandler,
    ProfileService,
  ],
  exports: [UserService, UserPasswordService, UserBlacklistService],
})
export class UserModule {}
