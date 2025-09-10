import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import {
  CORE_JWT_ADMIN_SERVICE,
  CORE_JWT_SERVICE,
} from '@modules/authentication/core/constants';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import { AuthService } from '@modules/authentication/core/service/auth.service';
import { jwtAdminModuleConfig } from '@modules/authentication/core/strategy/jwt-admin/config';
import { JwtAdminAuthStrategy } from '@modules/authentication/core/strategy/jwt-admin/strategy';
import { jwtModuleConfig } from '@modules/authentication/core/strategy/jwt/config';
import { JwtAuthStrategy } from '@modules/authentication/core/strategy/jwt/strategy';
import { EvenBetModule } from '@modules/betting-providers/evenbet/evenbet.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtModuleConfig,
    }),
  ],
  providers: [
    {
      provide: CORE_JWT_SERVICE,
      useExisting: JwtService,
    },
  ],
  exports: [CORE_JWT_SERVICE],
})
class ClientJwtModule {}

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtAdminModuleConfig,
    }),
  ],
  providers: [
    {
      provide: CORE_JWT_ADMIN_SERVICE,
      useExisting: JwtService,
    },
  ],
  exports: [CORE_JWT_ADMIN_SERVICE],
})
class AdminJwtModule {}

@Module({
  imports: [
    PrismaModule,
    UserModule,
    ClientJwtModule,
    AdminJwtModule,
    EvenBetModule,
  ],
  providers: [
    AuthTokenService,
    AuthService,
    JwtAuthStrategy,
    JwtAdminAuthStrategy,
  ],
  exports: [AuthTokenService, AuthService, ClientJwtModule, AdminJwtModule],
})
export class CoreAuthModule {}
