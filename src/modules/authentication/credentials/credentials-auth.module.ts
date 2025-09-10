import { CoreAuthModule } from '@modules/authentication/core/core-auth.module';
import { AdminCredentialsAuthController } from '@modules/authentication/credentials/controller/admin-auth.controller';
import { CredentialsAuthController } from '@modules/authentication/credentials/controller/auth.controller';
import { AdminAuthService } from '@modules/authentication/credentials/service/admin-auth.service';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    CoreAuthModule,
    UserModule,
  ],
  controllers: [AdminCredentialsAuthController, CredentialsAuthController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class CredentialsAuthModule {}
