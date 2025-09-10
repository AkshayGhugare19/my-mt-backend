import { forwardRef, Module } from '@nestjs/common';
import { GamanzaEngageService } from './service/gamanza-engage.service';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { GamanzaEngageWebhookController } from './controller/gamanza-engage-webhook.controller';
import { UserModule } from '@modules/user/user.module';
import { GamanzaEngageEvents } from './gamanza-engage.events';
import { GamanzaEngageSessionController } from './controller/gamanza-engage-session.controller';
import { GamanzaEngageTestController } from './controller/gamanza-engage-test.controller';
import { BalanceModule } from '@modules/balance/balance.module';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { HttpProxyModule } from '@infrastructure/proxy/http-proxy.module';

@Module({
  imports: [
    HttpProxyModule.register(),
    ConfigModule,
    JwtModule,
    PrismaModule,
    BalanceModule,
    forwardRef(() => UserModule),
  ],
  providers: [GamanzaEngageService, GamanzaEngageEvents],
  exports: [GamanzaEngageService],
  controllers: [
    GamanzaEngageWebhookController,
    GamanzaEngageSessionController,
    GamanzaEngageTestController,
  ],
})
export class GamanzaEngageModule {}
